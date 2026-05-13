'use client'

import { useEffect } from 'react'
import { createOptionOrder, getDisplayOptionSlots } from '@/lib/utils'
import { usePracticeSession } from '@/hooks/usePracticeSession'
import type { Question } from '@/types/question'
import {
  getPracticeQuestionOptionOrderCache,
  setPracticeQuestionOptionOrderCache,
} from '@/hooks/practice-option-order-cache'

const EMPTY_OPTIONS: NonNullable<Question['options']> = []

export function usePracticeQuestionOptions(
  questionId: string | null | undefined,
  options: Question['options']
) {
  const { getQuestionOptionOrder, setQuestionOptionOrder } = usePracticeSession()
  const availableOptions = options ?? EMPTY_OPTIONS
  const savedOrder = questionId ? getQuestionOptionOrder(questionId) : null

  let localOrder = savedOrder

  if (questionId && availableOptions.length > 0 && !localOrder) {
    localOrder = getPracticeQuestionOptionOrderCache(questionId) ?? createOptionOrder(availableOptions)
    setPracticeQuestionOptionOrderCache(questionId, localOrder)
  }

  useEffect(() => {
    if (!questionId || availableOptions.length === 0) {
      return
    }

    const persistedOrder = getQuestionOptionOrder(questionId)
    const nextOrder = persistedOrder ?? getPracticeQuestionOptionOrderCache(questionId) ?? createOptionOrder(availableOptions)

    setPracticeQuestionOptionOrderCache(questionId, nextOrder)

    if (!persistedOrder) {
      setQuestionOptionOrder(questionId, nextOrder)
    }
  }, [availableOptions, getQuestionOptionOrder, questionId, setQuestionOptionOrder])

  return getDisplayOptionSlots(availableOptions, localOrder)
}
