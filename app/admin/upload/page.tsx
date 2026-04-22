'use client'

import { useState, useRef, DragEvent, useEffect } from 'react'

interface ProcessingJob {
  id: string
  filename: string
  status: string
  progress: number
  questionsExtracted: number
  error?: string
  createdAt: string
}

export default function AdminUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([])
  const [error, setError] = useState('')
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load processing jobs on component mount
  useEffect(() => {
    loadProcessingJobs()
  }, [])

  // Poll for job updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (processingJobs.some(job => job.status === 'uploading' || job.status === 'processing')) {
        loadProcessingJobs()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [processingJobs])

  const loadProcessingJobs = async () => {
    try {
      const response = await fetch('/api/admin/jobs')
      const data = await response.json()
      
      if (data.success) {
        setProcessingJobs(data.jobs)
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setIsLoadingJobs(false)
    }
  }

  const validatePDFFile = (file: File): boolean => {
    // Check file type
    if (file.type !== 'application/pdf') {
      setError('请上传PDF文件')
      return false
    }
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('PDF文件太大，请上传小于50MB的文件')
      return false
    }
    return true
  }

  const handleFileSelect = (file: File) => {
    setError('')
    if (validatePDFFile(file)) {
      setUploadedFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const uploadPDF = async () => {
    if (!uploadedFile) return
    
    setIsUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Add new processing job to list and refresh jobs
        setProcessingJobs(prev => [result.job, ...prev])
        setUploadedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Refresh jobs list to get latest status
        setTimeout(() => loadProcessingJobs(), 1000)
      } else {
        setError(result.error || '上传失败')
      }
    } catch (error) {
      setError('上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const deleteJob = async (jobId: string, filename: string) => {
    if (!confirm(`确定要删除处理记录"${filename}"吗？这将无法恢复。`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/jobs?id=${jobId}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Remove job from local state
        setProcessingJobs(prev => prev.filter(job => job.id !== jobId))
      } else {
        setError(result.error || '删除失败')
      }
    } catch (error) {
      setError('删除失败，请重试')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'text-blue-600'
      case 'processing': return 'text-yellow-600'
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return '上传中'
      case 'processing': return '处理中'
      case 'completed': return '完成'
      case 'failed': return '失败'
      default: return status
    }
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">PDF上传</h1>
      
      {/* Upload Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📄 上传DEA考试PDF
        </h2>
        <p className="text-gray-600 mb-6">
          将PDF文件拖拽到下方区域或点击选择文件，系统将自动提取考试题目。
        </p>
        
        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📁</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                拖拽 PDF 文件到这里
              </p>
              <p className="text-sm text-gray-500">
                或者 <span className="text-blue-600 cursor-pointer">点击选择文件</span>
              </p>
            </div>
            <p className="text-xs text-gray-400">
              支持最大 50MB 的 PDF 文件
            </p>
          </div>
        </div>
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {/* Selected File Info */}
        {uploadedFile && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📄</div>
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-red-600 hover:text-red-700"
                >
                  取消
                </button>
                <button
                  onClick={uploadPDF}
                  disabled={isUploading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? '上传中...' : '开始上传'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
      
      {/* Processing Jobs List */}
      {(processingJobs.length > 0 || isLoadingJobs) && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">处理历史</h3>
          </div>
          {isLoadingJobs ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">加载处理历史...</p>
            </div>
          ) : processingJobs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">暂无处理记录</p>
            </div>
          ) : (
          <div className="divide-y divide-gray-200">
            {processingJobs.map((job) => (
              <div key={job.id} className="px-6 py-4 hover:bg-gray-50 group relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">📄</div>
                    <div>
                      <p className="font-medium text-gray-900">{job.filename}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={`font-medium ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </p>
                      {job.status === 'processing' && (
                        <p className="text-sm text-gray-500">
                          进度: {job.progress}%
                        </p>
                      )}
                      {job.status === 'completed' && (
                        <p className="text-sm text-green-600">
                          提取了 {job.questionsExtracted} 道题
                        </p>
                      )}
                      {job.error && (
                        <p className="text-sm text-red-600">{job.error}</p>
                      )}
                    </div>
                    {/* 删除按钮 - hover时显示 */}
                    <button
                      onClick={() => deleteJob(job.id, job.filename)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-red-100 text-red-600"
                      title="删除记录"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {job.status === 'processing' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  )
}