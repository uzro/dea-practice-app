import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api'

// 设置worker路径
if (typeof window === 'undefined') {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
}

export interface PDFParseResult {
  success: boolean
  text: string
  pageCount: number
  error?: string
}

export async function extractTextFromPDF(file: File): Promise<PDFParseResult> {
  try {
    // 将File转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // 加载PDF文档
    const pdf = await getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages
    
    let fullText = ''
    
    // 遍历所有页面提取文本
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // 提取每页的文本
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ')
      
      fullText += `\n--- 第${pageNum}页 ---\n${pageText}\n`
    }
    
    return {
      success: true,
      text: fullText.trim(),
      pageCount
    }
  } catch (error) {
    console.error('PDF解析失败:', error)
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function extractTextFromBuffer(buffer: ArrayBuffer): Promise<PDFParseResult> {
  try {
    const pdf = await getDocument({ data: buffer }).promise
    const pageCount = pdf.numPages
    
    let fullText = ''
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ')
      
      fullText += `\n--- 第${pageNum}页 ---\n${pageText}\n`
    }
    
    return {
      success: true,
      text: fullText.trim(),
      pageCount
    }
  } catch (error) {
    console.error('PDF解析失败:', error)
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}