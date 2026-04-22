'use client'

import Link from "next/link"
import { useState } from "react"

export default function Exam() {
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 导航栏 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 返回首页
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">考试模式</h1>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-red-900 mb-2">考试模式说明</h2>
          <p className="text-red-700">
            考试模式模拟真实考试环境，限时作答，完成后统一查看成绩和解析。
          </p>
        </div>

        {/* 考试类型选择 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 模拟考试 */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border">
            <div className="text-blue-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">完整模拟考试</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>• 60道题目</p>
              <p>• 120分钟时限</p>
              <p>• 模拟真实考试环境</p>
              <p>• 全面考核知识点</p>
            </div>
            <button 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => {
                setSelectedExamType('full')
                alert('功能开发中...')
              }}
            >
              开始考试
            </button>
          </div>

          {/* 快速考试 */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border">
            <div className="text-green-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">快速考试</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>• 20道题目</p>
              <p>• 30分钟时限</p>
              <p>• 快速检验学习效果</p>
              <p>• 随机抽取题目</p>
            </div>
            <button 
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              onClick={() => {
                setSelectedExamType('quick')
                alert('功能开发中...')
              }}
            >
              开始考试
            </button>
          </div>

          {/* 主题考试 */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border">
            <div className="text-purple-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4l-4 4m4-4v8m-14-8l4 4M5 7v8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">主题专项考试</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p>• 选择特定主题</p>
              <p>• 15-25道题目</p>
              <p>• 针对性考核</p>
              <p>• 深入理解知识点</p>
            </div>
            <button 
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              onClick={() => {
                setSelectedExamType('topic')
                alert('功能开发中...')
              }}
            >
              选择主题
            </button>
          </div>
        </div>

        {/* 考试历史 */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">考试历史</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm">
              查看全部
            </button>
          </div>
          
          {/* 暂无数据状态 */}
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 mb-2">暂无考试记录</p>
            <p className="text-gray-400 text-sm">完成考试后，您的成绩和历史记录将在这里显示</p>
          </div>
        </div>

        {/* 考试须知 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">考试须知</h3>
          <div className="text-yellow-700 space-y-2">
            <p>• 考试开始后不能暂停，请确保有足够的时间完成</p>
            <p>• 每道题只能作答一次，提交后不可修改</p>
            <p>• 考试结束后将显示详细的成绩报告和答案解析</p>
            <p>• 建议在网络稳定的环境下进行考试</p>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-8 text-center">
          <p className="text-gray-500">
            建议您在练习模式中充分练习后再进行考试模式，以获得更好的考试体验
          </p>
        </div>
      </div>
    </div>
  )
}