import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/db'

type Difficulty = 'easy' | 'medium' | 'hard' | null

type RandomPracticeBody = {
  count?: number
  excludeIds?: string[]
  tags?: string[]
  difficulty?: Difficulty
}

const QUESTION_SELECT = {
  id: true,
  exam: true,
  questionNo: true,
  type: true,
  stem: true,
  options: true,
  answer: true,
  explanation: true,
  optionExplanations: {
    select: {
      label: true,
      content: true,
      isCorrect: true,
    }
  },
  difficulty: true,
  tags: true
} as const

function buildWhereClause(tags?: string[], difficulty?: Difficulty) {
  const whereClause: any = {
    status: 'APPROVED'
  }

  if (tags && tags.length > 0) {
    whereClause.tags = {
      hasSome: tags
    }
  }

  if (difficulty) {
    whereClause.difficulty = difficulty.toUpperCase()
  }

  return whereClause
}

function normalizeIds(ids?: string[]) {
  return Array.from(
    new Set(
      (ids || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )
  )
}

async function getRandomPracticeResponse({
  count,
  tags,
  difficulty,
  excludeIds = []
}: {
  count: number
  tags?: string[]
  difficulty?: Difficulty
  excludeIds?: string[]
}) {
  const safeCount = Math.min(Math.max(count, 1), 20)
  const whereClause = buildWhereClause(tags, difficulty)
  const normalizedExcludeIds = normalizeIds(excludeIds)
  const totalCount = await prisma.question.count({ where: whereClause })

  const availableWhereClause = normalizedExcludeIds.length > 0
    ? {
        ...whereClause,
        id: { notIn: normalizedExcludeIds }
      }
    : whereClause

  const availableQuestionIds = await prisma.question.findMany({
    where: availableWhereClause,
    select: { id: true }
  })

  const shuffled = availableQuestionIds.sort(() => 0.5 - Math.random())
  const selectedIds = shuffled.slice(0, safeCount).map(question => question.id)

  const questions = selectedIds.length > 0
    ? await prisma.question.findMany({
        where: {
          id: { in: selectedIds }
        },
        select: QUESTION_SELECT
      })
    : []

  return NextResponse.json({
    questions: questions.sort(() => 0.5 - Math.random()),
    pagination: {
      page: 1,
      count: safeCount,
      total: totalCount,
      availableTotal: availableQuestionIds.length,
      totalPages: Math.ceil(availableQuestionIds.length / safeCount),
      hasNext: availableQuestionIds.length > safeCount,
      hasPrev: false
    },
    params: {
      count: safeCount,
      page: 1,
      tags,
      random: true,
      difficulty,
      excludeIds: normalizedExcludeIds
    }
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 查询参数
    const count = parseInt(searchParams.get('count') || '5')  // 默认5个
    const page = parseInt(searchParams.get('page') || '1')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const random = searchParams.get('random') === 'true'
    const difficulty = searchParams.get('difficulty') as Difficulty
    
    // 限制数量范围
    const safeCount = Math.min(Math.max(count, 1), 20)  // 最多20个
    const safePage = Math.max(page, 1)
    const offset = (safePage - 1) * safeCount
    
    // 构建查询条件
    const whereClause = buildWhereClause(tags, difficulty)
    
    // 获取题目
    let questions
    let totalCount = await prisma.question.count({ where: whereClause })
    
    if (random) {
      const allQuestions = await prisma.question.findMany({
        where: whereClause,
        select: { id: true }
      })

      const shuffled = allQuestions.sort(() => 0.5 - Math.random())
      const selectedIds = shuffled.slice(0, safeCount).map(q => q.id)

      questions = selectedIds.length > 0
        ? await prisma.question.findMany({
            where: {
              id: { in: selectedIds }
            },
            select: QUESTION_SELECT
          })
        : []

      questions = questions.sort(() => 0.5 - Math.random())
    } else {
      // 按顺序获取，支持分页
      questions = await prisma.question.findMany({
        where: whereClause,
        select: QUESTION_SELECT,
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
        availableTotal: totalCount,
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RandomPracticeBody

    return await getRandomPracticeResponse({
      count: body.count ?? 5,
      tags: body.tags,
      difficulty: body.difficulty,
      excludeIds: body.excludeIds
    })
  } catch (error) {
    console.error('Practice API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch practice questions' },
      { status: 500 }
    )
  }
}