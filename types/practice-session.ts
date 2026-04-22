export type PracticeRecord = {
  questionId: string
  answered: boolean
  isCorrect: boolean
  selectedAnswers: string[]
  timestamp: number
}

export type PracticeSession = {
  [questionId: string]: PracticeRecord
}

export type PracticeStats = {
  totalAnswered: number
  totalCorrect: number
  totalIncorrect: number
  accuracy: number
}