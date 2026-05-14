import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

type CompletePracticeBody = {
  sessionId?: string
  questionId?: string
  questionIds?: string[]
}

function normalizeIds(ids?: string[]) {
  return Array.from(
    new Set(
      (ids || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )
  )
}

function normalizeSessionId(sessionId?: string | null) {
  if (typeof sessionId !== 'string') {
    return null
  }

  const trimmed = sessionId.trim()
  if (!trimmed || trimmed.length > 128) {
    return null
  }

  return trimmed
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CompletePracticeBody
    const sessionId = normalizeSessionId(body.sessionId)

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const inputIds = normalizeIds([
      ...(body.questionIds || []),
      ...(typeof body.questionId === 'string' ? [body.questionId] : [])
    ])

    if (inputIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one questionId is required' },
        { status: 400 }
      )
    }

    await prisma.randomPracticeSession.upsert({
      where: { id: sessionId },
      update: {
        lastAccessedAt: new Date()
      },
      create: {
        id: sessionId,
        lastAccessedAt: new Date()
      }
    })

    await prisma.randomPracticeSessionQuestion.createMany({
      data: inputIds.map(questionId => ({
        sessionId,
        questionId
      })),
      skipDuplicates: true
    })

    await prisma.randomPracticeSession.update({
      where: { id: sessionId },
      data: {
        lastAccessedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      completedCount: inputIds.length,
      questionIds: inputIds
    })
  } catch (error) {
    console.error('Random practice complete API error:', error)
    return NextResponse.json(
      { error: 'Failed to update completed random practice questions' },
      { status: 500 }
    )
  }
}
