'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createOptionOrder, orderOptionsByKeys } from '@/lib/utils'
import { PracticeRecord, PracticeSession, PracticeStats } from '@/types/practice-session'
import type { Question } from '@/types/question'
import { clearPracticeQuestionOptionOrderCache } from '@/hooks/practice-option-order-cache'

interface PracticeContextType {
  session: PracticeSession
  recordAnswer: (questionId: string, selectedAnswers: string[], correctAnswers: string[]) => void
  getQuestionStatus: (questionId: string) => PracticeRecord | null
  getQuestionOptionOrder: (questionId: string) => string[] | null
  setQuestionOptionOrder: (questionId: string, optionOrder: string[]) => void
  getOrderedQuestionOptions: <T extends NonNullable<Question['options']>>(questionId: string, options: T) => T
  getStats: () => PracticeStats
  clearSession: () => void
  isAnswered: (questionId: string) => boolean
  isCorrect: (questionId: string) => boolean | null
}

const PracticeContext = createContext<PracticeContextType | null>(null)

const STORAGE_KEY = 'dea-practice-session'

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PracticeSession>(() => {
    if (typeof window === 'undefined') {
      return {}
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) as PracticeSession : {}
    } catch (error) {
      console.error('Failed to load practice session:', error)
      return {}
    }
  })
  const sessionRef = useRef<PracticeSession>({})

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const writeSession = useCallback((nextSession: PracticeSession) => {
    sessionRef.current = nextSession
    setSession(nextSession)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    } catch (error) {
      console.error('Failed to save practice session:', error)
    }
  }, [])

  // 记录答题
  const recordAnswer = useCallback((questionId: string, selectedAnswers: string[], correctAnswers: string[]) => {
    const isCorrect = selectedAnswers.length === correctAnswers.length && 
      selectedAnswers.every(answer => correctAnswers.includes(answer))

    const currentRecord = sessionRef.current[questionId]
    const record: PracticeRecord = {
      questionId,
      answered: true,
      isCorrect,
      selectedAnswers,
      timestamp: Date.now(),
      optionOrder: currentRecord?.optionOrder
    }

    writeSession({
      ...sessionRef.current,
      [questionId]: record
    })
  }, [writeSession])

  // 获取题目状态
  const getQuestionStatus = useCallback((questionId: string): PracticeRecord | null => {
    return sessionRef.current[questionId] || null
  }, [])

  const getQuestionOptionOrder = useCallback((questionId: string): string[] | null => {
    return sessionRef.current[questionId]?.optionOrder || null
  }, [])

  const setQuestionOptionOrder = useCallback((questionId: string, optionOrder: string[]) => {
    const currentRecord = sessionRef.current[questionId]

    if (
      currentRecord?.optionOrder &&
      currentRecord.optionOrder.length === optionOrder.length &&
      currentRecord.optionOrder.every((key, index) => key === optionOrder[index])
    ) {
      return
    }

    const nextRecord: PracticeRecord = {
      questionId,
      answered: currentRecord?.answered ?? false,
      isCorrect: currentRecord?.isCorrect ?? false,
      selectedAnswers: currentRecord?.selectedAnswers ?? [],
      timestamp: currentRecord?.timestamp ?? Date.now(),
      optionOrder
    }

    writeSession({
      ...sessionRef.current,
      [questionId]: nextRecord
    })
  }, [writeSession])

  const getOrderedQuestionOptions = useCallback(<T extends NonNullable<Question['options']>>(questionId: string, options: T): T => {
    const savedOrder = getQuestionOptionOrder(questionId)
    const optionOrder = savedOrder ?? createOptionOrder(options)

    if (!savedOrder) {
      setQuestionOptionOrder(questionId, optionOrder)
    }

    return orderOptionsByKeys(options, optionOrder) as T
  }, [getQuestionOptionOrder, setQuestionOptionOrder])

  // 是否已答题
  const isAnswered = useCallback((questionId: string): boolean => {
    return sessionRef.current[questionId]?.answered || false
  }, [])

  // 是否正确（未答题返回null）
  const isCorrect = useCallback((questionId: string): boolean | null => {
    const record = sessionRef.current[questionId]
    return record?.answered ? record.isCorrect : null
  }, [])

  // 获取统计数据
  const getStats = useCallback((): PracticeStats => {
    const records = Object.values(sessionRef.current).filter(record => record.answered)
    const totalAnswered = records.length
    const totalCorrect = records.filter(record => record.isCorrect).length
    const totalIncorrect = totalAnswered - totalCorrect
    const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered) * 100 : 0

    return {
      totalAnswered,
      totalCorrect,
      totalIncorrect,
      accuracy
    }
  }, [])

  // 清空会话
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    sessionRef.current = {}
    clearPracticeQuestionOptionOrderCache()
    setSession({})
  }, [])

  const contextValue = useMemo(() => ({
    session,
    recordAnswer,
    getQuestionStatus,
    getQuestionOptionOrder,
    setQuestionOptionOrder,
    getOrderedQuestionOptions,
    getStats,
    clearSession,
    isAnswered,
    isCorrect
  }), [
    session,
    recordAnswer,
    getQuestionStatus,
    getQuestionOptionOrder,
    setQuestionOptionOrder,
    getOrderedQuestionOptions,
    getStats,
    clearSession,
    isAnswered,
    isCorrect
  ])

  return (
    <PracticeContext.Provider value={contextValue}>
      {children}
    </PracticeContext.Provider>
  )
}

export function usePracticeSession() {
  const context = useContext(PracticeContext)
  if (!context) {
    throw new Error('usePracticeSession must be used within a PracticeProvider')
  }
  return context
}