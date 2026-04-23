import { put, del } from '@vercel/blob'

export interface UploadResponse {
  url: string
  pathname: string
  contentType: string
  contentDisposition: string
}

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadFile(
  file: File,
  pathname: string
): Promise<UploadResponse> {
  try {
    const blob = await put(pathname, file, {
      access: 'public',
    })

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType || '',
      contentDisposition: blob.contentDisposition || ''
    }
  } catch (error) {
    console.error('Failed to upload file:', error)
    throw new Error('File upload failed')
  }
}

/**
 * Upload a PDF file with automatic naming
 */
export async function uploadPDF(file: File): Promise<UploadResponse> {
  if (!file.type.includes('pdf')) {
    throw new Error('Only PDF files are allowed')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = file.name.replace(/\.[^/.]+$/, '') // Remove extension
  const pathname = `pdfs/${timestamp}-${filename}.pdf`

  return uploadFile(file, pathname)
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    await del(url)
  } catch (error) {
    console.error('Failed to delete file:', error)
    throw new Error('File deletion failed')
  }
}

/**
 * Get file metadata from blob URL
 */
export function getFileInfo(url: string) {
  const urlObj = new URL(url)
  const pathname = urlObj.pathname
  const filename = pathname.split('/').pop() || ''
  const extension = filename.split('.').pop() || ''

  return {
    pathname,
    filename,
    extension,
    isValidPDF: extension.toLowerCase() === 'pdf'
  }
}

/**
 * Validate file before upload
 */
export function validatePDFFile(file: File) {
  const errors: string[] = []
  
  // Check file type
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    errors.push('File must be a PDF')
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB')
  }

  // Check if file is not empty
  if (file.size === 0) {
    errors.push('File cannot be empty')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}