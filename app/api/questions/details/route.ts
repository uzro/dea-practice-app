import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { questionIds } = await request.json()
    
    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: '无效的题目ID列表' },
        { status: 400 }
      )
    }

    // 获取题目详情
    const questions = await db.question.findMany({
      where: {
        id: {
          in: questionIds
        }
      },
      select: {
        id: true,
        stem: true,
        options: true,
        answer: true,
        explanation: true,
        type: true,
        questionNo: true,
        difficulty: true,
        tags: true
      }
    })

    if (questions.length === 0) {
      return NextResponse.json(
        { error: '未找到题目' },
        { status: 404 }
      )
    }

    // 确保返回的题目顺序与请求的questionIds顺序一致
    const orderedQuestions = questionIds.map(id => 
      questions.find(q => q.id === id)
    ).filter(Boolean)

    return NextResponse.json(orderedQuestions)
    
  } catch (error) {
    console.error('获取题目详情失败:', error)
    return NextResponse.json(
      { error: '获取题目详情失败' },
      { status: 500 }
    )
  }
}