'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import QuestionContentRenderer from '@/components/question-content-renderer'
import { Question } from '@/types/question'
import { usePracticeSession } from '@/hooks/usePracticeSession'

type PracticeResponse = {
  questions: Question[]
  pagination: {
    page: number
    count: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function RandomPractice() {
  const practiceSession = usePracticeSession()
  const { recordAnswer, getStats, clearSession } = practiceSession
  
  const [data, setData] = useState<PracticeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState<{ [key: string]: boolean }>({})
  const [recordedInBatch, setRecordedInBatch] = useState<{ [key: string]: boolean }>({})

  async function fetchQuestions(count = 5, showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const response = await fetch(`/api/practice?random=true&count=${count}`)
      const result = await response.json()
      setData(result)
      setCurrentIndex(0)
      setSelectedAnswers({})
      setShowAnswer({})
      setRecordedInBatch({})
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取题目数据
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchQuestions(5, false)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

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
  }

  const isQuestionCorrect = (questionId: string) => {
    const question = data?.questions.find(q => q.id === questionId)
    const selected = selectedAnswers[questionId] || []
    if (!question) return false
    
    return JSON.stringify(selected.sort()) === JSON.stringify(question.answer.sort())
  }

  const stats = getStats()

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

  const currentQuestion = data.questions[currentIndex]

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
                if (confirm('确定要清空所有练习记录吗？')) {
                  clearSession()
                }
              }}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              清空记录
            </button>
            <button
              onClick={() => fetchQuestions(5)}
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
          {currentQuestion.options && currentQuestion.options.length > 0 && (
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option) => {
                const isSelected = (selectedAnswers[currentQuestion.id] || []).includes(option.key)
                const isCorrectOption = currentQuestion.answer.includes(option.key)
                const shouldShowCorrect = showAnswer[currentQuestion.id]
                
                return (
                  <label
                    key={option.key}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
                      shouldShowCorrect
                        ? isCorrectOption
                          ? 'border-green-500 bg-green-50'
                          : isSelected
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-gray-50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${showAnswer[currentQuestion.id] ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <input
                      type={currentQuestion.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                      name={`question-${currentQuestion.id}`}
                      value={option.key}
                      checked={isSelected}
                      onChange={() => {
                        if (!showAnswer[currentQuestion.id]) {
                          handleAnswerChange(currentQuestion.id, option.key)
                        }
                      }}
                      className="mt-1"
                      disabled={showAnswer[currentQuestion.id]}
                    />
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-700 mr-2">{option.key}.</span>
                        <QuestionContentRenderer
                          content={option.text}
                          className="flex-1 text-gray-900 text-base"
                        />
                      </div>
                      {shouldShowCorrect && isCorrectOption && (
                        <span className="text-green-600 text-sm font-medium">✓ 正确答案</span>
                      )}
                      {shouldShowCorrect && !isCorrectOption && isSelected && (
                        <span className="text-red-600 text-sm font-medium">✗ 错误选择</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
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

          {/* 解析 */}
          {showAnswer[currentQuestion.id] && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">题目解析：</h4>
              <QuestionContentRenderer
                content={currentQuestion.explanation}
                className="text-blue-800"
              />
            </div>
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
              recordCurrentQuestionIfNeeded(currentQuestion.id)

              if (currentIndex === data.questions.length - 1) {
                fetchQuestions(5)
                return
              }

              setCurrentIndex(currentIndex + 1)
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            下一题
          </button>
        </div>
      </div>
    </div>
  )
}