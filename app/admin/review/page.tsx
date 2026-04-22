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
  
  // Tab状态
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // 编辑状态
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    loadQuestions()
    loadStats()
  }, [currentPage, pageSize, sortBy, sortOrder, activeTab, searchTerm])

  const loadQuestions = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      })
      
      // 根据选中的tab设置状态过滤
      if (activeTab !== 'all') {
        params.set('status', activeTab)
      }
      
      // 添加搜索参数
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }
      
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
      const response = await fetch('/api/admin/questions?statsOnly=true')
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

  const handleTabChange = (tab: 'all' | 'pending' | 'approved' | 'rejected') => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSelectedQuestions(new Set())
  }

  const handleSearch = () => {
    setSearchTerm(searchInput)
    setCurrentPage(1)
    setSelectedQuestions(new Set())
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSearchTerm('')
    setCurrentPage(1)
    setSelectedQuestions(new Set())
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)))
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setIsEditModalOpen(true)
  }

  const handleSaveQuestion = async (updatedQuestion: Question) => {
    try {
      const response = await fetch(`/api/admin/questions/${updatedQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedQuestion)
      })

      const data = await response.json()
      
      if (data.success) {
        // 更新本地题目列表
        setQuestions(prev => prev.map(q => 
          q.id === updatedQuestion.id ? updatedQuestion : q
        ))
        setIsEditModalOpen(false)
        setEditingQuestion(null)
        alert('题目更新成功')
      } else {
        alert('更新失败: ' + data.error)
      }
    } catch (error) {
      console.error('更新题目失败:', error)
      alert('更新失败')
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">题目管理</h1>
        <div className="text-center py-8">
          <p className="text-gray-500">正在加载题目...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          题目管理
          {activeTab !== 'all' && (
            <span className="text-xl text-gray-600 ml-2">
              - {activeTab === 'pending' ? '待审核' : 
                  activeTab === 'approved' ? '已通过' : '已拒绝'}
            </span>
          )}
        </h1>
        <button
          onClick={loadQuestions}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          刷新
        </button>
      </div>

      {/* Tab 导航 */}
      {stats && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabChange('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>总题目</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.total}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>待审核</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.pending}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('approved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approved'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>已通过</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.approved}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('rejected')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rejected'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>已拒绝</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {stats.rejected}
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="搜索题目内容..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
            
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                清除
              </button>
            )}
          </div>
          
          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              搜索结果: "{searchTerm}"
              {pagination && (
                <span className="ml-2">
                  (共找到 {pagination.totalCount} 条相关题目)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">
              {activeTab === 'all' ? '暂无题目' : 
               activeTab === 'pending' ? '暂无待审核题目' :
               activeTab === 'approved' ? '暂无已通过题目' : '暂无已拒绝题目'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {activeTab === 'pending' ? '上传PDF文件后，提取的题目将显示在这里' : '切换到其他标签查看相应题目'}
            </p>
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
            
            {selectedQuestions.size > 0 && activeTab === 'pending' && (
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
                        {activeTab === 'all' && (
                          <>
                            <span>•</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              question.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              question.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {question.status === 'pending' ? '待审核' : 
                               question.status === 'approved' ? '已通过' : '已拒绝'}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          ✏️ 编辑
                        </button>
                        
                        {activeTab === 'pending' && (
                          <>
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
                          </>
                        )}
                        
                        {(activeTab === 'approved' || activeTab === 'rejected') && (
                          <button
                            onClick={() => handleQuestionAction(question.id, 'pending')}
                            disabled={processingAction === question.id}
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                          >
                            🔄 重新审核
                          </button>
                        )}
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
          <PaginationComponent />
        </div>
      )}
      
      {/* 编辑模态框 */}
      {isEditModalOpen && editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setIsEditModalOpen(false)
            setEditingQuestion(null)
          }}
        />
      )}
    </div>
  )
}

// 编辑题目模态框组件
interface EditQuestionModalProps {
  question: Question
  onSave: (question: Question) => void
  onCancel: () => void
}

function EditQuestionModal({ question, onSave, onCancel }: EditQuestionModalProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>({ ...question })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(editedQuestion)
  }
  
  const addOption = () => {
    const options = editedQuestion.options || []
    const nextKey = String.fromCharCode(65 + options.length) // A, B, C, D...
    setEditedQuestion({
      ...editedQuestion,
      options: [...options, { key: nextKey, text: '' }]
    })
  }
  
  const updateOption = (index: number, text: string) => {
    const options = [...(editedQuestion.options || [])]
    options[index] = { ...options[index], text }
    setEditedQuestion({ ...editedQuestion, options })
  }
  
  const removeOption = (index: number) => {
    const options = [...(editedQuestion.options || [])]
    options.splice(index, 1)
    setEditedQuestion({ ...editedQuestion, options })
  }
  
  const toggleAnswer = (key: string) => {
    const currentAnswers = editedQuestion.answer || []
    let newAnswers
    
    if (editedQuestion.type === 'single' || editedQuestion.type === 'true_false') {
      newAnswers = [key]
    } else {
      if (currentAnswers.includes(key)) {
        newAnswers = currentAnswers.filter(a => a !== key)
      } else {
        newAnswers = [...currentAnswers, key]
      }
    }
    
    setEditedQuestion({ ...editedQuestion, answer: newAnswers })
  }
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">编辑题目</h2>
          </div>
          
          <div className="px-6 py-4 space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题号
                </label>
                <input
                  type="text"
                  value={editedQuestion.questionNo || ''}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, questionNo: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题目类型
                </label>
                <select
                  value={editedQuestion.type}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                  <option value="true_false">判断题</option>
                  <option value="text">主观题</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  难度
                </label>
                <select
                  value={editedQuestion.difficulty || 'medium'}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, difficulty: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  考试类型
                </label>
                <input
                  type="text"
                  value={editedQuestion.exam}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, exam: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            {/* 题干 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                题干
              </label>
              <textarea
                value={editedQuestion.stem}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, stem: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            {/* 选项（非主观题） */}
            {editedQuestion.type !== 'text' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    选项
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    添加选项
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(editedQuestion.options || []).map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type={editedQuestion.type === 'multiple' ? 'checkbox' : 'radio'}
                        checked={(editedQuestion.answer || []).includes(option.key)}
                        onChange={() => toggleAnswer(option.key)}
                        className="rounded border-gray-300"
                      />
                      <span className="w-8 text-center font-medium">{option.key}.</span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder="选项内容"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 主观题答案 */}
            {editedQuestion.type === 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参考答案
                </label>
                <textarea
                  value={(editedQuestion.answer || [])[0] || ''}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, answer: [e.target.value] })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}
            
            {/* 解析 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                解析
              </label>
              <textarea
                value={editedQuestion.explanation || ''}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, explanation: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标签（用逗号分隔）
              </label>
              <input
                type="text"
                value={(editedQuestion.tags || []).join(', ')}
                onChange={(e) => setEditedQuestion({ 
                  ...editedQuestion, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="如：数据处理, 算法, 机器学习"
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}