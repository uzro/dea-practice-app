'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from "next/link"
import { useSearchParams, useRouter } from 'next/navigation'
import { Question } from '@/types/question'
import { usePracticeSession } from '@/hooks/usePracticeSession'

type QuestionResponse = {
  question: Question
  allQuestions: Array<{ id: string; questionNo?: string; position: number }>
  currentPosition: number
  totalQuestions: number
  prevQuestionId: string | null
  nextQuestionId: string | null
}

function SequentialPracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const practiceSession = usePracticeSession()
  const { recordAnswer, getStats, isAnswered, isCorrect, getQuestionStatus, clearSession } = practiceSession
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<QuestionResponse | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)

  // 从 URL参数获取题目ID
  const currentQuestionId = searchParams.get('id')

  // 获取题目数据
  useEffect(() => {
    fetchQuestion(currentQuestionId)
  }, [currentQuestionId])

  // 滚动到当前题目
  useEffect(() => {
    if (data?.question?.id) {
      const element = document.querySelector(`[data-question-id="${data.question.id}"]`)
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }
  }, [data?.question?.id])

  const fetchQuestion = async (questionId: string | null) => {
    try {
      setLoading(true)
      setShowAnswer(false)
      setSelectedAnswers([])
      
      const url = questionId 
        ? `/api/practice/sequential?id=${questionId}`
        : '/api/practice/sequential'
      const response = await fetch(url)
      const result = await response.json()
      setData(result)
      
      // 如果题目已答过，恢复选择状态
      if (result.question && isAnswered(result.question.id)) {
        const record = getQuestionStatus(result.question.id)
        if (record) {
          setSelectedAnswers(record.selectedAnswers)
        }
      }
    } catch (error) {
      console.error('Failed to fetch question:', error)
    } finally {
      setLoading(false)
    }
  }

  // 跳转到指定题目
  const goToQuestion = (questionId: string) => {
    router.push(`/practice/sequential?id=${questionId}`)
  }

  // 下一题
  const nextQuestion = () => {
    if (data?.nextQuestionId) {
      goToQuestion(data.nextQuestionId)
    }
  }

  // 上一题
  const prevQuestion = () => {
    if (data?.prevQuestionId) {
      goToQuestion(data.prevQuestionId)
    }
  }

  const handleOptionClick = (optionKey: string) => {
    if (!data) return
    
    const question = data.question
    setSelectedAnswers(prev => {
      if (question.type === 'MULTIPLE') {
        return prev.includes(optionKey) 
          ? prev.filter(key => key !== optionKey)
          : [...prev, optionKey]
      } else {
        return [optionKey]
      }
    })
  }

  const toggleShowAnswer = () => {
    if (!showAnswer && data) {
      // 第一次查看答案时记录答题状态
      recordAnswer(data.question.id, selectedAnswers, data.question.answer)
    }
    setShowAnswer(!showAnswer)
  }

  const isQuestionCorrect = () => {
    if (!data) return false
    const question = data.question
    if (selectedAnswers.length !== question.answer.length) return false
    return selectedAnswers.every(answer => question.answer.includes(answer))
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">题目加载失败</p>
          <Link href="/practice" className="text-blue-600 hover:text-blue-700">
            返回练习选择
          </Link>
        </div>
      </div>
    )
  }

  const question = data.question

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/practice" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回练习选择
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">顺序练习</h1>
          </div>
          
          <button
            onClick={() => {
              if (confirm('确定要清空所有练习记录吗？')) {
                clearSession()
                // 刷新当前页面
                if (data) {
                  setSelectedAnswers([])
                  setShowAnswer(false)
                }
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            清空记录
          </button>
        </div>

        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <div className="flex-1 max-w-4xl">
            {/* 进度指示 */}
            <div className="bg-white rounded-lg p-4 mb-6 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  已做 {stats.totalAnswered} 题 / 共 {data.totalQuestions} 题
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
                  style={{ width: `${(stats.totalAnswered / data.totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 题目卡片 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border">
              {/* 题目信息 */}
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {question.type === 'SINGLE' && '单选题'}
                  {question.type === 'MULTIPLE' && '多选题'}
                  {question.type === 'TRUE_FALSE' && '判断题'}
                  {question.type === 'TEXT' && '填空题'}
                </span>
                {question.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    question.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                    question.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {question.difficulty === 'EASY' && '简单'}
                    {question.difficulty === 'MEDIUM' && '中等'}
                    {question.difficulty === 'HARD' && '困难'}
                  </span>
                )}
              </div>

              {/* 题目内容 */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 leading-relaxed whitespace-pre-wrap">
                  {question.stem}
                </h2>

                {question.options && question.options.length > 0 && (
                  <div className="space-y-3">
                    {question.options.map((option) => (
                      <label 
                        key={option.key}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedAnswers.includes(option.key)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type={question.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                          name="answer"
                          value={option.key}
                          checked={selectedAnswers.includes(option.key)}
                          onChange={() => handleOptionClick(option.key)}
                          className="mt-1 mr-3"
                        />
                        <span className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          <strong>{option.key}.</strong> {option.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleShowAnswer}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {showAnswer ? '隐藏答案' : '查看答案'}
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={prevQuestion}
                    disabled={!data.prevQuestionId}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    上一题
                  </button>
                  <button
                    onClick={nextQuestion}
                    disabled={!data.nextQuestionId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    下一题
                  </button>
                </div>
              </div>
            </div>

            {/* 答案解析 */}
            {showAnswer && (
              <div className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-medium text-gray-900">答案解析</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isQuestionCorrect() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isQuestionCorrect() ? '答对了！' : '答错了'}
                  </span>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    <strong>正确答案：</strong>
                    {question.answer.join(', ')}
                  </p>
                  {selectedAnswers.length > 0 && (
                    <p className="text-gray-700">
                      <strong>您的答案：</strong>
                      {selectedAnswers.join(', ')}
                    </p>
                  )}
                </div>

                {question.explanation && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">详细解析：</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 题号导航棋盘 */}
          <div className="w-80">
            <div className="bg-white rounded-lg shadow-md border sticky top-8 flex flex-col max-h-[calc(100vh-6rem)]">
              <div className="p-6 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">题号导航</h3>
              </div>
              <div className="px-6 pb-4 flex-1 overflow-y-auto max-h-96">
                <div className="grid grid-cols-6 gap-2">
                  {data.allQuestions.map(item => {
                  const answered = isAnswered(item.id)
                  const correct = isCorrect(item.id)
                  const isCurrent = item.id === question.id
                  
                  let bgColor = 'bg-gray-100 text-gray-700'
                  if (isCurrent) {
                    bgColor = 'bg-blue-600 text-white'
                  } else if (answered) {
                    bgColor = correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }
                  
                  return (
                    <button
                      key={item.id}
                      data-question-id={item.id}
                      onClick={() => goToQuestion(item.id)}
                      className={`w-10 h-10 rounded text-sm font-medium transition-colors hover:opacity-80 ${
                        bgColor
                      }`}
                      title={`题目编号: ${item.questionNo || item.position}${answered ? (correct ? ' (正确)' : ' (错误)') : ''}`}
                    >
                      {item.questionNo || item.position}
                    </button>
                  )
                })}
                </div>
              </div>
              
              <div className="px-6 pb-6 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-100 border rounded"></div>
                    <span>未做</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>正确</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>错误</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-600 rounded"></div>
                    <span>当前</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SequentialPractice() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SequentialPracticeContent />
    </Suspense>
  )
}