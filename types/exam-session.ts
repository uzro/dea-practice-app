export type ExamType = 'quick' | 'full'

export type ExamQuestion = {
  id: string // 真实题目ID
  position: number // 考试中的序号位置 (1, 2, 3...)
  answered: boolean // 是否已作答
  selectedAnswers: string[] // 选择的答案
}

export type ExamSession = {
  id: string // 考试会话ID
  type: ExamType
  status: 'in_progress' | 'completed'
  questions: ExamQuestion[]
  startTime: number
  endTime?: number
  totalQuestions: number
  questionsAnswered: number
}

export type ExamResult = {
  examId: string
  type: ExamType
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number // 考试用时(分钟)
  completedAt: number
  questions: Array<{
    id: string
    position: number
    selectedAnswers: string[]
    correctAnswers: string[]
    isCorrect: boolean
  }>
}

export type ExamHistory = {
  [examId: string]: ExamResult
}