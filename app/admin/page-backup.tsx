import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import Link from 'next/link'

interface DashboardStats {
  totalQuestions: number
  pendingQuestions: number
  approvedQuestions: number
  rejectedQuestions: number
  activeJobs: number
  completedJobs: number
  failedJobs: number
}

async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalQuestions,
    pendingQuestions,
    approvedQuestions,
    rejectedQuestions,
    activeJobs,
    completedJobs,
    failedJobs,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { status: 'PENDING' } }),
    prisma.question.count({ where: { status: 'APPROVED' } }),
    prisma.question.count({ where: { status: 'REJECTED' } }),
    prisma.processingJob.count({ 
      where: { status: { in: ['UPLOADING', 'PROCESSING'] } } 
    }),
    prisma.processingJob.count({ where: { status: 'COMPLETED' } }),
    prisma.processingJob.count({ where: { status: 'FAILED' } }),
  ])

  return {
    totalQuestions,
    pendingQuestions,
    approvedQuestions,
    rejectedQuestions,
    activeJobs,
    completedJobs,
    failedJobs,
  }
}

async function getRecentJobs() {
  return await prisma.processingJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'bg-blue-500',
  href 
}: { 
  title: string
  value: number
  icon: string
  color?: string
  href?: string
}) {
  const content = (
    <div className={`${color} rounded-lg p-6 text-white`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-white/80 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-semibold text-white">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block hover:scale-105 transition-transform">
        {content}
      </Link>
    )
  }

  return content
}

async function DashboardContent() {
  const stats = await getDashboardStats()
  const recentJobs = await getRecentJobs()

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Questions"
          value={stats.totalQuestions}
          icon="📊"
          color="bg-blue-500"
          href="/admin/questions"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingQuestions}
          icon="⏳"
          color="bg-yellow-500"
          href="/admin/review"
        />
        <StatCard
          title="Approved"
          value={stats.approvedQuestions}
          icon="✅"
          color="bg-green-500"
          href="/admin/questions?status=approved"
        />
        <StatCard
          title="Active Processing"
          value={stats.activeJobs}
          icon="⚙️"
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/upload"
                className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                📄 Upload New PDF
              </Link>
              {stats.pendingQuestions > 0 && (
                <Link
                  href="/admin/review"
                  className="block w-full bg-yellow-600 text-white text-center py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors"
                >
                  ✅ Review {stats.pendingQuestions} Pending Questions
                </Link>
              )}
              <Link
                href="/admin/questions"
                className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                📚 Manage Question Bank
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Processing Jobs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Processing Jobs
            </h3>
            {recentJobs.length === 0 ? (
              <p className="text-gray-500 text-sm">No processing jobs yet</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {job.status === 'COMPLETED' && <span className="text-green-500">✅</span>}
                      {job.status === 'FAILED' && <span className="text-red-500">❌</span>}
                      {job.status === 'PROCESSING' && <span className="text-blue-500">⚙️</span>}
                      {job.status === 'UPLOADING' && <span className="text-yellow-500">📤</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {job.filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {job.status.toLowerCase()} • {job.questionsExtracted} questions
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {job.progress}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Processing Success Rate</h4>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.completedJobs + stats.failedJobs === 0 
              ? 'N/A' 
              : Math.round((stats.completedJobs / (stats.completedJobs + stats.failedJobs)) * 100) + '%'
            }
          </p>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Approval Rate</h4>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.approvedQuestions + stats.rejectedQuestions === 0 
              ? 'N/A' 
              : Math.round((stats.approvedQuestions / (stats.approvedQuestions + stats.rejectedQuestions)) * 100) + '%'
            }
          </p>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Total Processing Jobs</h4>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.activeJobs + stats.completedJobs + stats.failedJobs}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="px-4 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}