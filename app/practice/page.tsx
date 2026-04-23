'use client'

import Link from "next/link"

export default function Practice() {
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
            <h1 className="text-3xl font-bold text-gray-900">做题模式</h1>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">练习模式说明</h2>
          <p className="text-blue-700">
            在做题模式中，您可以按照自己的节奏学习，即时查看答案和详细解析，巩固知识点。
          </p>
        </div>

        {/* 练习选项 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* 顺序练习 */}
          <Link href="/practice/sequential" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 border group-hover:border-red-300">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">顺序练习</h3>
              <p className="text-gray-600 mb-6">
                按题号顺序练习，从第1题开始，系统性学习
              </p>
              <div className="inline-flex items-center text-red-600 font-medium group-hover:text-red-700">
                立即开始
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 随机练习 */}
          <Link href="/practice/random" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-6 border group-hover:border-green-300">
              <div className="text-green-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">随机练习</h3>
              <p className="text-gray-600 mb-6">
                随机顺序练习题目，增加挑战性和灵活性
              </p>
              <div className="inline-flex items-center text-green-600 font-medium group-hover:text-green-700">
                开始练习
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 按主题练习 */}
          <div className="bg-gray-100 rounded-lg p-6 border opacity-60 cursor-not-allowed">
            <div className="text-blue-400 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4l-4 4m4-4v8m-14-8l4 4M5 7v8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-3">按主题练习</h3>
            <p className="text-gray-500 mb-6">
              选择特定的知识主题进行集中练习
            </p>
            <div className="text-gray-500 font-medium">
              功能开发中...
            </div>
          </div>
        </div>

        {/* 即将推出的功能 */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">即将推出</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-100 rounded-lg p-4 opacity-60 cursor-not-allowed">
              <h3 className="font-medium text-gray-700 mb-2">错题重做</h3>
              <p className="text-sm text-gray-600">重新练习答错的题目</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 opacity-60 cursor-not-allowed">
              <h3 className="font-medium text-gray-700 mb-2">收藏题目</h3>
              <p className="text-sm text-gray-600">复习收藏的重要题目</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 opacity-60 cursor-not-allowed">
              <h3 className="font-medium text-gray-700 mb-2">学习统计</h3>
              <p className="text-sm text-gray-600">查看学习进度和数据</p>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            提示：做题模式支持即时查看答案解析，帮助您更好地理解知识点
          </p>
        </div>
      </div>
    </div>
  )
}