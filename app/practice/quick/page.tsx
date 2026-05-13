'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from "next/link"
import QuestionContentRenderer from '@/components/question-content-renderer'
import { requestQuestionExplanation } from '@/lib/question-explanation'
import { Question } from '@/types/question'
import { getDisplayOptionSlots, remapExplanationOptionLabels } from '@/lib/utils'

type OptionExplanationMap = Record<string, Record<string, string>>

type PracticeResponse = {
  questions: Question[]
}

type QuickPracticeSession = {
  questions: Question[]
  currentPosition: number
  selectedAnswers: { [key: string]: string[] }
  showAnswer: { [key: string]: boolean }
}

const QUICK_PRACTICE_SESSION_KEY = 'dea-quick-practice-session-v1'

export default function QuickPractice() {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentPosition, setCurrentPosition] = useState(1)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState<{ [key: string]: boolean }>({})
  const [generatingExplanationId, setGeneratingExplanationId] = useState<string | null>(null)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const [optionExplanations, setOptionExplanations] = useState<OptionExplanationMap>({})

  const fetchPracticeQuestions = useCallback(async () => {
    const response = await fetch('/api/practice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count: 20
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch practice questions')
    }

    const data: PracticeResponse = await response.json()
    return data.questions
  }, [])

  const clearStoredSession = useCallback(() => {
    try {
      localStorage.removeItem(QUICK_PRACTICE_SESSION_KEY)
    } catch (error) {
      console.error('Failed to clear quick practice session:', error)
    }
  }, [])

  const startNewSession = useCallback(async () => {
    const nextQuestions = await fetchPracticeQuestions()
    setQuestions(nextQuestions)
    setCurrentPosition(1)
    setSelectedAnswers({})
    setShowAnswer({})
    setExplanationError(null)
    setGeneratingExplanationId(null)
    setOptionExplanations({})
  }, [fetchPracticeQuestions])

  useEffect(() => {
    const initializePractice = async () => {
      try {
        const savedSessionRaw = localStorage.getItem(QUICK_PRACTICE_SESSION_KEY)

        if (savedSessionRaw) {
          const savedSession = JSON.parse(savedSessionRaw) as QuickPracticeSession

          if (Array.isArray(savedSession.questions) && savedSession.questions.length > 0) {
            const safeCurrentPosition = Math.min(
              Math.max(savedSession.currentPosition || 1, 1),
              savedSession.questions.length
            )

            window.setTimeout(() => {
              setQuestions(savedSession.questions)
              setCurrentPosition(safeCurrentPosition)
              setSelectedAnswers(savedSession.selectedAnswers || {})
              setShowAnswer(savedSession.showAnswer || {})
            }, 0)
            return
          }
        }

        await startNewSession()
      } catch (error) {
        console.error('Failed to initialize practice:', error)
        alert('加载练习题目失败，请重试')
      } finally {
        setLoading(false)
      }
    }

    void initializePractice()
  }, [startNewSession])

  useEffect(() => {
    if (loading || questions.length === 0) {
      return
    }

    try {
      const payload: QuickPracticeSession = {
        questions,
        currentPosition,
        selectedAnswers,
        showAnswer
      }
      localStorage.setItem(QUICK_PRACTICE_SESSION_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('Failed to persist quick practice session:', error)
    }
  }, [loading, questions, currentPosition, selectedAnswers, showAnswer])

  const currentQuestion = questions[currentPosition - 1]

  const handleAnswerChange = (optionKey: string) => {
    if (!currentQuestion) return

    const currentAnswers = selectedAnswers[currentQuestion.id] || []
    let newAnswers: string[]

    if (currentQuestion.type === 'MULTIPLE') {
      newAnswers = currentAnswers.includes(optionKey)
        ? currentAnswers.filter(key => key !== optionKey)
        : [...currentAnswers, optionKey]
    } else {
      newAnswers = [optionKey]
    }

    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: newAnswers
    }))
  }

  const handleShowAnswer = () => {
    if (!currentQuestion) return

    if (!showAnswer[currentQuestion.id]) {
      setShowAnswer(prev => ({
        ...prev,
        [currentQuestion.id]: true
      }))
    } else {
      setShowAnswer(prev => ({
        ...prev,
        [currentQuestion.id]: false
      }))
    }
  }

  const handleGenerateExplanation = async () => {
    if (!currentQuestion || generatingExplanationId) return

    setGeneratingExplanationId(currentQuestion.id)
    setExplanationError(null)

    try {
      const result = await requestQuestionExplanation(currentQuestion.id)
      const explanationByLabel = result.optionExplanations.reduce<Record<string, string>>((acc, item) => {
        acc[item.label] = item.content
        return acc
      }, {})

      setOptionExplanations(prev => ({
        ...prev,
        [currentQuestion.id]: explanationByLabel,
      }))
    } catch (error) {
      console.error('Failed to generate explanation:', error)
      setExplanationError('生成解析失败，请重试')
    } finally {
      setGeneratingExplanationId(null)
    }
  }

  const goToQuestion = (position: number) => {
    if (position >= 1 && position <= questions.length) {
      setCurrentPosition(position)
    }
  }

  const handleNext = () => {
    if (currentPosition < questions.length) {
      setCurrentPosition(currentPosition + 1)
    }
  }

  const handlePrev = () => {
    if (currentPosition > 1) {
      setCurrentPosition(currentPosition - 1)
    }
  }

  const isAnswered = (questionId: string) => {
    return (selectedAnswers[questionId] || []).length > 0
  }

  const isCorrect = (questionId: string) => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return false
    const answers = selectedAnswers[questionId] || []
    if (answers.length === 0) return false
    const correctAnswers = Array.isArray(question.answer) ? question.answer : []
    return JSON.stringify([...answers].sort()) === JSON.stringify([...correctAnswers].sort())
  }

  const statsAnswered = Object.keys(selectedAnswers).filter(id => 
    (selectedAnswers[id] || []).length > 0
  ).length
  const allAnswered = questions.length > 0 && questions.every(question => isAnswered(question.id))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">正在加载练习题目...</p>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/practice" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← 返回
          </Link>
          <p className="text-gray-600">没有可用的题目</p>
        </div>
      </div>
    )
  }

  const displayOptionSlots = getDisplayOptionSlots(currentQuestion.options || [])
  const explanationText = typeof currentQuestion.explanation === 'string'
    ? remapExplanationOptionLabels(
        currentQuestion.explanation,
        displayOptionSlots.map(option => option.originalKey)
      )
    : ''
  const persistedOptionExplanations = (currentQuestion.optionExplanations || []).reduce<Record<string, string>>((acc, item) => {
    acc[item.label] = item.content
    return acc
  }, {})
  const generatedOptionExplanations = optionExplanations[currentQuestion.id] || {}
  const currentOptionExplanations = {
    ...persistedOptionExplanations,
    ...generatedOptionExplanations,
  }
  const hasCurrentOptionExplanations = Object.keys(currentOptionExplanations).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/practice" className="text-gray-600 hover:text-gray-900 transition-colors">
                ← 返回做题模式
              </Link>
            </div>
            <div className="text-sm text-gray-600">
              快速练习 · 第 {currentPosition} / {questions.length} 题 · 已答 {statsAnswered} 题
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容区 */}
          <div className="lg:col-span-3">
            {/* 题目卡片 */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    题目 {currentPosition}
                  </h2>
                  {currentQuestion.difficulty && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentQuestion.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                      currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {currentQuestion.difficulty === 'EASY' ? '简单' :
                       currentQuestion.difficulty === 'MEDIUM' ? '中等' : '困难'}
                    </span>
                  )}
                </div>

                {/* 题干 */}
                <div className="mb-8 text-gray-900">
                  <QuestionContentRenderer content={currentQuestion.stem} />
                </div>

                {/* 选项 */}
                <div className="space-y-3 mb-8">
                  {displayOptionSlots.map((option) => {
                    const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(option.originalKey)
                    const isAnswerShown = showAnswer[currentQuestion.id]
                    const isCorrectOption = (currentQuestion.answer || []).includes(option.originalKey)
                    
                    return (
                      <label key={option.displayKey} className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200"
                        style={{
                          borderColor: isAnswerShown 
                            ? isCorrectOption
                              ? '#10b981'
                              : isSelected
                                ? '#ef4444'
                                : '#e5e7eb'
                            : isSelected ? '#3b82f6' : '#e5e7eb',
                          backgroundColor: isAnswerShown
                            ? isCorrectOption
                              ? '#f0fdf4'
                              : isSelected
                                ? '#fef2f2'
                                : '#fafafa'
                            : isSelected ? '#f0f9ff' : '#fafafa'
                        }}
                      >
                        <input
                          type={currentQuestion.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                          name={`question-${currentQuestion.id}`}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(option.originalKey)}
                          className="mt-1 mr-4"
                          disabled={isAnswerShown}
                        />
                        <div className="flex-1 flex items-start gap-2">
                          <span className="font-medium text-gray-900 shrink-0">{option.displayKey}.</span>
                          <div className="text-gray-700 min-w-0">
                            <QuestionContentRenderer content={option.text} />
                            {showAnswer[currentQuestion.id] && currentOptionExplanations[option.originalKey] && (
                              <div className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                                {currentOptionExplanations[option.originalKey]}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAnswerShown && (
                          <div className="ml-4 flex-shrink-0">
                            {isCorrectOption && <span className="text-green-600 font-semibold">✓</span>}
                            {!isCorrectOption && isSelected && <span className="text-red-600 font-semibold">✗</span>}
                          </div>
                        )}
                      </label>
                    )
                  })}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleShowAnswer}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        showAnswer[currentQuestion.id]
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {showAnswer[currentQuestion.id] ? '隐藏答案' : '查看答案'}
                    </button>
                    {showAnswer[currentQuestion.id] && !hasCurrentOptionExplanations && (
                      <button
                        onClick={() => {
                          void handleGenerateExplanation()
                        }}
                        disabled={generatingExplanationId === currentQuestion.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingExplanationId === currentQuestion.id ? '正在生成AI解析...' : '生成AI解析'}
                      </button>
                    )}
                  </div>

                  {/* 答案状态 */}
                  {showAnswer[currentQuestion.id] && (
                    <div className="flex items-center space-x-2">
                      {isCorrect(currentQuestion.id) ? (
                        <span className="text-green-600 font-medium">✓ 回答正确</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ 回答错误</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 解析 */}
                {showAnswer[currentQuestion.id] && !hasCurrentOptionExplanations && explanationText && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">题目解析：</h4>
                    <QuestionContentRenderer
                      content={explanationText}
                      className="text-blue-800"
                    />
                  </div>
                )}

                {showAnswer[currentQuestion.id] && explanationError && !hasCurrentOptionExplanations && (
                  <p className="mt-4 text-sm text-red-600">{explanationError}</p>
                )}
              </div>
            </div>

            {/* 导航按钮 */}
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={handlePrev}
                disabled={currentPosition === 1}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← 上一题
              </button>

              <div className="text-sm text-gray-600">
                {currentPosition} / {questions.length}
              </div>

              <button
                onClick={handleNext}
                disabled={currentPosition === questions.length}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一题 →
              </button>
            </div>

            {allAnswered && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      clearStoredSession()
                      await startNewSession()
                    } catch (error) {
                      console.error('Failed to complete practice session:', error)
                      alert('完成练习后重置失败，请重试')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  完成练习并清空
                </button>
              </div>
            )}
          </div>

          {/* 侧边栏 - 题目导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((q, index) => {
                  const position = index + 1
                  const answered = isAnswered(q.id)
                  const correct = isCorrect(q.id)
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(position)}
                      className={`aspect-square flex items-center justify-center rounded-lg font-medium text-sm transition-all ${
                        position === currentPosition
                          ? 'bg-blue-600 text-white border-2 border-blue-800'
                          : answered
                          ? correct
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={`题 ${position}${answered ? correct ? ' ✓' : ' ✗' : ''}`}
                    >
                      {position}
                    </button>
                  )
                })}
              </div>

              {/* 统计信息 */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">总题数：</span>
                  <span className="font-medium text-gray-900">{questions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">已作答：</span>
                  <span className="font-medium text-gray-900">{statsAnswered}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">正确：</span>
                  <span className="font-medium text-green-600">
                    {Object.keys(selectedAnswers).filter(id => isCorrect(id)).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">错误：</span>
                  <span className="font-medium text-red-600">
                    {statsAnswered - Object.keys(selectedAnswers).filter(id => isCorrect(id)).length}
                  </span>
                </div>
              </div>

              {/* 重新开始按钮 */}
              <button
                onClick={async () => {
                  setLoading(true)
                  try {
                    clearStoredSession()
                    await startNewSession()
                  } catch (error) {
                    console.error('Failed to reload practice:', error)
                    alert('重新加载失败，请重试')
                  } finally {
                    setLoading(false)
                  }
                }}
                className="w-full mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                重新开始
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
