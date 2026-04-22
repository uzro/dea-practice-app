import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// 提取数字的辅助函数
function extractNumber(str: string): number | null {
  if (!str) return null
  const match = str.match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    const statsOnly = url.searchParams.get('statsOnly') === 'true'
    const questionId = url.searchParams.get('id')
    const searchTerm = url.searchParams.get('search') || ''

    // 处理统计数据请求
    if (statsOnly) {
      const stats = await prisma.question.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      })

      const statusStats = {
        pending: 0,
        approved: 0,
        rejected: 0
      }

      stats.forEach(stat => {
        const status = stat.status.toLowerCase() as keyof typeof statusStats
        if (status in statusStats) {
          statusStats[status] = stat._count.status
        }
      })

      return NextResponse.json({
        success: true,
        stats: {
          ...statusStats,
          total: statusStats.pending + statusStats.approved + statusStats.rejected
        }
      })
    }

    // 处理单个题目请求
    if (questionId) {
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })

      if (!question) {
        return NextResponse.json(
          { success: false, error: '题目不存在' },
          { status: 404 }
        )
      }

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
    }

    // 处理题目列表查询
    // 构建搜索条件
    let whereCondition: any = {}
    
    // 状态过滤
    if (status) {
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'approved': 'APPROVED', 
        'rejected': 'REJECTED',
        'PENDING': 'PENDING',
        'APPROVED': 'APPROVED',
        'REJECTED': 'REJECTED'
      }
      
      const dbStatus = statusMap[status] || 'PENDING'
      whereCondition.status = dbStatus
    }
    
    // 搜索条件
    if (searchTerm.trim()) {
      whereCondition.OR = [
        {
          stem: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          questionNo: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          explanation: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      ]
    }

    // 构建排序选项
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    } else if (sortBy === 'difficulty') {
      orderBy = { difficulty: sortOrder }
    }

    // 计算分页偏移量
    const skip = (page - 1) * pageSize

    // 获取总数量
    const totalCount = await prisma.question.count({ where: whereCondition })

    // 获取题目
    let questions
    if (sortBy === 'questionNo') {
      // questionNo 需要特殊处理（按数字排序）
      const allQuestions = await prisma.question.findMany({
        where: whereCondition
      })

      // 按questionNo数字排序
      const sortedQuestions = allQuestions.sort((a, b) => {
        const numA = extractNumber(a.questionNo || '')
        const numB = extractNumber(b.questionNo || '')
        
        // 将没有数字的排在后面
        if (numA === null) return 1
        if (numB === null) return -1
        
        return sortOrder === 'asc' ? numA - numB : numB - numA
      })
      
      // 应用分页
      questions = sortedQuestions.slice(skip, skip + pageSize)
    } else {
      // 其他排序可以直接用数据库排序
      questions = await prisma.question.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: pageSize
      })
    }

    const formattedQuestions = questions.map(question => ({
      ...question,
      options: question.options as any,
      answer: question.answer as string[],
      tags: question.tags as string[]
    }))
    
    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: page < Math.ceil(totalCount / pageSize),
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('获取题目失败:', error)
    return NextResponse.json(
      { success: false, error: '获取题目失败' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const data = await request.json()

    // 批量操作 (通过action参数)
    if (action === 'approve' || action === 'reject') {
      const { questionIds } = data
      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

      await prisma.question.updateMany({
        where: {
          id: {
            in: questionIds
          }
        },
        data: {
          status: newStatus
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `已${action === 'approve' ? '批准' : '拒绝'}${questionIds.length}道题目` 
      })
    }

    // 单个题目操作 (通过data中的questionId和status)
    if (data.questionId && data.status) {
      const { questionId, status } = data
      const newStatus = status === 'approved' ? 'APPROVED' : 'REJECTED'

      await prisma.question.update({
        where: { id: questionId },
        data: { status: newStatus }
      })

      return NextResponse.json({ 
        success: true, 
        message: `题目已${status === 'approved' ? '通过' : '拒绝'}` 
      })
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    )

  } catch (error) {
    console.error('更新题目失败:', error)
    return NextResponse.json(
      { success: false, error: '更新题目失败' },
      { status: 500 }
    )
  }
}