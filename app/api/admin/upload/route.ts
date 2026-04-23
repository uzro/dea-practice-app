import { NextRequest, NextResponse } from 'next/server'
// import { put } from '@vercel/blob'
import { prisma } from '../../../../lib/db'
import { extractQuestionsFromPDF } from '../../../../lib/ai-extractor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到文件' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: '只支持PDF文件' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '文件太大，请上传小于50MB的文件' },
        { status: 400 }
      )
    }

    const filename = file.name

    // TODO: In production, upload to Vercel Blob
    // For development, we'll simulate the upload
    const mockFileUrl = `https://example.com/uploads/${Date.now()}-${filename}`

    // Create initial processing job in database
    const processingJob = await prisma.processingJob.create({
      data: {
        filename,
        fileUrl: mockFileUrl,
        status: 'PROCESSING',
        progress: 10,
        questionsExtracted: 0,
      }
    })

    console.log(`📁 开始处理文件: ${filename} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)

    // 开始后台处理 (不等待完成，立即返回)
    processUploadedPDF(processingJob.id, file, filename).catch(async (error) => {
      console.error(`处理文件 ${filename} 失败:`, error)
      
      // 更新job状态为失败
      try {
        await prisma.processingJob.update({
          where: { id: processingJob.id },
          data: {
            status: 'FAILED',
            error: error.message,
            updatedAt: new Date(),
          }
        })
      } catch (dbError) {
        console.error('更新任务状态失败:', dbError)
      }
    })

    return NextResponse.json({
      success: true,
      job: {
        ...processingJob,
        status: processingJob.status.toLowerCase(),
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: '上传失败，请重试' },
      { status: 500 }
    )
  }
}

// 后台处理PDF的异步函数 - 文本提取方案
async function processUploadedPDF(jobId: string, file: File, filename: string) {
  console.log(`🔄 开始处理PDF: ${filename} (使用PDF文本提取+GPT-4)`)
  
  try {
    const buffer = await file.arrayBuffer()
    
    // 使用AI处理PDF（已包含验证）
    await updateJobProgress(jobId, 30, '正在提取PDF文本并分析题目...')
    
    const validQuestions = await extractQuestionsFromPDF(buffer, filename)
    
    console.log(`✅ 题目提取完成: ${validQuestions.length}道有效题目`)
    
    // 存储题目到数据库
    if (validQuestions.length > 0) {
      await saveQuestionsToDatabase(validQuestions)
    }
    
    // 更新进度：完成
    await updateJobProgress(jobId, 100, `处理完成，提取了${validQuestions.length}道题目`, validQuestions.length)
    
    console.log(`🎉 文件处理完成: ${filename} -> ${validQuestions.length}道题目`)
    
  } catch (error) {
    console.error(`❌ 处理失败: ${filename}`, error)
    throw error
  }
}

// 更新job进度的辅助函数 - 使用数据库
async function updateJobProgress(jobId: string, progress: number, status?: string, questionsExtracted?: number) {
  try {
    const updateData: any = {
      progress,
      updatedAt: new Date(),
    }
    
    if (progress >= 100) {
      updateData.status = 'COMPLETED'
    }
    
    if (questionsExtracted !== undefined) {
      updateData.questionsExtracted = questionsExtracted
    }
    
    await prisma.processingJob.update({
      where: { id: jobId },
      data: updateData
    })
    
    if (status) {
      console.log(`📊 Job ${jobId}: ${progress}% - ${status}`)
    }
  } catch (error) {
    console.error('更新任务进度失败:', error)
  }
}

// 将题目保存到数据库
async function saveQuestionsToDatabase(questions: any[]) {
  try {
    const questionsData = questions.map(q => ({
      exam: q.exam || 'DEA',
      sourcePdf: q.sourcePdf,
      sourcePageStart: q.sourcePageStart,
      sourcePageEnd: q.sourcePageEnd,
      questionNo: q.questionNo,
      type: q.type?.toUpperCase() || 'SINGLE',
      stem: q.stem,
      options: q.options || [],
      answer: q.answer || [],
      explanation: q.explanation,
      difficulty: q.difficulty?.toUpperCase() || 'MEDIUM',
      tags: q.tags || [],
      status: 'PENDING' as const
    }))

    await prisma.question.createMany({
      data: questionsData
    })

    console.log(`💾 已保存 ${questions.length} 道题目到数据库`)
  } catch (error) {
    console.error('保存题目到数据库失败:', error)
    throw error
  }
}