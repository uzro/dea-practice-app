import { z } from 'zod'

// Question type definition based on AGENTS.md specification
export type Question = {
  id: string
  exam: string

  sourcePdf?: string
  sourcePageStart?: number
  sourcePageEnd?: number

  questionNo?: string

  type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "TEXT"

  stem: string

  options?: {
    key: string
    text: string
  }[]

  answer: string[]

  explanation?: string

  difficulty?: "EASY" | "MEDIUM" | "HARD"

  tags?: string[]

  status: "PENDING" | "APPROVED" | "REJECTED"

  createdAt: string
  updatedAt: string
}

// Zod schema for runtime validation
export const QuestionSchema = z.object({
  id: z.string(),
  exam: z.string(),
  sourcePdf: z.string().optional(),
  sourcePageStart: z.number().optional(),
  sourcePageEnd: z.number().optional(),
  questionNo: z.string().optional(),
  type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE", "TEXT"]),
  stem: z.string().min(1, "Question stem is required"),
  options: z.array(z.object({
    key: z.string(),
    text: z.string()
  })).optional(),
  answer: z.array(z.string()).min(1, "At least one answer is required"),
  explanation: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Schema for creating new questions (without id, timestamps, status)
export const CreateQuestionSchema = QuestionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
})

// Schema for updating questions
export const UpdateQuestionSchema = CreateQuestionSchema.partial()

export type CreateQuestion = z.infer<typeof CreateQuestionSchema>
export type UpdateQuestion = z.infer<typeof UpdateQuestionSchema>