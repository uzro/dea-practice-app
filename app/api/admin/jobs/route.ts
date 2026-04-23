import { NextRequest, NextResponse } from 'next/server'
import type { ProcessingJob } from '@prisma/client'
import { prisma } from '../../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')
    
    if (jobId) {
      // Get specific job
      const job = await prisma.processingJob.findUnique({
        where: { id: jobId }
      })
      
      if (!job) {
        return NextResponse.json(
          { success: false, error: '任务未找到' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        job: {
          ...job,
          status: job.status.toLowerCase(),
        }
      })
    } else {
      // Get all jobs, most recent first
      const jobs = await prisma.processingJob.findMany({
        orderBy: { createdAt: 'desc' }
      })
      
      return NextResponse.json({
        success: true,
        jobs: jobs.map((job: ProcessingJob) => ({
          ...job,
          status: job.status.toLowerCase(),
        }))
      })
    }
  } catch (error) {
    console.error('Jobs API error:', error)
    return NextResponse.json(
      { success: false, error: '获取任务状态失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/jobs?id=<jobId> - 删除处理任务
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      )
    }

    // 删除任务
    const deletedJob = await prisma.processingJob.delete({
      where: { id: jobId }
    })

    console.log(`🗑️ 已删除处理任务: ${deletedJob.filename}`)

    return NextResponse.json({
      success: true,
      message: '任务已删除'
    })
  } catch (error: any) {
    console.error('Delete job error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '任务未找到' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    )
  }
}