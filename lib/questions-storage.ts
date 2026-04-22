import type { Question } from '../types/question'

// 内存存储提取的题目 (生产环境中应该使用数据库)
export const extractedQuestionsStorage: Question[] = [
  // 示例题目
  {
    id: 'example-question-1',
    exam: 'DEA',
    sourcePdf: '【示例】DEA考试样题.pdf',
    questionNo: '1',
    type: 'single',
    stem: '在Databricks中，以下哪个组件负责管理计算资源？',
    options: [
      { key: 'A', text: 'Databricks File System (DBFS)' },
      { key: 'B', text: 'Cluster Manager' },
      { key: 'C', text: 'Unity Catalog' },
      { key: 'D', text: 'Delta Lake' }
    ],
    answer: ['B'],
    explanation: 'Cluster Manager负责管理和调度Databricks中的计算资源，包括集群的创建、配置和监控。',
    difficulty: 'medium',
    tags: ['Databricks', '计算资源', '集群管理'],
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  }
]

// 获取所有题目
export function getAllExtractedQuestions(): Question[] {
  return extractedQuestionsStorage.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// 根据状态获取题目
export function getQuestionsByStatus(status: 'pending' | 'approved' | 'rejected'): Question[] {
  return extractedQuestionsStorage
    .filter(q => q.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// 根据源PDF获取题目
export function getQuestionsBySource(sourcePdf: string): Question[] {
  return extractedQuestionsStorage
    .filter(q => q.sourcePdf === sourcePdf)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// 添加新题目
export function addExtractedQuestions(questions: Question[]): void {
  extractedQuestionsStorage.push(...questions)
}

// 更新题目状态
export function updateQuestionStatus(questionId: string, status: 'pending' | 'approved' | 'rejected'): boolean {
  const questionIndex = extractedQuestionsStorage.findIndex(q => q.id === questionId)
  
  if (questionIndex === -1) {
    return false
  }
  
  extractedQuestionsStorage[questionIndex].status = status
  extractedQuestionsStorage[questionIndex].updatedAt = new Date().toISOString()
  
  return true
}

// 批量更新题目状态
export function batchUpdateQuestionStatus(
  questionIds: string[], 
  status: 'pending' | 'approved' | 'rejected'
): number {
  let updatedCount = 0
  
  questionIds.forEach(id => {
    if (updateQuestionStatus(id, status)) {
      updatedCount++
    }
  })
  
  return updatedCount
}

// 获取单个题目
export function getQuestionById(questionId: string): Question | null {
  return extractedQuestionsStorage.find(q => q.id === questionId) || null
}

// 删除题目
export function deleteQuestion(questionId: string): boolean {
  const questionIndex = extractedQuestionsStorage.findIndex(q => q.id === questionId)
  
  if (questionIndex === -1) {
    return false
  }
  
  extractedQuestionsStorage.splice(questionIndex, 1)
  return true
}

// 获取统计信息
export function getQuestionsStats() {
  const total = extractedQuestionsStorage.length
  const pending = extractedQuestionsStorage.filter(q => q.status === 'pending').length
  const approved = extractedQuestionsStorage.filter(q => q.status === 'approved').length
  const rejected = extractedQuestionsStorage.filter(q => q.status === 'rejected').length
  
  return {
    total,
    pending,
    approved,
    rejected
  }
}