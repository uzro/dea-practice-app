import OpenAI from 'openai'
import type { Question } from '@/types/question'
import { AI_EXPLANATION_MARKER } from '@/lib/question-explanation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export function buildQuestionExplanationPrompt(question: Pick<Question, 'stem' | 'options' | 'answer' | 'type'>) {
  let questionContent = `题目: ${question.stem}\n\n`

  if (question.options && question.options.length > 0) {
    questionContent += '选项:\n'
    question.options.forEach((option) => {
      const isCorrect = question.answer.includes(option.key)
      questionContent += `${option.key}. ${option.text} ${isCorrect ? '[正确答案]' : '[错误选项]'}\n`
    })
  }

  if (question.type) {
    const typeMap = {
      SINGLE: '单选题',
      MULTIPLE: '多选题',
      TRUE_FALSE: '判断题',
      TEXT: '主观题',
    }

    questionContent += `\n题目类型: ${typeMap[question.type]}\n`
  }

  return questionContent
}

export type OptionExplanationItem = {
  label: string
  content: string
  isCorrect: boolean
}

function normalizeOptionLabel(value: string): string {
  return value.trim().toUpperCase().replace(/^[\s\[(（【]+|[\s\])）】.:、．。]+$/g, '')
}

function parseOptionExplanationsResponse(content: string): OptionExplanationItem[] {
  const tryParse = (value: string): unknown => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const parsed = tryParse(content)
  if (Array.isArray(parsed)) {
    return parsed as OptionExplanationItem[]
  }

  const jsonArrayMatch = content.match(/\[[\s\S]*\]/)
  if (jsonArrayMatch) {
    const recovered = tryParse(jsonArrayMatch[0])
    if (Array.isArray(recovered)) {
      return recovered as OptionExplanationItem[]
    }
  }

  throw new Error('AI返回的选项解析格式无效')
}

export async function generateQuestionOptionExplanations(
  question: Pick<Question, 'stem' | 'options' | 'answer' | 'type'>
): Promise<OptionExplanationItem[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API密钥未配置')
  }

  if (!question?.stem || !Array.isArray(question.options) || question.options.length === 0) {
    throw new Error('题目或选项数据不完整')
  }

  const optionKeys = question.options.map(option => normalizeOptionLabel(option.key))
  const optionKeySet = new Set(optionKeys)
  const answerSet = new Set((question.answer || []).map(answer => normalizeOptionLabel(answer)))

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `你是DEA考试专家。请为每个选项分别生成简短解析，输出必须是JSON数组。\n\n要求：\n1. 严格返回JSON数组，不要返回其他文字\n2. 每个元素必须有字段：label, content, isCorrect\n3. label必须是选项字母（如A/B/C）\n4. content使用中文，20-80字，说明该选项为什么对/错\n5. isCorrect为布尔值\n6. 仅使用题目中出现的选项label`,
      },
      {
        role: 'user',
        content: `题目：${question.stem}\n\n题型：${question.type}\n\n选项：\n${question.options
          .map(option => `${option.key}. ${option.text}`)
          .join('\n')}\n\n正确答案：${(question.answer || []).join(', ')}\n\n请输出JSON数组。`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  })

  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('AI未返回选项解析内容')
  }

  const parsedItems = parseOptionExplanationsResponse(content)

  const byLabel = new Map<string, OptionExplanationItem>()
  for (const item of parsedItems) {
    const label = normalizeOptionLabel(String(item?.label ?? ''))
    const parsedContent = String(item?.content ?? '').trim()

    if (!label || !optionKeySet.has(label) || !parsedContent) {
      continue
    }

    byLabel.set(label, {
      label,
      content: parsedContent,
      isCorrect: Boolean(item?.isCorrect ?? answerSet.has(label)),
    })
  }

  return optionKeys
    .filter(label => byLabel.has(label))
    .map(label => {
      const item = byLabel.get(label)
      return {
        label,
        content: item?.content || '',
        isCorrect: item?.isCorrect ?? answerSet.has(label),
      }
    })
}

export async function generateQuestionExplanation(
  question: Pick<Question, 'stem' | 'options' | 'answer' | 'type'>
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API密钥未配置')
  }

  if (!question?.stem) {
    throw new Error('题目数据不完整')
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `你是专业的DEA（Databricks认证数据工程师）考试专家。请为给定的考试题目生成精炼的解析。

解析格式要求：
1. 使用纯文本格式，避免使用markdown语法（如**粗体**、•符号等）
2. 首行说明正确答案及原因（格式：✓ 正确答案：X - 原因描述）
3. 然后逐一分析错误选项：
   - 格式：✗ 选项X：错误原因，适用场景说明
   - 为什么在当前题目语境下不正确
   - 如果该选项/概念在其他场景下有效，简述适用场景
4. 严格控制总字数在180字内
5. 使用简洁专业的中文表述
6. 专注于Databricks、Spark、数据工程技术要点

输出示例：
✓ 正确答案：A - 在Spark SQL中使用broadcast hint可以优化小表连接性能

✗ 选项B：Cache()不适用于此场景的性能优化，但在重复使用同一DataFrame时有效
✗ 选项C：Repartition会增加shuffle开销，适用于数据倾斜场景
✗ 选项D：此选项描述错误，persist()需要指定存储级别

注意：使用简单符号✓✗，避免复杂格式化。如果是多选题或主观题，相应调整格式。`,
      },
      {
        role: 'user',
        content: `请为以下题目生成精炼解析：\n\n${buildQuestionExplanationPrompt(question)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })

  const explanation = completion.choices[0]?.message?.content?.trim()

  if (!explanation) {
    throw new Error('AI生成解析失败')
  }

  return explanation
}

export { AI_EXPLANATION_MARKER }
