import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('id')

    // 获取所有已批准的题目，按创建时间排序
    const allQuestions = await db.question.findMany({
      where: { 
        status: 'APPROVED'
      },
      orderBy: [
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        questionNo: true
      }
    })

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: '暂无可用题目' }, { status: 404 })
    }

    // 如果没有指定ID，返回第一题
    let targetQuestionId = questionId
    if (!targetQuestionId) {
      targetQuestionId = allQuestions[0].id
    }

    // 找到当前题目在列表中的位置
    const currentIndex = allQuestions.findIndex(q => q.id === targetQuestionId)
    if (currentIndex === -1) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 })
    }

    // 获取完整题目信息
    const question = await db.question.findUnique({
      where: { 
        id: targetQuestionId
      }
    })

    if (!question) {
      return NextResponse.json({ error: '题目不存在' }, { status: 404 })
    }

    // 获取上一题和下一题的ID
    const prevQuestion = currentIndex > 0 ? allQuestions[currentIndex - 1] : null
    const nextQuestion = currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null

    return NextResponse.json({
      question,
      allQuestions: allQuestions.map((q, index) => ({ 
        ...q, 
        position: index + 1 
      })),
      currentPosition: currentIndex + 1,
      totalQuestions: allQuestions.length,
      prevQuestionId: prevQuestion?.id || null,
      nextQuestionId: nextQuestion?.id || null
    })

  } catch (error) {
    console.error('Failed to fetch question:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}