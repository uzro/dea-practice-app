import { z } from 'zod'

// ProcessingJob type definition for tracking PDF upload and processing
export type ProcessingJob = {
  id: string
  filename: string
  fileUrl: string
  status: "uploading" | "processing" | "completed" | "failed"
  progress: number
  questionsExtracted: number
  error?: string
  createdAt: string
  updatedAt: string
}

// Zod schema for runtime validation
export const ProcessingJobSchema = z.object({
  id: z.string(),
  filename: z.string().min(1, "Filename is required"),
  fileUrl: z.string().url("Valid file URL is required"),
  status: z.enum(["uploading", "processing", "completed", "failed"]),
  progress: z.number().min(0).max(100),
  questionsExtracted: z.number().min(0).default(0),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Schema for creating new processing jobs
export const CreateProcessingJobSchema = ProcessingJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  progress: true,
  questionsExtracted: true,
  status: true,
})

// Schema for updating processing jobs
export const UpdateProcessingJobSchema = z.object({
  status: z.enum(["uploading", "processing", "completed", "failed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  questionsExtracted: z.number().min(0).optional(),
  error: z.string().optional(),
})

export type CreateProcessingJob = z.infer<typeof CreateProcessingJobSchema>
export type UpdateProcessingJob = z.infer<typeof UpdateProcessingJobSchema>

// Helper function to create a new processing job
export function createProcessingJob(
  filename: string,
  fileUrl: string,
  overrides?: Partial<CreateProcessingJob>
): CreateProcessingJob {
  return {
    filename,
    fileUrl,
    status: "uploading",
    progress: 0,
    questionsExtracted: 0,
    ...overrides,
  }
}