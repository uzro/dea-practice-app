import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { examId, answers } = body
    
    if (!examId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing examId or answers' },
        { status: 400 }
      )
    }
    
    // 验证答案格式
    for (const answer of answers) {
      if (!answer.questionId || !Array.isArray(answer.selectedAnswers)) {
        return NextResponse.json(
          { error: 'Invalid answer format' },
          { status: 400 }
        )
      }
    }
    
    // 获取题目的正确答案
    const questionIds = answers.map(a => a.questionId)
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        status: 'APPROVED'
      },
      select: {
        id: true,
        answer: true,
        explanation: true,
        stem: true,
        options: true,
        type: true
      }
    })
    
    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'Some questions not found' },
        { status: 400 }
      )
    }
    
    // 计算成绩
    let correctCount = 0
    const results = answers.map((answer, index) => {
      const question = questions.find(q => q.id === answer.questionId)
      if (!question) {
        return {
          questionId: answer.questionId,
          position: index + 1,
          selectedAnswers: answer.selectedAnswers,
          correctAnswers: [],
          isCorrect: false,
          question: null
        }
      }
      
      const correctAnswers = Array.isArray(question.answer) ? question.answer as string[] : []
      const isCorrect = answer.selectedAnswers.length === correctAnswers.length && 
        answer.selectedAnswers.every((selected: string) => correctAnswers.includes(selected))
      
      if (isCorrect) {
        correctCount++
      }
      
      return {
        questionId: answer.questionId,
        position: index + 1,
        selectedAnswers: answer.selectedAnswers,
        correctAnswers,
        isCorrect,
        question: {
          stem: question.stem,
          options: question.options,
          type: question.type,
          explanation: question.explanation
        }
      }
    })
    
    const totalQuestions = answers.length
    const score = Math.round((correctCount / totalQuestions) * 100)
    
    return NextResponse.json({
      examId,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: totalQuestions - correctCount,
      results,
      submittedAt: Date.now()
    })
    
  } catch (error) {
    console.error('Exam submit API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    )
  }
}