import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params
    const updatedData = await request.json()

    // 验证必需字段
    if (!updatedData.stem || !updatedData.exam || !updatedData.type) {
      return NextResponse.json(
        { success: false, error: '缺少必需字段' },
        { status: 400 }
      )
    }

    // 检查题目是否存在
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: '题目未找到' },
        { status: 404 }
      )
    }

    // 更新题目
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionNo: updatedData.questionNo,
        type: updatedData.type,
        stem: updatedData.stem,
        options: updatedData.options || [],
        answer: updatedData.answer || [],
        explanation: updatedData.explanation,
        difficulty: updatedData.difficulty,
        tags: updatedData.tags || [],
        exam: updatedData.exam,
        updatedAt: new Date()
      }
    })

    // 格式化返回数据
    const formattedQuestion = {
      ...updatedQuestion,
      options: updatedQuestion.options as any,
      answer: updatedQuestion.answer as string[],
      tags: updatedQuestion.tags as string[]
    }

    return NextResponse.json({
      success: true,
      question: formattedQuestion
    })

  } catch (error) {
    console.error('更新题目失败:', error)
    return NextResponse.json(
      { success: false, error: '更新题目失败' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json(
        { success: false, error: '题目未找到' },
        { status: 404 }
      )
    }

    // 格式化返回数据
    const formattedQuestion = {
      ...question,
      options: question.options as any,
      answer: question.answer as string[],
      tags: question.tags as string[]
    }

    return NextResponse.json({
      success: true,
      question: formattedQuestion
    })

  } catch (error) {
    console.error('获取题目失败:', error)
    return NextResponse.json(
      { success: false, error: '获取题目失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params

    // 检查题目是否存在
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: '题目未找到' },
        { status: 404 }
      )
    }

    // 删除题目
    await prisma.question.delete({
      where: { id: questionId }
    })

    return NextResponse.json({
      success: true,
      message: '题目删除成功'
    })

  } catch (error) {
    console.error('删除题目失败:', error)
    return NextResponse.json(
      { success: false, error: '删除题目失败' },
      { status: 500 }
    )
  }
}