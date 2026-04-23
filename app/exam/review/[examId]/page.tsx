'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useExamSession } from '@/hooks/useExamSession'
import type { Question } from '@/types/question'
import type { ExamResult } from '@/types/exam-session'

export default function ExamReview() {
  const params = useParams()
  const examId = params.examId as string
  const { getExamHistory } = useExamSession()
  
  const [examResult, setExamResult] = useState<ExamResult | null>(null)
  const [questionDetails, setQuestionDetails] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadExamReview = async () => {
      try {
        // 从localStorage中获取考试结果
        const history = getExamHistory()
        const result = history.find(r => r.examId === examId)
        
        if (!result) {
          console.error('考试记录不存在')
          return
        }
        
        setExamResult(result)
        
        // 获取所有题目的详细信息
        const questionIds = result.questions.map(q => q.id)
        const response = await fetch('/api/questions/details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ questionIds }),
        })
        
        if (!response.ok) {
          throw new Error('获取题目详情失败')
        }
        
        const details = await response.json()
        setQuestionDetails(details)
        
      } catch (error) {
        console.error('加载考试详情失败:', error)
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      loadExamReview()
    }
  }, [examId, getExamHistory])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试详情中...</p>
        </div>
      </div>
    )
  }

  if (!examResult || !questionDetails.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">考试记录不存在或加载失败</p>
          <Link href="/exam" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            返回考试中心
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestionResult = examResult.questions[currentQuestionIndex]
  const currentQuestionDetail = questionDetails.find(q => q.id === currentQuestionResult.id)

  if (!currentQuestionDetail) {
    return <div>题目详情加载失败</div>
  }

  const formatSelectedAnswers = (answers: string[]) => {
    if (!answers || answers.length === 0) return '未作答'
    return answers.join(', ')
  }

  const formatCorrectAnswers = (answers: string[]) => {
    if (!answers || answers.length === 0) return '无答案'
    return answers.join(', ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/exam" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回考试中心
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">考试详情复习</h1>
          </div>
        </div>

        {/* 考试信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">考试类型</p>
              <p className="text-lg font-semibold">
                {examResult.type === 'quick' ? '快速考试' : '完整考试'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">最终得分</p>
              <p className={`text-2xl font-bold ${
                examResult.score >= 70 ? 'text-green-600' : 'text-red-600'
              }`}>
                {examResult.score}分
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">正确率</p>
              <p className="text-lg font-semibold">
                {examResult.correctAnswers}/{examResult.totalQuestions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">用时</p>
              <p className="text-lg font-semibold">
                {Math.floor(examResult.timeSpent)}分钟
              </p>
            </div>
          </div>
        </div>

        {/* 题目棋盘 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">题目导航</h3>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {examResult.questions.map((questionResult, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`
                  aspect-square rounded-lg text-sm font-medium transition-all
                  ${currentQuestionIndex === index
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                  }
                  ${questionResult.isCorrect
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : questionResult.selectedAnswers.length > 0
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }
                `}
              >
                {questionResult.position}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span>答对</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span>答错</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>未答</span>
            </div>
          </div>
        </div>

        {/* 当前题目详情 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              第 {currentQuestionResult.position} 题
            </h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentQuestionResult.isCorrect
                ? 'bg-green-100 text-green-800'
                : currentQuestionResult.selectedAnswers.length > 0
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {currentQuestionResult.isCorrect 
                ? '✓ 正确' 
                : currentQuestionResult.selectedAnswers.length > 0 
                ? '✗ 错误' 
                : '未作答'
              }
            </div>
          </div>

          {/* 题目内容 */}
          <div className="mb-6">
            <h4 className="text-gray-900 leading-relaxed whitespace-pre-line">
              {currentQuestionDetail.stem}
            </h4>
          </div>

          {/* 选项 */}
          {currentQuestionDetail.options && currentQuestionDetail.options.length > 0 && (
            <div className="space-y-3 mb-6">
              {currentQuestionDetail.options.map((option) => {
                const isSelected = currentQuestionResult.selectedAnswers.includes(option.key)
                const isCorrect = currentQuestionResult.correctAnswers.includes(option.key)
                
                return (
                  <div
                    key={option.key}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCorrect
                        ? 'border-green-500 bg-green-50'
                        : isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0
                        ${isCorrect
                          ? 'bg-green-500 text-white'
                          : isSelected
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                        }
                      `}>
                        {option.key}
                      </span>
                      <span className="text-gray-900">{option.text}</span>
                      {isCorrect && (
                        <span className="text-green-600 font-medium ml-auto">正确答案</span>
                      )}
                      {isSelected && !isCorrect && (
                        <span className="text-red-600 font-medium ml-auto">您的选择</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 答案信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">您的答案</p>
                <p className={`font-medium ${
                  currentQuestionResult.isCorrect ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatSelectedAnswers(currentQuestionResult.selectedAnswers)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">正确答案</p>
                <p className="font-medium text-green-600">
                  {formatCorrectAnswers(currentQuestionResult.correctAnswers)}
                </p>
              </div>
            </div>
          </div>

          {/* 解析 */}
          {currentQuestionDetail.explanation && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">题目解析</h4>
              <p className="text-blue-800 leading-relaxed">
                {currentQuestionDetail.explanation}
              </p>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一题
            </button>
            
            <span className="text-sm text-gray-500">
              {currentQuestionIndex + 1} / {examResult.questions.length}
            </span>

            <button
              onClick={() => setCurrentQuestionIndex(Math.min(examResult.questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === examResult.questions.length - 1}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              下一题
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}