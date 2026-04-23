import OpenAI from 'openai'
import type { Question } from '../types/question'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 将长文本分割为较小的块
function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = line
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// 使用系统命令将PDF转换为图片
async function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    // 创建临时目录
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    console.log('🔄 开始PDF转图片处理...')
    
    // 保存临时PDF文件
    const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`)
    fs.writeFileSync(tempPdfPath, pdfBuffer)
    
    // 输出图片的前缀
    const outputPrefix = path.join(tempDir, `pdf-${Date.now()}`)
    
    // 使用pdftocairo命令转换PDF为JPEG
    const command = `pdftocairo -jpeg -r 150 "${tempPdfPath}" "${outputPrefix}"`
    
    await execAsync(command)
    
    // 查找生成的图片文件
    const files = fs.readdirSync(tempDir)
    const imageFiles = files
      .filter(file => file.includes(path.basename(outputPrefix)) && file.endsWith('.jpg'))
      .sort()
      .map(file => path.join(tempDir, file))
    
    console.log(`✅ PDF转换完成，生成${imageFiles.length}张图片`)
    
    // 清理临时PDF文件
    fs.unlinkSync(tempPdfPath)
    
    return imageFiles
  } catch (error) {
    console.error('❌ PDF转图片失败:', error)
    throw new Error('PDF转换为图片失败')
  }
}

export interface QuestionExtractionResult {
  success: boolean
  questions: Partial<Question>[]
  error?: string
  totalFound: number
}

// 两步处理方案：PDF Vision → JSON解析
export async function extractQuestionsFromPDF(
  pdfBuffer: ArrayBuffer,
  filename: string,
  onProgress?: (progress: number, questionsCount: number) => void
): Promise<Question[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('未配置OpenAI API密钥')
    }

    // 读取环境变量中的模型配置
    const visionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4-vision-preview';
    const textModel = process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini';

    console.log(`🚀 开始处理PDF: ${filename}`);
    console.log(`📖 Vision模型: ${visionModel}`);
    console.log(`🤖 Text模型: ${textModel}`);
    
    onProgress?.(10, 0);

    // 第一步：将PDF转换为图片
    console.log(`📄 第一步：将PDF转换为图片...`)
    const imageFiles = await convertPDFToImages(Buffer.from(pdfBuffer))
    
    if (imageFiles.length === 0) {
      throw new Error('PDF转图片失败，没有生成图片文件')
    }
    
    onProgress?.(30, 0);

    // 第二步：使用Vision API读取每张图片的内容
    console.log(`📖 第二步：使用${visionModel}读取${imageFiles.length}张图片...`)
    
    let allExtractedText = ''
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = imageFiles[i]
      const imageBase64 = fs.readFileSync(imagePath, 'base64')
      
      console.log(`🔍 处理第${i+1}/${imageFiles.length}页...`)
      
      const visionCompletion = await openai.chat.completions.create({
        model: visionModel,
        messages: [
          {
            role: 'system',
            content: `你是专业的图片文字识别专家。请仔细读取图片中的所有考试题目文字，以纯文本格式输出，保持英文原文不变。

要求：
- 提取所有可见的题目、选项和答案
- 保持原始格式和编号
- 不要遗漏任何文字
- 保持英文原文，不要翻译
- 输出纯文本，不要JSON格式`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请提取这页图片中的所有考试题目文字。页码: ${i+1}/${imageFiles.length}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })

      const pageText = visionCompletion.choices[0]?.message?.content?.trim()
      if (pageText) {
        allExtractedText += `\n\n--- Page ${i+1} ---\n${pageText}`
      }
      
      // 删除处理完的图片文件
      fs.unlinkSync(imagePath)
      
      // 更新进度
      const progressStep = Math.floor(30 + (i+1) / imageFiles.length * 30) // 30-60%
      onProgress?.(progressStep, 0)
    }

    if (!allExtractedText || allExtractedText.length < 100) {
      throw new Error('Vision API未提取到有效内容')
    }

    console.log(`✅ Vision提取成功，总文本长度: ${allExtractedText.length} 字符`)
    onProgress?.(60, 0);

    // 第三步：使用文本模型进行JSON格式化解析（分块处理）
    console.log(`🔄 第三步：使用${textModel}进行JSON解析（分块处理）...`);
    
    // 分块处理长文本，避免token限制
    const maxChunkSize = 15000 // 约15k字符一段，安全限制
    const chunks = splitTextIntoChunks(allExtractedText, maxChunkSize)
    
    console.log(`📊 文本将分为 ${chunks.length} 个块进行处理...`)
    
    let allQuestions: any[] = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`🔍 处理第${i + 1}/${chunks.length}块文本（长度: ${chunk.length}字符）...`)
      
      try {
        const parseCompletion = await openai.chat.completions.create({
          model: textModel,
          messages: [
            {
              role: 'system',
              content: `你是专业的题目结构化解析专家。请将提取的题目文本转换为标准JSON格式，保持英文原文不变。

