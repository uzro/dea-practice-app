import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 查询参数
    const count = parseInt(searchParams.get('count') || '5')  // 默认5个
    const page = parseInt(searchParams.get('page') || '1')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const random = searchParams.get('random') === 'true'
    const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | null
    
    // 限制数量范围
    const safeCount = Math.min(Math.max(count, 1), 20)  // 最多20个
    const safePage = Math.max(page, 1)
    const offset = (safePage - 1) * safeCount
    
    // 构建查询条件
    const whereClause: any = {
      status: 'APPROVED'  // 只获取已批准的题目
    }
    
    // 按标签筛选
    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasSome: tags
      }
    }
    
    // 按难度筛选
    if (difficulty) {
      whereClause.difficulty = difficulty.toUpperCase()
    }
    
    // 获取题目
    let questions
    let totalCount = await prisma.question.count({ where: whereClause })
    
    if (random) {
      // 随机获取：先获取所有符合条件的ID，然后随机选择
      const allQuestions = await prisma.question.findMany({
        where: whereClause,
        select: { id: true }
      })
      
      // 随机选择题目ID
      const shuffled = allQuestions.sort(() => 0.5 - Math.random())
      const selectedIds = shuffled.slice(0, safeCount).map(q => q.id)
      
      // 获取完整题目信息（包括答案和解析）
      questions = await prisma.question.findMany({
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
          answer: true,      // 包含答案
          explanation: true, // 包含解析
          difficulty: true,
          tags: true
        }
      })
      
      // 重新随机排序结果
      questions = questions.sort(() => 0.5 - Math.random())
    } else {
      // 按顺序获取，支持分页
      questions = await prisma.question.findMany({
        where: whereClause,
        select: {
          id: true,
          exam: true,
          questionNo: true,
          type: true,
          stem: true,
          options: true,
          answer: true,      // 包含答案
          explanation: true, // 包含解析
          difficulty: true,
          tags: true
        },
        orderBy: { questionNo: 'asc' },
        skip: offset,
        take: safeCount
      })
    }
    
    return NextResponse.json({
      questions,
      pagination: {
        page: safePage,
        count: safeCount,
        total: totalCount,
        totalPages: Math.ceil(totalCount / safeCount),
        hasNext: safePage * safeCount < totalCount,
        hasPrev: safePage > 1
      },
      params: { 
        count: safeCount, 
        page: safePage,
        tags, 
        random, 
        difficulty 
      }
    })
    
  } catch (error) {
    console.error('Practice API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch practice questions' },
      { status: 500 }
    )
  }
}