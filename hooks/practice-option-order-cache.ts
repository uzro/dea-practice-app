const questionOptionOrderCache = new Map<string, string[]>()

export function getPracticeQuestionOptionOrderCache(questionId: string): string[] | undefined {
  return questionOptionOrderCache.get(questionId)
}

export function setPracticeQuestionOptionOrderCache(questionId: string, optionOrder: string[]): void {
  questionOptionOrderCache.set(questionId, optionOrder)
}

export function clearPracticeQuestionOptionOrderCache(): void {
  questionOptionOrderCache.clear()
}
