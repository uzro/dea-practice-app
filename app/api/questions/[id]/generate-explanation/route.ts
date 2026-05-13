import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { generateQuestionOptionExplanations } from '@/lib/ai-explanation'

function normalizeOptionLabel(value: string): string {
  return value.trim().toUpperCase().replace(/^[\s\[(（【]+|[\s\])）】.:、．。]+$/g, '')
}

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

    const existingOptionExplanations = await db.optionExplanation.findMany({
      where: { questionId: id },
      orderBy: { label: 'asc' },
      select: {
        label: true,
        content: true,
        isCorrect: true,
      },
    })

    if (existingOptionExplanations.length > 0) {
      return NextResponse.json({
        success: true,
        optionExplanations: existingOptionExplanations,
        explanation: '',
        generated: false,
      })
    }

    const options = (question.options as Array<{ key: string; text: string }> | null) || []
    const optionKeySet = new Set(options.map(option => normalizeOptionLabel(option.key)))
    const answerSet = new Set(((question.answer as string[]) || []).map(answer => normalizeOptionLabel(answer)))

    const generatedOptionExplanations = await generateQuestionOptionExplanations({
      stem: question.stem,
      options,
      answer: (question.answer as string[]) || [],
      type: question.type,
    })

    const finalOptionExplanations = generatedOptionExplanations
      .map(item => ({
        label: normalizeOptionLabel(item.label),
        content: item.content.trim(),
        isCorrect: answerSet.has(normalizeOptionLabel(item.label)) || item.isCorrect,
      }))
      .filter(item => optionKeySet.has(item.label) && item.content.length > 0)

    if (finalOptionExplanations.length === 0) {
      return NextResponse.json(
        { success: false, error: '未生成可用的选项解析，请稍后重试' },
        { status: 500 }
      )
    }

    await db.optionExplanation.createMany({
      data: finalOptionExplanations.map(item => ({
        questionId: question.id,
        questionNo: question.questionNo,
        label: item.label,
        content: item.content,
        isCorrect: item.isCorrect,
      })),
      skipDuplicates: true,
    })

    const persistedOptionExplanations = await db.optionExplanation.findMany({
      where: { questionId: id },
      orderBy: { label: 'asc' },
      select: {
        label: true,
        content: true,
        isCorrect: true,
      },
    })

    return NextResponse.json({
      success: true,
      explanation: '',
      optionExplanations: persistedOptionExplanations,
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