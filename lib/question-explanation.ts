export const AI_EXPLANATION_MARKER = '✓ 正确答案'

export type OptionExplanation = {
  label: string
  content: string
  isCorrect: boolean
}

export function hasAIExplanation(explanation?: string | null) {
  return explanation?.includes(AI_EXPLANATION_MARKER) ?? false
}

export function mergeAIExplanationWithExisting(
  aiExplanation: string,
  existingExplanation?: string | null
) {
  const trimmedExistingExplanation = existingExplanation?.trim()

  if (!trimmedExistingExplanation) {
    return aiExplanation.trim()
  }

  return `${aiExplanation.trim()}\n\n默认解析：\n${trimmedExistingExplanation}`
}

export async function requestQuestionExplanation(questionId: string) {
  const response = await fetch(`/api/questions/${questionId}/generate-explanation`, {
    method: 'POST',
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || '生成解析失败')
  }

  return {
    explanation: (result.explanation as string | undefined) || '',
    optionExplanations: (result.optionExplanations as OptionExplanation[] | undefined) || [],
    generated: Boolean(result.generated),
  }
}
