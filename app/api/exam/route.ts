import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 考试类型：quick (20题) 或 full (50题)
    const type = searchParams.get('type') as 'quick' | 'full'
    
    if (!type || (type !== 'quick' && type !== 'full')) {
      return NextResponse.json(
        { error: 'Invalid exam type. Must be "quick" or "full"' },
        { status: 400 }
      )
    }
    
    // 确定题目数量
    const questionCount = type === 'quick' ? 20 : 45
    
    // 构建查询条件 - 只获取已批准的题目
    const whereClause = {
      status: 'APPROVED' as const
    }
    
    // 获取总题目数量
    const totalCount = await prisma.question.count({ where: whereClause })
    
    // 如果没有题目，返回错误
    if (totalCount === 0) {
      return NextResponse.json(
        { error: 'No questions available for exam.' },
        { status: 400 }
      )
    }
    
    // 使用实际可用题目数量，最多不超过预期数量
    const actualQuestionCount = Math.min(questionCount, totalCount)
    
    // 随机获取题目：先获取所有符合条件的ID，然后随机选择
    const allQuestions = await prisma.question.findMany({
      where: whereClause,
      select: { id: true }
    })
    
    // 随机选择题目ID
    const shuffled = allQuestions.sort(() => 0.5 - Math.random())
    const selectedIds = shuffled.slice(0, actualQuestionCount).map(q => q.id)
    
    // 获取题目信息（不包含答案和解析）
    const questions = await prisma.question.findMany({
      where: {
        id: { in: selectedIds }
      },
      select: {
        id: true,
        exam: true,
        questionNo: true,
        type: true,
        stem: true,
        options: true,
        // 注意：考试模式不返回 answer 和 explanation
        difficulty: true,
        tags: true
      }
    })
    
    // 重新随机排序结果
    const shuffledQuestions = questions.sort(() => 0.5 - Math.random())
    
    return NextResponse.json({
      type,
      questions: shuffledQuestions,
      totalQuestions: actualQuestionCount,
      examId: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      availableQuestions: totalCount // 添加实际可用题目数
    })
    
  } catch (error) {
    console.error('Exam API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam questions' },
      { status: 500 }
    )
  }
}