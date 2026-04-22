'use client'

import { useState, useEffect } from 'react'
import type { Question } from '../../../types/question'

interface QuestionsStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

interface Pagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function AdminReview() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<QuestionsStats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  
  // 分页和排序状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('questionNo')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    loadQuestions()
    loadStats()
  }, [currentPage, pageSize, sortBy, sortOrder])

  const loadQuestions = async () => {
    try {
      const params = new URLSearchParams({
        status: 'pending',
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      })
      
      const response = await fetch(`/api/admin/questions?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setQuestions(data.questions)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('加载题目失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/questions?stats=true')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  const handleQuestionAction = async (questionId: string, status: 'approved' | 'rejected') => {
    setProcessingAction(questionId)
    
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          status
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // 从列表中移除已处理的题目
        setQuestions(prev => prev.filter(q => q.id !== questionId))
        setSelectedQuestions(prev => {
          const updated = new Set(prev)
          updated.delete(questionId)
          return updated
        })
        // 重新加载数据以更新分页
        await Promise.all([loadStats(), loadQuestions()])
      } else {
        alert('操作失败: ' + data.error)
      }
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleBatchAction = async (status: 'approved' | 'rejected') => {
    if (selectedQuestions.size === 0) {
      alert('请先选择要操作的题目')
      return
    }

    const actionText = status === 'approved' ? '通过' : '拒绝'
    if (!confirm(`确认${actionText} ${selectedQuestions.size} 道题目吗？`)) {
      return
    }

    setProcessingAction('batch')
    
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'batch',
          questionIds: Array.from(selectedQuestions),
          status
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // 从列表中移除已处理的题目
        setQuestions(prev => prev.filter(q => !selectedQuestions.has(q.id)))
        setSelectedQuestions(new Set())
        // 重新加载数据以更新分页
        await Promise.all([loadStats(), loadQuestions()])
        alert(`${actionText}了 ${data.updatedCount} 道题目`)
      } else {
        alert('批量操作失败: ' + data.error)
      }
    } catch (error) {
      console.error('批量操作失败:', error)
      alert('批量操作失败')
    } finally {
      setProcessingAction(null)
    }
  }

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const updated = new Set(prev)
      if (updated.has(questionId)) {
        updated.delete(questionId)
      } else {
        updated.add(questionId)
      }
      return updated
    })
  }

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // 切换排序方向
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 更改排序字段
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
    setCurrentPage(1) // 重置到第一页
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedQuestions(new Set()) // 清空选择
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    setSelectedQuestions(new Set())
  }

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)))
    }
  }

  // 分页组件
  const PaginationComponent = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    const getPageNumbers = () => {
      const pages = []
      const { page, totalPages } = pagination
      
      // 显示页码范围
      let start = Math.max(1, page - 2)
      let end = Math.min(totalPages, page + 2)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
      
      return pages
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-500">
          第 {(pagination.page - 1) * pagination.pageSize + 1} - {
            Math.min(pagination.page * pagination.pageSize, pagination.totalCount)
          } 项，共 {pagination.totalCount} 条
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={5}>5条/页</option>
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
          
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          
          <div className="flex space-x-1">
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === '...') {
                return <span key={`ellipsis-${index}`} className="px-3 py-1 text-sm text-gray-500">...</span>
              }
              
              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => handlePageChange(pageNum as number)}
                  className={`px-3 py-1 text-sm border rounded ${
                    pageNum === pagination.page
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">题目审核</h1>
        <div className="text-center py-8">
          <p className="text-gray-500">正在加载题目...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">题目审核</h1>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">总题目</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-600">待审核</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-600">已通过</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-red-600">已拒绝</div>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">暂无待审核题目</p>
            <p className="text-sm text-gray-400 mt-2">上传PDF文件后，提取的题目将显示在这里</p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          {/* 排序和筛选控件 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">排序方式：</span>
                <button
                  onClick={() => handleSortChange('questionNo')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    sortBy === 'questionNo'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  按题号 {sortBy === 'questionNo' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('createdAt')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    sortBy === 'createdAt'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  按创建时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('difficulty')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    sortBy === 'difficulty'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  按难度 {sortBy === 'difficulty' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
              
              {pagination && (
                <div className="text-sm text-gray-500">
                  显示 {(pagination.page - 1) * pagination.pageSize + 1}-{
                    Math.min(pagination.page * pagination.pageSize, pagination.totalCount)
                  } / {pagination.totalCount} 题
                </div>
              )}
            </div>
          </div>

          {/* 批量操作栏 */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedQuestions.size === questions.length && questions.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  选择全部 ({selectedQuestions.size}/{questions.length})
                </span>
              </label>
            </div>
            
            {selectedQuestions.size > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBatchAction('approved')}
                  disabled={processingAction === 'batch'}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  批量通过
                </button>
                <button
                  onClick={() => handleBatchAction('rejected')}
                  disabled={processingAction === 'batch'}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  批量拒绝
                </button>
              </div>
            )}
          </div>

          {/* 题目列表 */}
          <div className="divide-y divide-gray-200">
            {questions.map((question) => (
              <div key={question.id} className="p-6">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => toggleQuestionSelection(question.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* 题目头部信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>题号: {question.questionNo || '未知'}</span>
                        <span>•</span>
                        <span>来源: {question.sourcePdf}</span>
                        <span>•</span>
                        <span>类型: {question.type === 'single' ? '单选' : question.type === 'multiple' ? '多选' : question.type === 'true_false' ? '判断' : '主观'}</span>
                        <span>•</span>
                        <span>难度: {question.difficulty}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleQuestionAction(question.id, 'approved')}
                          disabled={processingAction === question.id}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          ✓ 通过
                        </button>
                        <button
                          onClick={() => handleQuestionAction(question.id, 'rejected')}
                          disabled={processingAction === question.id}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          ✗ 拒绝
                        </button>
                      </div>
                    </div>

                    {/* 题干 */}
                    <div className="mb-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {question.stem}
                      </h3>
                    </div>

                    {/* 选项 */}
                    {question.options && question.options.length > 0 && (
                      <div className="mb-3">
                        <div className="space-y-1">
                          {question.options.map((option) => (
                            <div 
                              key={option.key} 
                              className={`p-2 rounded text-sm ${
                                question.answer.includes(option.key) 
                                  ? 'bg-green-50 border border-green-200 font-medium' 
                                  : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{option.key}.</span> {option.text}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>正确答案:</strong> {question.answer.length > 0 ? question.answer.join(', ') : '未识别'}
                        </div>
                      </div>
                    )}

                    {/* 解析 */}
                    {question.explanation && (
                      <div className="mb-3 p-3 bg-blue-50 rounded">
                        <div className="text-sm text-blue-800">
                          <strong>解析:</strong> {question.explanation}
                        </div>
                      </div>
                    )}

                    {/* 标签 */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {question.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>          
          {/* 分页组件 */}
          <PaginationComponent />        </div>
      )}
    </div>
  )
}