要求：
- 保持所有英文内容原样，不要翻译成中文
- 准确识别题目类型：single(单选), multiple(多选), true_false(判断题)  
- 正确提取选项和答案
- 每个题目都要完整包含题干、选项、答案
- 返回JSON格式数组，只返回JSON，不要其他文字
- 如果没有完整题目，返回空数组[]

格式：
[
  {
    "questionNo": "1",
    "type": "single",
    "stem": "Original English question text...",
    "options": [
      {"key": "A", "text": "Original English option A"},
      {"key": "B", "text": "Original English option B"},
      {"key": "C", "text": "Original English option C"},
      {"key": "D", "text": "Original English option D"}
    ],
    "answer": ["A"],
    "explanation": "Original English explanation if available"
  }
]`
            },
            {
              role: 'user',
              content: `请将以下提取的题目文本转换为JSON格式：

${chunk}`
            }
          ],
          temperature: 0.1,
          max_tokens: 8000
        });
        
        const response = parseCompletion.choices[0]?.message?.content?.trim();
        if (response) {
          // 解析JSON响应
          try {
            const chunkQuestions = JSON.parse(response);
            if (Array.isArray(chunkQuestions)) {
              allQuestions.push(...chunkQuestions);
              console.log(`✅ 第${i + 1}块解析成功: ${chunkQuestions.length}道题目`);
            }
          } catch (parseError) {
            console.warn(`第${i + 1}块JSON解析失败，尝试提取JSON片段:`, parseError);
            // 尝试从响应中提取JSON部分
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const chunkQuestions = JSON.parse(jsonMatch[0]);
              if (Array.isArray(chunkQuestions)) {
                allQuestions.push(...chunkQuestions);
                console.log(`✅ 第${i + 1}块解析成功（补救）: ${chunkQuestions.length}道题目`);
              }
            }
          }
        }
        
        // 更新进度
        const progress = Math.floor(60 + (i + 1) / chunks.length * 20); // 60%-80%
        onProgress?.(progress, allQuestions.length);
        
      } catch (chunkError) {
        console.warn(`第${i + 1}块处理失败:`, chunkError);
        // 继续处理下一块
      }
    }
    
    console.log(`✅ 分块处理完成: 总计${allQuestions.length}道题目`);
    console.log(`📄 PDF转图片: ${imageFiles?.length || 0}张`);
    console.log(`📖 Vision模型: ${visionModel}`);
    console.log(`🤖 Text模型: ${textModel}`);
    
    const questions = allQuestions;
    
    onProgress?.(90, questions.length);
    
    // 处理结果并返回
    const processedQuestions = questions.map((q: any) => ({
      ...q,
      id: `vision-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      exam: inferExamType(filename),
      sourcePdf: filename,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    onProgress?.(100, processedQuestions.length);
    return processedQuestions;
    
  } catch (error) {
    console.error('❌ 三步PDF处理失败:', error);
    
    // 清理可能存在的临时文件
    try {
      const tempDir = path.join(process.cwd(), 'temp')
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir)
        files.forEach(file => {
          if (file.includes('pdf-') && (file.endsWith('.jpeg') || file.endsWith('.pdf'))) {
            fs.unlinkSync(path.join(tempDir, file))
          }
        })
      }
    } catch (cleanupError) {
      console.warn('临时文件清理失败:', cleanupError)
    }
    
    // 如果处理失败，返回空数组
    console.log('🔄 处理失败，请检查PDF文件和模型配置');
    return [];
  }
}

function inferExamType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('dea')) return 'DEA';
  if (lower.includes('databricks')) return 'Databricks';
  if (lower.includes('pharmacy')) return 'Pharmacy';
  if (lower.includes('medical')) return 'Medical';
  return 'Unknown';
}