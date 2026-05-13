import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { hasAIExplanation, mergeAIExplanationWithExisting } from '@/lib/question-explanation'
import { generateQuestionExplanation } from '@/lib/ai-explanation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const question = await db.question.findUnique({
      where: { id },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目未找到' },
        { status: 404 }
      )
    }

    if (question.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: '仅支持为已审核通过的题目生成解析' },
        { status: 403 }
      )
    }

    if (hasAIExplanation(question.explanation)) {
      return NextResponse.json({
        success: true,
        explanation: question.explanation,
        generated: false,
      })
    }

    const generatedExplanation = await generateQuestionExplanation({
      stem: question.stem,
      options: (question.options as Array<{ key: string; text: string }> | null) || undefined,
      answer: (question.answer as string[]) || [],
      type: question.type,
    })

    const explanation = mergeAIExplanationWithExisting(
      generatedExplanation,
      question.explanation
    )

    await db.question.update({
      where: { id },
      data: {
        explanation,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      explanation,
      generated: true,
    })
  } catch (error) {
    console.error('生成并保存解析失败:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '生成解析时发生错误' },
      { status: 500 }
    )
  }
}