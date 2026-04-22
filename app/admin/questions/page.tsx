'use client'

import { useState, useEffect } from 'react'
import type { Question } from '../../../types/question'

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('approved')

  useEffect(() => {
    loadQuestions()
  }, [filter])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const url = filter === 'all' 
        ? '/api/admin/questions' 
        : `/api/admin/questions?status=${filter}`
        
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setQuestions(data.questions)
      }
    } catch (error) {
      console.error('加载题目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">已通过</span>
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">待审核</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">已拒绝</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">未知</span>
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'single': return '单选题'
      case 'multiple': return '多选题'
      case 'true_false': return '判断题'
      case 'text': return '主观题'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">题库管理</h1>
        <div className="text-center py-8">
          <p className="text-gray-500">正在加载题目...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">题库管理</h1>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 筛选器 */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'approved', label: '已通过' },
            { key: 'pending', label: '待审核' },
            { key: 'rejected', label: '已拒绝' }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key as any)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                filter === item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">暂无题目</p>
            <p className="text-sm text-gray-400 mt-2">
              {filter === 'approved' ? '还没有通过审核的题目' : 
               filter === 'pending' ? '没有待审核的题目' :
               filter === 'rejected' ? '没有被拒绝的题目' : '题库为空'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              共找到 <span className="font-medium">{questions.length}</span> 道题目
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {questions.map((question) => (
              <div key={question.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 题目头部信息 */}
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        题号: {question.questionNo || '未知'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getTypeText(question.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        难度: {question.difficulty}
                      </span>
                      {getStatusBadge(question.status)}
                    </div>

                    {/* 题干 */}
                    <h3 className="text-lg font-medium text-gray-900 mb-3 line-clamp-2">
                      {question.stem}
                    </h3>

                    {/* 选项预览 */}
                    {question.options && question.options.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 space-y-1">
                          {question.options.slice(0, 2).map((option) => (
                            <div key={option.key}>
                              <span className="font-medium">{option.key}.</span> {option.text.substring(0, 50)}{option.text.length > 50 ? '...' : ''}
                            </div>
                          ))}
                          {question.options.length > 2 && (
                            <div className="text-gray-400">
                              ... 还有 {question.options.length - 2} 个选项
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-green-600">
                            答案: {question.answer.length > 0 ? question.answer.join(', ') : '未识别'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 元数据 */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>来源: {question.sourcePdf}</span>
                      <span>考试: {question.exam}</span>
                      <span>创建: {new Date(question.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* 标签 */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {question.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {question.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                            +{question.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}