'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import QuestionContentRenderer from '@/components/question-content-renderer'
import QuestionOption from '@/components/question-option'
import { useExamSession } from '@/hooks/useExamSession'
import { getDisplayOptionSlots, remapExplanationOptionLabels } from '@/lib/utils'
import type { Question } from '@/types/question'

const DONE_KEY = 'dea-exam-mistakes-done'
const subscribeToHydration = () => () => {}

type QuestionDetail = Pick<Question, 'id' | 'stem' | 'options' | 'answer' | 'type' | 'questionNo' | 'explanation' | 'optionExplanations'>
type QuestionLoad =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; question: QuestionDetail }

function readDoneIds(): Set<string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function MistakeQuestion({ id, position, count, onDone }: {
  id: string
  position: number
  count: number
  onDone: () => void
}) {
  const [load, setLoad] = useState<QuestionLoad>({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadQuestion() {
      try {
        const response = await fetch('/api/questions/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIds: [id], approvedOnly: true }),
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (response.status === 404) {
          setLoad({ status: 'missing' })
          return
        }
        if (!response.ok) throw new Error('获取题目详情失败')
        const questions: QuestionDetail[] = await response.json()
        const question = questions.find(item => item.id === id)
        if (!controller.signal.aborted) {
          setLoad(question ? { status: 'ready', question } : { status: 'missing' })
        }
      } catch {
        if (!controller.signal.aborted) setLoad({ status: 'error' })
      }
    }

    void loadQuestion()
    return () => controller.abort()
  }, [id, retry])

  const question = load.status === 'ready' ? load.question : undefined
  const options = getDisplayOptionSlots(question?.options ?? [])

  return (
    <section className="rounded-lg bg-white p-5 shadow-md sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            第 {position} 题{question?.questionNo && `（原题号 ${question.questionNo}）`}
          </h2>
          <p className="text-sm font-medium text-red-700">历史答错 {count} 次</p>
        </div>
        {(load.status === 'ready' || load.status === 'missing') && (
          <button type="button" onClick={onDone} className="rounded-lg bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-800">
            标记完成
          </button>
        )}
      </div>

      {load.status === 'loading' && <p role="status" className="text-gray-600">正在加载题目…</p>}
      {load.status === 'missing' && <p className="text-gray-600">这道题的详情已不可用。</p>}
      {load.status === 'error' && (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-red-700">题目加载失败</p>
          <button type="button" className="text-blue-700 underline" onClick={() => {
            setLoad({ status: 'loading' })
            setRetry(attempt => attempt + 1)
          }}>
            重试
          </button>
        </div>
      )}

      {question && (
        <>
          <QuestionContentRenderer content={question.stem} className="mb-5 text-gray-900" />
          <div className="space-y-3">
            {options.map(option => (
              <QuestionOption
                key={option.originalKey}
                option={option}
                questionType={question.type}
                isSelected={selected.includes(option.originalKey)}
                isCorrect={question.answer.includes(option.originalKey)}
                showAnswer={showAnswer}
                disabled={showAnswer}
                optionExplanation={question.optionExplanations?.find(item => item.label === option.originalKey)?.content}
                onChange={key => setSelected(answers => question.type === 'MULTIPLE'
                  ? (answers.includes(key) ? answers.filter(answer => answer !== key) : [...answers, key])
                  : [key])}
              />
            ))}
          </div>
          {showAnswer ? (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-blue-900">
              {options.length === 0 && <p>正确答案：{question.answer.join('、')}</p>}
              {question.explanation && (
                <QuestionContentRenderer
                  content={remapExplanationOptionLabels(question.explanation, options.map(option => option.originalKey))}
                  className="text-blue-900"
                />
              )}
              {options.length > 0 && !question.explanation && <p>正确答案已用绿色标出。</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setShowAnswer(true)} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
              查看答案
            </button>
          )}
        </>
      )}
    </section>
  )
}

function MistakeReview() {
  const { getExamHistory } = useExamSession()
  const [doneIds, setDoneIds] = useState(readDoneIds)
  const [currentId, setCurrentId] = useState<string>()
  const [saveFailed, setSaveFailed] = useState(false)

  const counts = new Map<string, number>()
  for (const exam of getExamHistory()) {
    for (const result of exam.questions ?? []) {
      if (!result.isCorrect && !doneIds.has(result.id)) {
        counts.set(result.id, (counts.get(result.id) ?? 0) + 1)
      }
    }
  }

  const mistakes = [...counts.entries()]
  const currentIndex = Math.max(0, mistakes.findIndex(([id]) => id === currentId))
  const active = mistakes[currentIndex]

  function markDone(activeId: string) {
    const updated = new Set(doneIds).add(activeId)
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([...updated]))
      setDoneIds(updated)
      setCurrentId((mistakes[currentIndex + 1] ?? mistakes[currentIndex - 1])?.[0])
      setSaveFailed(false)
    } catch {
      setSaveFailed(true)
    }
  }

  if (!active) {
    return <p className="rounded-lg bg-white p-6 text-gray-600 shadow-md">没有待复习的错题。</p>
  }

  const [activeId, count] = active

  return (
    <>
      <nav aria-label="错题导航" className="mb-6 rounded-lg bg-white p-5 shadow-md sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">待复习 · {mistakes.length} 题</h2>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {mistakes.map(([id], index) => (
            <button
              type="button"
              key={id}
              aria-label={`第 ${index + 1} 题`}
              aria-current={id === activeId ? 'true' : undefined}
              onClick={() => setCurrentId(id)}
              className={`aspect-square rounded-lg text-sm font-medium ${id === activeId
                ? 'bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </nav>
      {saveFailed && <p role="alert" className="mb-3 text-red-700">无法保存完成状态，请重试。</p>}
      <MistakeQuestion key={activeId} id={activeId} position={currentIndex + 1} count={count} onDone={() => markDone(activeId)} />
    </>
  )
}

export default function ExamMistakesPage() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/exam" className="text-gray-600 hover:text-gray-900">← 返回考试中心</Link>
          <h1 className="text-2xl font-bold text-gray-900">错题汇总</h1>
        </header>
        {hydrated ? <MistakeReview /> : <p role="status" className="text-gray-600">正在读取考试历史…</p>}
      </div>
    </main>
  )
}
