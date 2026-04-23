'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useExamSession } from '@/hooks/useExamSession'
import { Question } from '@/types/question'
import { ExamResult } from '@/types/exam-session'

type ExamResponse = {
  type: 'quick' | 'full'
  questions: Question[]
  totalQuestions: number
  examId: string
  startTime: number
}

export default function FullExam() {
  const router = useRouter()
  const { currentExam, startExam, answerQuestion, submitExam, abandonExam, getQuestionByPosition } = useExamSession()
  
  const [loading, setLoading] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(1)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [timeLimit] = useState(90 * 60) // 90分钟 = 5400秒

  // 计时器和时间限制
  useEffect(() => {
    if (currentExam && !examResult) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentExam.startTime) / 1000)
        setTimeElapsed(elapsed)
        
        // 时间到了自动提交
        if (elapsed >= timeLimit) {
          handleSubmitExam()
        }
        
        // 时间警告（10分钟时提醒）
        if (elapsed === timeLimit - 600 && timeLimit - elapsed === 600) {
          alert('注意：考试时间剩余 10 分钟，请尽快完成答题！')
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentExam, examResult, timeLimit])

  // 初始化考试
  useEffect(() => {
    if (!currentExam || currentExam.type !== 'full') {
      initializeExam()
    } else {
      // 恢复考试状态
      const question = getQuestionByPosition(currentPosition)
      if (question) {
        setSelectedAnswers(question.selectedAnswers)
      }
    }
  }, [])

  // 当切换题目时，加载选中答案
  useEffect(() => {
    if (currentExam) {
      const question = getQuestionByPosition(currentPosition)
      setSelectedAnswers(question?.selectedAnswers || [])
    }
  }, [currentPosition, currentExam])

  const initializeExam = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/exam?type=full')
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam questions')
      }
      
      const data: ExamResponse = await response.json()
      startExam('full', data.questions)
    } catch (error) {
      console.error('Failed to initialize exam:', error)
      alert('加载考试题目失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (optionKey: string) => {
    if (!currentExam || examResult) return
    
    const question = getQuestionByPosition(currentPosition)
    if (!question) return

    let newAnswers: string[]
    if (question.type === 'MULTIPLE') {
      newAnswers = selectedAnswers.includes(optionKey)
        ? selectedAnswers.filter(key => key !== optionKey)
        : [...selectedAnswers, optionKey]
    } else {
      newAnswers = [optionKey]
    }

    setSelectedAnswers(newAnswers)
    answerQuestion(currentPosition, newAnswers)
  }

  const goToQuestion = (position: number) => {
    if (position >= 1 && position <= (currentExam?.totalQuestions || 0)) {
      setCurrentPosition(position)
    }
  }

  const handleSubmitExam = async () => {
    if (!currentExam) return

    try {
      setLoading(true)
      
      // 准备提交数据
      const answers = currentExam.questions.map(q => ({
        questionId: q.id,
        selectedAnswers: q.selectedAnswers
      }))
      
      // 提交到后端获取答案
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: currentExam.id,
          answers
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit exam')
      }
      
      const result = await response.json()
      
      // 处理考试结果
      const correctAnswersData = result.results.map((r: any) => ({
        id: r.questionId,
        answer: r.correctAnswers
      }))
      
      const examResult = submitExam(correctAnswersData)
      setExamResult(examResult)
      
    } catch (error) {
      console.error('Failed to submit exam:', error)
      alert('提交考试失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const formatTimeLeft = (timeLimit: number, elapsed: number) => {
    const remaining = Math.max(0, timeLimit - elapsed)
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载考试...</p>
        </div>
      </div>
    )
  }

  if (examResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 考试结果 */}
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
              examResult.score >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-2xl font-bold ${
                examResult.score >= 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {examResult.score}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              完整考试完成 - {examResult.score >= 70 ? '通过' : '未通过'}
            </h2>
            <p className="text-gray-600 mb-6">
              您的得分为 {examResult.score} 分，正确回答了 {examResult.correctAnswers} / {examResult.totalQuestions} 题
              {examResult.score >= 70 
                ? '，恭喜您达到了70%的通过标准！' 
                : '，未达到70%的通过标准，建议继续练习。'
              }
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{examResult.score}%</p>
                <p className="text-sm text-gray-500">总分</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{examResult.correctAnswers}</p>
                <p className="text-sm text-gray-500">正确</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{examResult.timeSpent}分钟</p>
                <p className="text-sm text-gray-500">用时</p>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Link 
                href="/exam"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回考试中心
              </Link>
              <button
                onClick={() => {
                  setExamResult(null)
                  setCurrentPosition(1)
                  setSelectedAnswers([])
                  setTimeElapsed(0)
                  initializeExam()
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                重新考试
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentExam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">考试加载失败</p>
          <Link href="/exam" className="text-blue-600 hover:text-blue-700">
            返回考试中心
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = getQuestionByPosition(currentPosition)
  if (!currentQuestion) {
    return <div>题目加载中...</div>
  }

  const allAnswered = currentExam.questions.every(q => q.answered)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (confirm('确定要放弃考试吗？考试进度将不会保存。')) {
                  abandonExam()
                  router.push('/exam')
                }
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 放弃考试
            </button>
            <h1 className="text-2xl font-bold text-gray-900">完整考试</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold text-gray-900">
              剩余时间: <span className={`${
                timeLimit - timeElapsed <= 600 ? 'text-red-600' : 'text-gray-900'
              }`}>{formatTimeLeft(timeLimit, timeElapsed)}</span>
            </div>
            {allAnswered && (
              <button
                onClick={handleSubmitExam}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                提交考试
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左侧：题目棋盘 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: currentExam.totalQuestions }, (_, index) => {
                  const position = index + 1
                  const question = currentExam.questions.find(q => q.position === position)
                  const isAnswered = question?.answered || false
                  const isCurrent = position === currentPosition
                  
                  return (
                    <button
                      key={position}
                      onClick={() => goToQuestion(position)}
                      className={`
                        w-8 h-8 rounded text-xs font-medium transition-colors
                        ${isCurrent 
                          ? 'bg-blue-600 text-white' 
                          : isAnswered 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {position}
                    </button>
                  )
                })}
              </div>
              
              <div className="mt-4 text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-100 rounded"></div>
                  <span className="text-gray-600">已答题</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">未答题</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                <p>已答：{currentExam.questionsAnswered} / {currentExam.totalQuestions}</p>
              </div>
            </div>
          </div>

          {/* 右侧：题目内容 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  第 {currentPosition} 题
                </h2>
                <div className="text-sm text-gray-500">
                  {currentQuestion.type === 'SINGLE' && '单选题'}
                  {currentQuestion.type === 'MULTIPLE' && '多选题'}
                  {currentQuestion.type === 'TRUE_FALSE' && '判断题'}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-900 text-lg leading-relaxed">
                  {currentQuestion.stem}
                </p>
              </div>

              {currentQuestion.options && (
                <div className="space-y-3 mb-8">
                  {currentQuestion.options.map((option) => (
                    <label
                      key={option.key}
                      className={`
                        flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors
                        ${selectedAnswers.includes(option.key)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type={currentQuestion.type === 'MULTIPLE' ? 'checkbox' : 'radio'}
                        name={`question-${currentPosition}`}
                        value={option.key}
                        checked={selectedAnswers.includes(option.key)}
                        onChange={() => handleAnswerChange(option.key)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-700">{option.key}.</span>
                        <span className="text-gray-900 ml-2">{option.text}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* 题目导航 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToQuestion(currentPosition - 1)}
                  disabled={currentPosition === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一题
                </button>
                
                <span className="text-gray-500">
                  {currentPosition} / {currentExam.totalQuestions}
                </span>
                
                <button
                  onClick={() => goToQuestion(currentPosition + 1)}
                  disabled={currentPosition === currentExam.totalQuestions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一题
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}