import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('id')

    // 获取所有已批准的题目，按题号排序
    const allQuestions = await db.question.findMany({
      where: { 
        status: 'APPROVED'
      },
      select: {
        id: true,
        questionNo: true,
        createdAt: true
      }
    })

    // 自定义排序：按题号数值排序，没有题号的排在最后
    allQuestions.sort((a, b) => {
      // 如果都有题号，按数值排序
      if (a.questionNo && b.questionNo) {
        const numA = parseInt(a.questionNo, 10)
        const numB = parseInt(b.questionNo, 10)
        
        // 如果都是有效数字，按数值排序
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }
        // 否则按字典序排序
        return a.questionNo.localeCompare(b.questionNo)
      }
      
      // 有题号的排在前面
      if (a.questionNo && !b.questionNo) return -1
      if (!a.questionNo && b.questionNo) return 1
      
      // 都没有题号，按创建时间排序
      return a.createdAt.getTime() - b.createdAt.getTime()
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