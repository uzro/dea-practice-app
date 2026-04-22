'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { PracticeRecord, PracticeSession, PracticeStats } from '@/types/practice-session'

interface PracticeContextType {
  session: PracticeSession
  recordAnswer: (questionId: string, selectedAnswers: string[], correctAnswers: string[]) => void
  getQuestionStatus: (questionId: string) => PracticeRecord | null
  getStats: () => PracticeStats
  clearSession: () => void
  isAnswered: (questionId: string) => boolean
  isCorrect: (questionId: string) => boolean | null
}

const PracticeContext = createContext<PracticeContextType | null>(null)

const STORAGE_KEY = 'dea-practice-session'

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PracticeSession>({})

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setSession(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load practice session:', error)
    }
  }, [])

  // 保存到localStorage
  const saveSession = (newSession: PracticeSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession))
      setSession(newSession)
    } catch (error) {
      console.error('Failed to save practice session:', error)
    }
  }

  // 记录答题
  const recordAnswer = (questionId: string, selectedAnswers: string[], correctAnswers: string[]) => {
    const isCorrect = selectedAnswers.length === correctAnswers.length && 
      selectedAnswers.every(answer => correctAnswers.includes(answer))

    const record: PracticeRecord = {
      questionId,
      answered: true,
      isCorrect,
      selectedAnswers,
      timestamp: Date.now()
    }

    const newSession = {
      ...session,
      [questionId]: record
    }

    saveSession(newSession)
  }

  // 获取题目状态
  const getQuestionStatus = (questionId: string): PracticeRecord | null => {
    return session[questionId] || null
  }

  // 是否已答题
  const isAnswered = (questionId: string): boolean => {
    return session[questionId]?.answered || false
  }

  // 是否正确（未答题返回null）
  const isCorrect = (questionId: string): boolean | null => {
    const record = session[questionId]
    return record?.answered ? record.isCorrect : null
  }

  // 获取统计数据
  const getStats = (): PracticeStats => {
    const records = Object.values(session).filter(record => record.answered)
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
  }

  // 清空会话
  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession({})
  }

  return (
    <PracticeContext.Provider value={{
      session,
      recordAnswer,
      getQuestionStatus,
      getStats,
      clearSession,
      isAnswered,
      isCorrect
    }}>
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