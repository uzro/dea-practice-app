import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const db =
  globalThis.prisma ??
  new PrismaClient({ adapter })

export const prisma = db

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db

// Helper functions for common database operations

export async function getQuestionsByStatus(status: 'pending' | 'approved' | 'rejected') {
  return await prisma.question.findMany({
    where: { status: status.toUpperCase() as any },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getApprovedQuestionsByExam(exam: string) {
  return await prisma.question.findMany({
    where: { 
      exam,
      status: 'APPROVED'
    },
    orderBy: { questionNo: 'asc' }
  })
}

export async function getProcessingJobs() {
  return await prisma.processingJob.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function getActiveProcessingJobs() {
  return await prisma.processingJob.findMany({
    where: {
      status: {
        in: ['UPLOADING', 'PROCESSING']
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function updateProcessingJobProgress(
  id: string, 
  progress: number, 
  questionsExtracted?: number
) {
  return await prisma.processingJob.update({
    where: { id },
    data: {
      progress,
      ...(questionsExtracted !== undefined && { questionsExtracted }),
      updatedAt: new Date()
    }
  })
}

export async function completeProcessingJob(id: string, questionsExtracted: number) {
  return await prisma.processingJob.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      progress: 100,
      questionsExtracted,
      updatedAt: new Date()
    }
  })
}

export async function failProcessingJob(id: string, error: string) {
  return await prisma.processingJob.update({
    where: { id },
    data: {
      status: 'FAILED',
      error,
      updatedAt: new Date()
    }
  })
}