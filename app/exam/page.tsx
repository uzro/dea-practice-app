'use client'

import Link from "next/link"
import { useExamSession } from '@/hooks/useExamSession'

export default function Exam() {
  const { currentExam, getExamHistory, clearExamHistory, deleteExamRecord } = useExamSession()
  const examHistory = getExamHistory()
  
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">考试模式说明</h2>
          <p className="text-blue-700">
            在考试模式中，题目将随机出现，答题过程中无法查看答案，需要完成全部题目并提交后才能看到成绩和解析。考试结果将被记录到考试历史中。
          </p>
        </div>

        {/* 进行中的考试提示 */}
        {currentExam && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">有正在进行的考试</h3>
                <p className="text-yellow-700 mb-3">
                  您有一个{currentExam.type === 'quick' ? '快速考试' : '完整考试'}正在进行中
                  （已答 {currentExam.questionsAnswered}/{currentExam.totalQuestions} 题）
                </p>
                <div className="flex space-x-3">
                  <Link 
                    href={`/exam/${currentExam.type}`}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    继续考试
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 考试选项 */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* 快速考试 */}
          <Link href="/exam/quick" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-8 border group-hover:border-orange-300">
              <div className="text-orange-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">快速考试</h3>
              <p className="text-gray-600 mb-4">
                20道随机题目，适合快速检测学习效果
              </p>
              <div className="text-sm text-gray-500 mb-4">
                • 考试时间：40分钟<br/>
                • 题目数量：20题<br/>
                • 题目顺序：随机<br/>
                • 通过标准：70%正确率
              </div>
              <div className="inline-flex items-center text-orange-600 font-medium group-hover:text-orange-700">
                开始快速考试
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 完整考试 */}
          <Link href="/exam/full" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 p-8 border group-hover:border-purple-300">
              <div className="text-purple-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">完整考试</h3>
              <p className="text-gray-600 mb-4">
                45道随机题目，模拟真实考试环境
              </p>
              <div className="text-sm text-gray-500 mb-4">
                • 考试时间：90分钟<br/>
                • 题目数量：45题<br/>
                • 题目顺序：随机<br/>
                • 通过标准：70%正确率
              </div>
              <div className="inline-flex items-center text-purple-600 font-medium group-hover:text-purple-700">
                开始完整考试
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* 考试历史 */}
        {examHistory.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">考试历史</h2>
              <button
                onClick={() => {
                  if (confirm('确定要清空所有考试历史吗？此操作不可恢复。')) {
                    clearExamHistory()
                  }
                }}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                清空历史
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="divide-y divide-gray-200">
                {examHistory.slice(0, 5).map((result, index) => (
                  <div key={result.examId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          result.score >= 70 ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {result.type === 'quick' ? '快速考试' : '完整考试'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(result.completedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`font-bold ${
                            result.score >= 70 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.score}分
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.correctAnswers}/{result.totalQuestions}题正确
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/exam/review/${result.examId}`}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            查看详情
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除这条考试记录吗？')) {
                                deleteExamRecord(result.examId)
                              }
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {examHistory.length > 5 && (
                <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                  还有 {examHistory.length - 5} 次考试记录...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            提示：考试模式采用计时制，建议在安静的环境中进行。通过标准为70%正确率。
          </p>
        </div>
      </div>
    </div>
  )
}