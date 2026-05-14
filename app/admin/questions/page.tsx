'use client'

import { useState, useEffect } from 'react'
import type { Question } from '../../../types/question'

type OptionExplanation = {
  label: string
  content: string
  isCorrect: boolean
}

type EditingQuestion = Question & {
  optionExplanations?: OptionExplanation[]
}

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('approved')
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  const openEdit = async (question: Question) => {
    setEditLoading(true)
    setEditingQuestion(null)
    try {
      const res = await fetch(`/api/admin/questions/${question.id}`)
      const data = await res.json()
      console.log('Fetched question data:', data)
      if (data.success) {
        const editQuestion = {
          ...data.question,
          optionExplanations: data.question.optionExplanations || []
        }
        console.log('Setting editingQuestion:', editQuestion)
        setEditingQuestion(editQuestion)
      } else {
        setEditingQuestion({ ...question, optionExplanations: [] })
      }
    } catch (error) {
      console.error('Error fetching question:', error)
      setEditingQuestion({ ...question, optionExplanations: [] })
    } finally {
      setEditLoading(false)
    }
  }

  const closeEdit = () => {
    setEditingQuestion(null)
    setSaveMessage(null)
  }

  const updateOptionExplanation = (index: number, field: keyof OptionExplanation, value: string | boolean) => {
    if (!editingQuestion) return
    const updated = [...(editingQuestion.optionExplanations || [])]
    updated[index] = { ...updated[index], [field]: value }
    setEditingQuestion({ ...editingQuestion, optionExplanations: updated })
  }

  const addOptionExplanation = () => {
    if (!editingQuestion) return
    const existing = editingQuestion.optionExplanations || []
    setEditingQuestion({
      ...editingQuestion,
      optionExplanations: [...existing, { label: '', content: '', isCorrect: false }]
    })
  }

  const removeOptionExplanation = (index: number) => {
    if (!editingQuestion) return
    const updated = (editingQuestion.optionExplanations || []).filter((_, i) => i !== index)
    setEditingQuestion({ ...editingQuestion, optionExplanations: updated })
  }

  const saveQuestion = async () => {
    if (!editingQuestion) return
    setSaveLoading(true)
    setSaveMessage(null)
    try {
      const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuestion)
      })
      const data = await res.json()
      if (data.success) {
        setSaveMessage({ type: 'success', text: '保存成功' })
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...data.question } : q))
      } else {
        setSaveMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch {
      setSaveMessage({ type: 'error', text: '保存失败，请重试' })
    } finally {
      setSaveLoading(false)
    }
  }

  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.max(e.target.scrollHeight, 60) + 'px'
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
                    <button
                      onClick={() => openEdit(question)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {(editLoading || editingQuestion) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
            {editLoading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : editingQuestion && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    编辑题目 {editingQuestion.questionNo ? `#${editingQuestion.questionNo}` : ''}
                  </h2>
                  <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* 题干 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">题干</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingQuestion.stem}
                      onChange={e => {
                        setEditingQuestion({ ...editingQuestion, stem: e.target.value })
                        autoResizeTextarea(e)
                      }}
                      style={{ minHeight: '80px' }}
                    />
                  </div>

                  {/* 整体解析 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">整体解析</label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingQuestion.explanation || ''}
                      onChange={e => {
                        setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                        autoResizeTextarea(e)
                      }}
                      style={{ minHeight: '100px' }}
                    />
                  </div>

                  {/* 选项解析 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">选项解析</label>
                      <button
                        type="button"
                        onClick={addOptionExplanation}
                        className="text-sm text-white bg-purple-600 hover:bg-purple-700 border border-purple-600 rounded px-2 py-1 transition-colors"
                      >
                        + 手动添加
                      </button>
                    </div>
                    {(!editingQuestion.optionExplanations || editingQuestion.optionExplanations.length === 0) ? (
                      <p className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded text-center">暂无选项解析</p>
                    ) : (
                      <div className="space-y-2">
                        {editingQuestion.optionExplanations.map((oe, idx) => (
                          <div key={idx} className="border border-blue-200 rounded-lg p-3 bg-blue-50 hover:bg-blue-100 transition-colors">
                            <div className="flex items-start gap-2 mb-2">
                              <input
                                type="text"
                                className="w-12 border border-blue-300 rounded px-2 py-1 text-sm font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={oe.label}
                                onChange={e => updateOptionExplanation(idx, 'label', e.target.value.toUpperCase())}
                                maxLength={2}
                                placeholder="A"
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={oe.isCorrect}
                                  onChange={e => updateOptionExplanation(idx, 'isCorrect', e.target.checked)}
                                  className="rounded"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeOptionExplanation(idx)}
                                className="ml-auto text-xs text-red-600 hover:text-red-800 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                              >
                                删除
                              </button>
                            </div>
                            <textarea
                              className="w-full border border-blue-300 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              placeholder="输入选项解析内容..."
                              value={oe.content}
                              onChange={e => {
                                updateOptionExplanation(idx, 'content', e.target.value)
                                autoResizeTextarea(e)
                              }}
                              style={{ minHeight: '60px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  {saveMessage && (
                    <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage.text}
                    </p>
                  )}
                  {!saveMessage && <span />}
                  <div className="flex gap-3">
                    <button
                      onClick={closeEdit}
                      className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={saveQuestion}
                      disabled={saveLoading}
                      className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saveLoading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}