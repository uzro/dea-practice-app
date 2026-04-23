'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ExamSession, ExamQuestion, ExamResult, ExamHistory, ExamType } from '@/types/exam-session'
import { Question } from '@/types/question'

interface ExamContextType {
  currentExam: ExamSession | null
  examHistory: ExamHistory
  startExam: (type: ExamType, questions: Question[]) => ExamSession
  answerQuestion: (position: number, selectedAnswers: string[]) => void
  submitExam: (correctAnswersData: Array<{ id: string; answer: string[] }>) => ExamResult
  abandonExam: () => void
  getExamHistory: () => ExamResult[]
  clearExamHistory: () => void
  deleteExamRecord: (examId: string) => void
  getQuestionByPosition: (position: number) => (ExamQuestion & Question) | null
}

const ExamContext = createContext<ExamContextType | null>(null)

const EXAM_SESSION_KEY = 'dea-exam-current'
const EXAM_HISTORY_KEY = 'dea-exam-history'

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [currentExam, setCurrentExam] = useState<ExamSession | null>(null)
  const [examHistory, setExamHistory] = useState<ExamHistory>({})
  const [questionsData, setQuestionsData] = useState<Question[]>([])

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const savedExam = localStorage.getItem(EXAM_SESSION_KEY)
      const savedHistory = localStorage.getItem(EXAM_HISTORY_KEY)
      
      if (savedExam) {
        setCurrentExam(JSON.parse(savedExam))
      }
      
      if (savedHistory) {
        setExamHistory(JSON.parse(savedHistory))
      }
    } catch (error) {
      console.error('Failed to load exam data:', error)
    }
  }, [])

  // 保存当前考试到localStorage
  const saveCurrentExam = (exam: ExamSession | null) => {
    try {
      if (exam) {
        localStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(exam))
      } else {
        localStorage.removeItem(EXAM_SESSION_KEY)
      }
      setCurrentExam(exam)
    } catch (error) {
      console.error('Failed to save current exam:', error)
    }
  }

  // 保存考试历史到localStorage
  const saveExamHistory = (history: ExamHistory) => {
    try {
      localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(history))
      setExamHistory(history)
    } catch (error) {
      console.error('Failed to save exam history:', error)
    }
  }

  // 开始考试
  const startExam = (type: ExamType, questions: Question[]): ExamSession => {
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const examQuestions: ExamQuestion[] = questions.map((q, index) => ({
      id: q.id,
      position: index + 1,
      answered: false,
      selectedAnswers: []
    }))

    const newExam: ExamSession = {
      id: examId,
      type,
      status: 'in_progress',
      questions: examQuestions,
      startTime: Date.now(),
      totalQuestions: questions.length,
      questionsAnswered: 0
    }

    setQuestionsData(questions)
    saveCurrentExam(newExam)
    return newExam
  }

  // 回答题目
  const answerQuestion = (position: number, selectedAnswers: string[]) => {
    if (!currentExam) return

    const updatedQuestions = currentExam.questions.map(q => {
      if (q.position === position) {
        return {
          ...q,
          answered: selectedAnswers.length > 0,
          selectedAnswers
        }
      }
      return q
    })

    const questionsAnswered = updatedQuestions.filter(q => q.answered).length

    const updatedExam: ExamSession = {
      ...currentExam,
      questions: updatedQuestions,
      questionsAnswered
    }

    saveCurrentExam(updatedExam)
  }

  // 提交考试
  const submitExam = (correctAnswersData: Array<{ id: string; answer: string[] }>): ExamResult => {
    if (!currentExam) {
      throw new Error('No exam in progress')
    }

    const endTime = Date.now()
    const timeSpent = Math.round((endTime - currentExam.startTime) / 1000 / 60) // 分钟

    // 计算成绩
    const results = currentExam.questions.map(examQ => {
      const correctData = correctAnswersData.find(c => c.id === examQ.id)
      const correctAnswers = correctData?.answer || []
      
      const isCorrect = examQ.selectedAnswers.length === correctAnswers.length && 
        examQ.selectedAnswers.every(answer => correctAnswers.includes(answer))

      return {
        id: examQ.id,
        position: examQ.position,
        selectedAnswers: examQ.selectedAnswers,
        correctAnswers,
        isCorrect
      }
    })

    const correctAnswers = results.filter(r => r.isCorrect).length
    const score = Math.round((correctAnswers / currentExam.totalQuestions) * 100)

    const examResult: ExamResult = {
      examId: currentExam.id,
      type: currentExam.type,
      score,
      totalQuestions: currentExam.totalQuestions,
      correctAnswers,
      timeSpent,
      completedAt: endTime,
      questions: results
    }

    // 保存到历史记录
    const newHistory = {
      ...examHistory,
      [currentExam.id]: examResult
    }
    saveExamHistory(newHistory)

    // 清除当前考试
    setQuestionsData([])
    saveCurrentExam(null)

    return examResult
  }

  // 放弃考试
  const abandonExam = () => {
    setQuestionsData([])
    saveCurrentExam(null)
  }

  // 获取考试历史
  const getExamHistory = (): ExamResult[] => {
    return Object.values(examHistory).sort((a, b) => b.completedAt - a.completedAt)
  }

  // 清空考试历史
  const clearExamHistory = () => {
    localStorage.removeItem(EXAM_HISTORY_KEY)
    setExamHistory({})
  }

  // 删除单个考试记录
  const deleteExamRecord = (examId: string) => {
    const newHistory = { ...examHistory }
    delete newHistory[examId]
    saveExamHistory(newHistory)
  }

  // 根据位置获取题目（包含题目数据）
  const getQuestionByPosition = (position: number): (ExamQuestion & Question) | null => {
    if (!currentExam) return null
    
    const examQuestion = currentExam.questions.find(q => q.position === position)
    const questionData = questionsData.find(q => q.id === examQuestion?.id)
    
    if (!examQuestion || !questionData) return null
    
    return { ...examQuestion, ...questionData }
  }

  return (
    <ExamContext.Provider value={{
      currentExam,
      examHistory,
      startExam,
      answerQuestion,
      submitExam,
      abandonExam,
      getExamHistory,
      clearExamHistory,
      deleteExamRecord,
      getQuestionByPosition
    }}>
      {children}
    </ExamContext.Provider>
  )
}

export function useExamSession() {
  const context = useContext(ExamContext)
  if (!context) {
    throw new Error('useExamSession must be used within an ExamProvider')
  }
  return context
}