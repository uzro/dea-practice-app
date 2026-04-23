import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Question } from '../../../../types/question'

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API密钥未配置' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { question } = body

    if (!question || !question.stem) {
      return NextResponse.json(
        { success: false, error: '题目数据不完整' },
        { status: 400 }
      )
    }

    // 构建更详细的题目信息用于AI分析
    let questionContent = `题目: ${question.stem}\n\n`
    
    if (question.options && question.options.length > 0) {
      questionContent += '选项:\n'
      question.options.forEach((option: any) => {
        const isCorrect = question.answer.includes(option.key)
        questionContent += `${option.key}. ${option.text} ${isCorrect ? '[正确答案]' : '[错误选项]'}\n`
      })
    }

    if (question.type) {
      const typeMap = {
        'SINGLE': '单选题',
        'MULTIPLE': '多选题', 
        'TRUE_FALSE': '判断题',
        'TEXT': '主观题'
      }
      questionContent += `\n题目类型: ${typeMap[question.type as keyof typeof typeMap] || question.type}\n`
    }

    // 调用OpenAI API生成解析
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是专业的DEA（Databricks认证数据工程师）考试专家。请为给定的考试题目生成精炼的解析。

解析格式要求：
1. 使用纯文本格式，避免使用markdown语法（如**粗体**、•符号等）
2. 首行说明正确答案及原因（格式：✓ 正确答案：X - 原因描述）
3. 然后逐一分析错误选项：
   - 格式：✗ 选项X：错误原因，适用场景说明
   - 为什么在当前题目语境下不正确
   - 如果该选项/概念在其他场景下有效，简述适用场景
4. 严格控制总字数在180字内
5. 使用简洁专业的中文表述
6. 专注于Databricks、Spark、数据工程技术要点

输出示例：
✓ 正确答案：A - 在Spark SQL中使用broadcast hint可以优化小表连接性能

✗ 选项B：Cache()不适用于此场景的性能优化，但在重复使用同一DataFrame时有效
✗ 选项C：Repartition会增加shuffle开销，适用于数据倾斜场景
✗ 选项D：此选项描述错误，persist()需要指定存储级别

注意：使用简单符号✓✗，避免复杂格式化。如果是多选题或主观题，相应调整格式。`
        },
        {
          role: 'user',
          content: `请为以下题目生成精炼解析：

${questionContent}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const explanation = completion.choices[0]?.message?.content?.trim()

    if (!explanation) {
      return NextResponse.json(
        { success: false, error: 'AI生成解析失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      explanation
    })

  } catch (error) {
    console.error('生成解析失败:', error)
    return NextResponse.json(
      { success: false, error: '生成解析时发生错误' },
      { status: 500 }
    )
  }
}