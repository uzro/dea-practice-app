import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

// 辅助函数：从题号字符串中提取数值
function extractNumber(questionNo: string | null): number | null {
  if (!questionNo) return null
  
  // 提取数字部分，支持 "1", "Q1", "题目1", "1.1" 等格式
  const match = questionNo.match(/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null
    const questionId = searchParams.get('id')
    const statsOnly = searchParams.get('stats') === 'true'
    
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    
    // 排序参数
    const sortBy = searchParams.get('sortBy') || 'questionNo'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    
    if (statsOnly) {
      // 从数据库获取统计信息
      const [total, pending, approved, rejected] = await Promise.all([
        prisma.question.count(),
        prisma.question.count({ where: { status: 'PENDING' } }),
        prisma.question.count({ where: { status: 'APPROVED' } }),
        prisma.question.count({ where: { status: 'REJECTED' } })
      ])
      
      return NextResponse.json({
        success: true,
        stats: { total, pending, approved, rejected }
      })
    }
    
    if (questionId) {
      // 从数据库获取单个题目
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })
      
      if (!question) {
        return NextResponse.json(
          { success: false, error: '题目未找到' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        question: {
          ...question,
          options: question.options as any,
          answer: question.answer as string[],
          tags: question.tags as string[]
        }
      })
    } else if (status) {
      // 从数据库按状态筛选，转换为正确的枚举值
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'approved': 'APPROVED', 
        'rejected': 'REJECTED',
        'PENDING': 'PENDING',
        'APPROVED': 'APPROVED',
        'REJECTED': 'REJECTED'
      }
      
      const dbStatus = statusMap[status] || 'PENDING'
      
      // 构建排序选项
      let orderBy: any = { createdAt: 'desc' }
      if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder }
      } else if (sortBy === 'difficulty') {
        orderBy = { difficulty: sortOrder }
      }
      // 注意：questionNo需要特殊处理，因为是字符串但要按数值排序
      
      // 计算分页偏移量
      const skip = (page - 1) * pageSize
      
      // 获取总数量
      const totalCount = await prisma.question.count({ where: { status: dbStatus as any } })
      
      let questions
      if (sortBy === 'questionNo') {
        // 对于题号排序，需要获取所有数据然后在内存中排序
        const allQuestions = await prisma.question.findMany({
          where: { status: dbStatus as any }
        })
        
        // 自定义数值排序函数
        const sortedQuestions = allQuestions.sort((a, b) => {
          const numA = extractNumber(a.questionNo)
          const numB = extractNumber(b.questionNo)
          
          if (numA === null && numB === null) return 0
          if (numA === null) return 1
          if (numB === null) return -1
          
          return sortOrder === 'asc' ? numA - numB : numB - numA
        })
        
        // 应用分页
        questions = sortedQuestions.slice(skip, skip + pageSize)
      } else {
        // 其他排序可以直接用数据库排序
        questions = await prisma.question.findMany({
          where: { status: dbStatus as any },
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
    } else {
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
      const totalCount = await prisma.question.count()
      
      let questions
      if (sortBy === 'questionNo') {
        // 对于题号排序，需要获取所有数据然后在内存中排序
        const allQuestions = await prisma.question.findMany()
        
        // 自定义数值排序函数
        const sortedQuestions = allQuestions.sort((a, b) => {
          const numA = extractNumber(a.questionNo)
          const numB = extractNumber(b.questionNo)
          
          if (numA === null && numB === null) return 0
          if (numA === null) return 1
          if (numB === null) return -1
          
          return sortOrder === 'asc' ? numA - numB : numB - numA
        })
        
        // 应用分页
        questions = sortedQuestions.slice(skip, skip + pageSize)
      } else {
        // 其他排序可以直接用数据库排序
        questions = await prisma.question.findMany({
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
    }
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
    const body = await request.json()
    const { questionId, questionIds, status, action } = body
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态值' },
        { status: 400 }
      )
    }
    
    // 转换为正确的枚举值
    const statusMap: Record<string, string> = {
      'pending': 'PENDING',
      'approved': 'APPROVED', 
      'rejected': 'REJECTED'
    }
    
    const dbStatus = statusMap[status]
    
    if (action === 'batch' && Array.isArray(questionIds)) {
      // 批量更新数据库
      const result = await prisma.question.updateMany({
        where: { id: { in: questionIds } },
        data: { status: dbStatus as any, updatedAt: new Date() }
      })
      
      return NextResponse.json({
        success: true,
        message: `成功更新${result.count}道题目状态`,
        updatedCount: result.count
      })
    } else if (questionId) {
      // 单个更新数据库
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })
      
      if (!question) {
        return NextResponse.json(
          { success: false, error: '题目未找到' },
          { status: 404 }
        )
      }
      
      await prisma.question.update({
        where: { id: questionId },
        data: { status: dbStatus as any, updatedAt: new Date() }
      })
      
      return NextResponse.json({
        success: true,
        message: '题目状态更新成功'
      })
    } else {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('更新题目状态失败:', error)
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    )
  }
}