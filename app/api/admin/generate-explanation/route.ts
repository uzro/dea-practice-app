import { NextRequest, NextResponse } from 'next/server'
import type { Question } from '../../../../types/question'
import { generateQuestionExplanation } from '@/lib/ai-explanation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question }: { question?: Question } = body

    if (!question || !question.stem) {
      return NextResponse.json(
        { success: false, error: '题目数据不完整' },
        { status: 400 }
      )
    }
    const explanation = await generateQuestionExplanation(question)

    return NextResponse.json({
      success: true,
      explanation
    })

  } catch (error) {
    console.error('生成解析失败:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成解析时发生错误' },
      { status: 500 }
    )
  }
}