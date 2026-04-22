import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* 欢迎标题 */}
          <div className="mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              DEA 练习平台
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-4">
              Databricks Certified Data Engineer Associate
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              通过系统化练习和模拟考试，提升您的数据工程技能，顺利通过 Databricks 认证考试
            </p>
          </div>

          {/* 功能卡片 */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* 做题模式 */}
            <Link href="/practice" className="group">
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 group-hover:border-blue-300">
                <div className="text-blue-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">做题模式</h2>
                <p className="text-gray-600 mb-6">
                  逐步练习，分类学习，巩固基础知识点
                </p>
                <ul className="text-sm text-gray-500 text-left space-y-2 mb-6">
                  <li>• 按主题分类练习</li>
                  <li>• 即时查看答案和解析</li>
                  <li>• 错题收集和复习</li>
                  <li>• 学习进度跟踪</li>
                </ul>
                <div className="inline-flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                  开始练习
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* 考试模式 */}
            <Link href="/exam" className="group">
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 group-hover:border-green-300">
                <div className="text-green-600 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">考试模式</h2>
                <p className="text-gray-600 mb-6">
                  模拟真实考试环境，检验学习成果
                </p>
                <ul className="text-sm text-gray-500 text-left space-y-2 mb-6">
                  <li>• 限时模拟考试</li>
                  <li>• 真实考试体验</li>
                  <li>• 成绩分析报告</li>
                  <li>• 薄弱环节识别</li>
                </ul>
                <div className="inline-flex items-center text-green-600 font-medium group-hover:text-green-700">
                  开始考试
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* 底部链接 */}
          <div className="text-center">
            <p className="text-gray-500 mb-4">
              管理员？
            </p>
            <Link 
              href="/admin/login" 
              className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
            >
              管理后台入口
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
