'use client'

import Link from "next/link"
import { useState, useEffect } from "react"
import { Question } from '@/types/question'

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

export default function QuickStart() {
  const [questionsQueue, setQuestionsQueue] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string[] }>({})
  const [showAnswer, setShowAnswer] = useState<{ [key: string]: boolean }>({})
  const [hasMoreQuestions, setHasMoreQuestions] = useState(true)

  // 获取题目数据
  useEffect(() => {
    fetchQuestions(1)
  }, [])

  const fetchQuestions = async (page: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/practice?page=${page}&count=5&random=false`)
      const result: PracticeResponse = await response.json()
      
      if (page === 1) {
        // 第一次加载，设置题目队列
        setQuestionsQueue(result.questions)
        setTotalQuestions(result.pagination.total)
        setHasMoreQuestions(result.pagination.hasNext)
      } else {
        // 追加新题目到队列
        setQuestionsQueue(prev => [...prev, ...result.questions])
        setHasMoreQuestions(result.pagination.hasNext)
      }
      
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, optionKey: string) => {
    const question = questionsQueue[currentQuestionIndex]
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
      
      return prev
    })
  }

  const toggleShowAnswer = (questionId: string) => {
    setShowAnswer(prev => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const isCorrect = (questionId: string) => {
    const question = questionsQueue[currentQuestionIndex]
    const selected = selectedAnswers[questionId] || []
    if (!question) return false
    
    return JSON.stringify(selected.sort()) === JSON.stringify(question.answer.sort())
  }

  const goToNext = async () => {
    // 增加已答题数
    if (!showAnswer[questionsQueue[currentQuestionIndex].id]) {
      setTotalQuestionsAnswered(prev => prev + 1)
    }

    // 检查是否需要加载下一批题目
    if (currentQuestionIndex >= questionsQueue.length - 2 && hasMoreQuestions) {
      await fetchQuestions(currentPage + 1)
    }

    // 移动到下一题
    if (currentQuestionIndex < questionsQueue.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else if (hasMoreQuestions) {
      // 如果还有更多题目，等待加载
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  if (loading && questionsQueue.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载题目...</p>
        </div>
      </div>
    )
  }

  if (questionsQueue.length === 0) {
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

  const currentQuestion = questionsQueue[currentQuestionIndex]
  if (!currentQuestion) return null

  const progressPercent = totalQuestions > 0 ? (totalQuestionsAnswered / totalQuestions) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/practice" className="text-gray-600 hover:text-gray-900 transition-colors">
              ← 返回练习选择
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">快速开始</h1>
          </div>
        </div>

        {/* 进度指示 */}
        <div className="bg-white rounded-lg p-4 mb-6 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              已练习 {totalQuestionsAnswered} 题 / 总题库 {totalQuestions} 题
            </span>
            <span className="text-sm text-gray-600">
              题号: {currentQuestion.questionNo || currentQuestionIndex + 1}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
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
            <p className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">
              {currentQuestion.stem}
            </p>
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
                      onChange={(e) => {
                        if (!showAnswer[currentQuestion.id]) {
                          handleAnswerChange(currentQuestion.id, option.key)
                        }
                      }}
                      className="mt-1"
                      disabled={showAnswer[currentQuestion.id]}
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">{option.key}.</span>
                        <span className="text-gray-900 whitespace-pre-wrap">{option.text}</span>
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
                {isCorrect(currentQuestion.id) ? (
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
              <p className="text-blue-800 whitespace-pre-wrap">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>

        {/* 题目导航 */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrev}
            disabled={currentQuestionIndex === 0}
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
            onClick={goToNext}
            disabled={currentQuestionIndex >= questionsQueue.length - 1 && !hasMoreQuestions}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '加载中...' : '下一题'}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            按题号顺序练习，系统自动为您安排学习进度
          </p>
        </div>
      </div>
    </div>
  )
}