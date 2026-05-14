'use client'

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import QuestionContentRenderer from '@/components/question-content-renderer'
import QuestionOption from '@/components/question-option'
import { requestQuestionExplanation } from '@/lib/question-explanation'
import { remapExplanationOptionLabels } from '@/lib/utils'
import { Question } from '@/types/question'
import { usePracticeSession } from '@/hooks/usePracticeSession'
import { usePracticeQuestionOptions } from '@/hooks/usePracticeQuestionOptions'

type OptionExplanationMap = Record<string, Record<string, string>>

type PracticeResponse = {
  questions: Question[]
  pagination: {
    page: number
    count: number
    total: number
    availableTotal?: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

type FetchQuestionsOptions = {
  count?: number
  append?: boolean
  showLoading?: boolean
  excludeIds?: string[]
}

const RANDOM_BATCH_SIZE = 5
const RANDOM_EXCLUDED_IDS_STORAGE_KEY = 'dea-random-practice-excluded-ids'

export default function RandomPractice() {
  const practiceSession = usePracticeSession()
  const { recordAnswer, getStats, clearSession } = practiceSession
  
  const [data, setData] = useState<PracticeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState<{ [key: string]: boolean }>({})
  const [recordedInBatch, setRecordedInBatch] = useState<{ [key: string]: boolean }>({})
  const [excludedQuestionIds, setExcludedQuestionIds] = useState<string[]>([])
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true)
  const [isPrefetching, setIsPrefetching] = useState(false)
  const [generatingExplanationId, setGeneratingExplanationId] = useState<string | null>(null)
  const [explanationError, setExplanationError] = useState<string | null>(null)
  const [optionExplanations, setOptionExplanations] = useState<OptionExplanationMap>({})

  const dataRef = useRef<PracticeResponse | null>(null)
  const excludedQuestionIdsRef = useRef<string[]>([])
  const prefetchPromiseRef = useRef<Promise<PracticeResponse | null> | null>(null)
  const prefetchedForLengthRef = useRef<number>(-1)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    excludedQuestionIdsRef.current = excludedQuestionIds
  }, [excludedQuestionIds])

  useEffect(() => {
    try {
      localStorage.setItem(RANDOM_EXCLUDED_IDS_STORAGE_KEY, JSON.stringify(excludedQuestionIds))
    } catch (error) {
      console.error('Failed to save excluded question ids:', error)
    }
  }, [excludedQuestionIds])

  const readSavedExcludedQuestionIds = useCallback(() => {
    try {
      const saved = localStorage.getItem(RANDOM_EXCLUDED_IDS_STORAGE_KEY)
      if (!saved) {
        return []
      }

      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    } catch (error) {
      console.error('Failed to load excluded question ids:', error)
      return []
    }
  }, [])

  const persistExcludedQuestionId = (questionId: string) => {
    setExcludedQuestionIds(prev => {
      if (prev.includes(questionId)) {
        return prev
      }

      const next = [...prev, questionId]
      return next
    })
  }

  const getRequestExcludeIds = useCallback((overrideIds?: string[]) => {
    if (overrideIds) {
      return Array.from(new Set(overrideIds.filter(Boolean)))
    }

    const currentQueueIds = dataRef.current?.questions.map(question => question.id) || []
    return Array.from(new Set([...excludedQuestionIdsRef.current, ...currentQueueIds]))
  }, [])

  const fetchQuestions = useCallback(async ({
    count = RANDOM_BATCH_SIZE,
    append = false,
    showLoading = true,
    excludeIds
  }: FetchQuestionsOptions = {}) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setExplanationError(null)
      const response = await fetch('/api/practice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count,
          excludeIds: getRequestExcludeIds(excludeIds)
        })
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const result: PracticeResponse = await response.json()

      setData(prev => {
        if (append && prev) {
          const existingIds = new Set(prev.questions.map(question => question.id))
          const nextQuestions = [
            ...prev.questions,
            ...result.questions.filter(question => !existingIds.has(question.id))
          ]

          return {
            ...result,
            questions: nextQuestions
          }
        }

        return result
      })

      setHasMoreQuestions(result.pagination.hasNext)

      if (!append) {
        setCurrentIndex(0)
        setSelectedAnswers({})
        setShowAnswer({})
        setRecordedInBatch({})
        setOptionExplanations({})
        prefetchedForLengthRef.current = -1
      }

      return result
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      setHasMoreQuestions(false)
      return null
    } finally {
      setLoading(false)
      setIsPrefetching(false)
    }
  }, [getRequestExcludeIds])

  // 获取题目数据
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedExcludedQuestionIds = readSavedExcludedQuestionIds()
      setExcludedQuestionIds(savedExcludedQuestionIds)
      void fetchQuestions({
        count: RANDOM_BATCH_SIZE,
        append: false,
        showLoading: false,
        excludeIds: savedExcludedQuestionIds
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchQuestions, readSavedExcludedQuestionIds])

  const handleAnswerChange = (questionId: string, optionKey: string) => {
    const question = data?.questions.find(q => q.id === questionId)
    if (!question) return

    setSelectedAnswers(prev => {
      const currentAnswers = prev[questionId] || []
      
      if (question.type === 'SINGLE' || question.type === 'TRUE_FALSE') {
        // 单选题：直接设置为当前选项
        return { 
          ...prev, 
          [questionId]: [optionKey] 
        }
      } else if (question.type === 'MULTIPLE') {
        // 多选题：切换选项状态
        const isCurrentlySelected = currentAnswers.includes(optionKey)
        const newAnswers = isCurrentlySelected
          ? currentAnswers.filter(key => key !== optionKey)  // 取消选择
          : [...currentAnswers, optionKey]                   // 添加选择
        
        return { 
          ...prev, 
          [questionId]: newAnswers 
        }
      }
      
      // 其他题型暂不处理
      return prev
    })
  }

  const toggleShowAnswer = (questionId: string) => {
    const newShowState = !showAnswer[questionId]
    setShowAnswer(prev => ({ ...prev, [questionId]: newShowState }))
    
    // 每批次题目只记录一次，避免反复查看/隐藏答案导致重复计数
    if (newShowState && !recordedInBatch[questionId]) {
      const question = data?.questions.find(q => q.id === questionId)
      if (question) {
        const selected = selectedAnswers[questionId] || []
        recordAnswer(questionId, selected, question.answer)
        setRecordedInBatch(prev => ({ ...prev, [questionId]: true }))
        persistExcludedQuestionId(questionId)
      }
    }
  }

  const recordCurrentQuestionIfNeeded = (questionId: string) => {
    if (recordedInBatch[questionId]) {
      return
    }

    const question = data?.questions.find(q => q.id === questionId)
    if (!question) {
      return
    }

    const selected = selectedAnswers[questionId] || []
    if (selected.length === 0) {
      return
    }

    recordAnswer(questionId, selected, question.answer)
    setRecordedInBatch(prev => ({ ...prev, [questionId]: true }))
    persistExcludedQuestionId(questionId)
  }

  const prefetchNextQuestions = useCallback(async () => {
    if (prefetchPromiseRef.current) {
      return prefetchPromiseRef.current
    }

    if (!dataRef.current || !dataRef.current.pagination.hasNext) {
      return null
    }

    setIsPrefetching(true)

    const prefetchPromise = fetchQuestions({
      count: RANDOM_BATCH_SIZE,
      append: true,
      showLoading: false
    }).finally(() => {
      prefetchPromiseRef.current = null
      setIsPrefetching(false)
    })

    prefetchPromiseRef.current = prefetchPromise
    return prefetchPromise
  }, [fetchQuestions])

  const isQuestionCorrect = (questionId: string) => {
    const question = data?.questions.find(q => q.id === questionId)
    const selected = selectedAnswers[questionId] || []
    if (!question) return false
    
    return JSON.stringify(selected.sort()) === JSON.stringify(question.answer.sort())
  }

  const handleClearPractice = async () => {
    if (!confirm('确定要清空所有练习记录吗？')) {
      return
    }

    clearSession()
    setExcludedQuestionIds([])

    try {
      localStorage.removeItem(RANDOM_EXCLUDED_IDS_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear excluded question ids:', error)
    }

    dataRef.current = null
    prefetchPromiseRef.current = null
    prefetchedForLengthRef.current = -1

    void fetchQuestions({
      count: RANDOM_BATCH_SIZE,
      append: false,
      showLoading: true,
      excludeIds: []
    })
  }

  const handleLoadNewQuestions = () => {
    void fetchQuestions({
      count: RANDOM_BATCH_SIZE,
      append: false,
      showLoading: true
    })
  }

  const handleNextQuestion = async () => {
    const currentQuestion = dataRef.current?.questions[currentIndex]
    if (!currentQuestion) {
      return
    }

    recordCurrentQuestionIfNeeded(currentQuestion.id)
    persistExcludedQuestionId(currentQuestion.id)

    const latestQuestions = dataRef.current?.questions || []

    if (currentIndex < latestQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      return
    }

    if (!hasMoreQuestions) {
      return
    }

    await prefetchNextQuestions()

    setCurrentIndex(prev => {
      const currentQuestions = dataRef.current?.questions || []
      return prev < currentQuestions.length - 1 ? prev + 1 : prev
    })
  }

  const handleGenerateExplanation = async (questionId: string) => {
    const question = dataRef.current?.questions.find(item => item.id === questionId)
    if (!question || generatingExplanationId) {
      return
    }

    setGeneratingExplanationId(questionId)
    setExplanationError(null)

    try {
      const result = await requestQuestionExplanation(questionId)

      const explanationByLabel = result.optionExplanations.reduce<Record<string, string>>((acc, item) => {
        acc[item.label] = item.content
        return acc
      }, {})

      setOptionExplanations(prev => ({
        ...prev,
        [questionId]: explanationByLabel,
      }))
    } catch (error) {
      console.error('Failed to generate explanation:', error)
      setExplanationError(error instanceof Error ? error.message : '生成解析失败')
    } finally {
      setGeneratingExplanationId(null)
    }
  }

  useEffect(() => {
    if (!data || loading || data.questions.length === 0) {
      return
    }

    if (currentIndex !== data.questions.length - 1) {
      return
    }

    if (!data.pagination.hasNext) {
      return
    }

    if (prefetchedForLengthRef.current === data.questions.length) {
      return
    }

    prefetchedForLengthRef.current = data.questions.length
    void prefetchNextQuestions()
  }, [currentIndex, data, loading, prefetchNextQuestions])

  const stats = getStats()
  const currentQuestion = data?.questions[currentIndex]
  const orderedOptions = usePracticeQuestionOptions(currentQuestion?.id, currentQuestion?.options)
  const explanationContent = currentQuestion?.explanation
    ? remapExplanationOptionLabels(
        currentQuestion.explanation,
        orderedOptions.map(option => option.originalKey)
      )
    : ''
  const persistedOptionExplanations = (currentQuestion?.optionExplanations || []).reduce<Record<string, string>>((acc, item) => {
    acc[item.label] = item.content
    return acc
  }, {})
  const generatedOptionExplanations = currentQuestion
    ? (optionExplanations[currentQuestion.id] || {})
    : {}
  const currentOptionExplanations = currentQuestion
    ? { ...persistedOptionExplanations, ...generatedOptionExplanations }
    : {}
  const hasCurrentOptionExplanations = Object.keys(currentOptionExplanations).length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载题目...</p>
        </div>
      </div>
    )
  }

  if (!data || data.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">暂无可用题目</p>
          <Link href="/practice" className="text-blue-600 hover:text-blue-700">
            返回练习选择
          </Link>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">题目加载出错</p>
          <Link href="/practice" className="text-blue-600 hover:text-blue-700">
            返回练习选择
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/practice" className="text-gray-600 hover:text-gray-900 transition-colors">
              ← 返回练习选择
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">随机练习</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                void handleClearPractice()
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              清空记录
            </button>
            <button
              onClick={handleLoadNewQuestions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              获取新题目
            </button>
          </div>
        </div>

        {/* 进度指示 */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              已做 {stats.totalAnswered} 题 / 总题库 {data.pagination.total} 题
            </span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-green-600">
                正确: {stats.totalCorrect}
              </span>
              <span className="text-sm text-red-600">
                错误: {stats.totalIncorrect}
              </span>
              {stats.totalAnswered > 0 && (
                <span className="text-sm text-blue-600">
                  准确率: {stats.accuracy.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${data.pagination.total > 0 ? (stats.totalAnswered / data.pagination.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* 题目卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border">
          {/* 题目信息 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {currentQuestion.questionNo && (
                <span className="text-sm font-medium text-gray-500">
                  题号: {currentQuestion.questionNo}
                </span>
              )}
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {currentQuestion.type === 'SINGLE' ? '单选题' : 
                 currentQuestion.type === 'MULTIPLE' ? '多选题' :
                 currentQuestion.type === 'TRUE_FALSE' ? '判断题' : '填空题'}
              </span>
              {currentQuestion.difficulty && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  currentQuestion.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                  currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentQuestion.difficulty === 'EASY' ? '简单' :
                   currentQuestion.difficulty === 'MEDIUM' ? '中等' : '困难'}
                </span>
              )}
            </div>
          </div>

          {/* 题目内容 */}
          <div className="mb-6">
            <QuestionContentRenderer
              content={currentQuestion.stem}
              className="text-lg text-gray-900"
            />
          </div>

          {/* 选项 */}
          {orderedOptions.length > 0 && (
            <div className="space-y-3 mb-6">
              {orderedOptions.map((option) => {
                const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(option.originalKey)
                const isCorrectOption = currentQuestion.answer.includes(option.originalKey)
                
                return (
                  <QuestionOption
                    key={option.displayKey}
                    option={option}
                    isSelected={isSelected}
                    isCorrect={isCorrectOption}
                    showAnswer={showAnswer[currentQuestion.id]}
                    optionExplanation={currentOptionExplanations[option.originalKey]}
                    onChange={(optionKey) => handleAnswerChange(currentQuestion.id, optionKey)}
                    disabled={showAnswer[currentQuestion.id]}
                    questionType={currentQuestion.type}
                  />
                )
              })}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleShowAnswer(currentQuestion.id)}
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
                    void handleGenerateExplanation(currentQuestion.id)
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
                {isQuestionCorrect(currentQuestion.id) ? (
                  <span className="text-green-600 font-medium">✓ 回答正确</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ 回答错误</span>
                )}
              </div>
            )}
          </div>

          {/* 兼容旧解析 */}
          {showAnswer[currentQuestion.id] && !hasCurrentOptionExplanations && explanationContent && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">题目解析：</h4>
              <QuestionContentRenderer
                content={explanationContent}
                className="text-blue-800"
              />
            </div>
          )}

          {showAnswer[currentQuestion.id] && explanationError && !hasCurrentOptionExplanations && (
            <p className="mt-4 text-sm text-red-600">{explanationError}</p>
          )}
        </div>

        {/* 题目导航 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一题
          </button>

          <div className="text-sm text-gray-600">
            {currentQuestion.tags && currentQuestion.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <span>标签：</span>
                {currentQuestion.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              void handleNextQuestion()
            }}
            disabled={loading || (currentIndex >= data.questions.length - 1 && !hasMoreQuestions)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isPrefetching && currentIndex === data.questions.length - 1 ? '加载下一批...' : '下一题'}
          </button>
        </div>
      </div>
    </div>
  )
}