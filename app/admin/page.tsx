export default function AdminDashboard() {
  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">管理员Dashboard</h1>

      {/* Temporary simple content */}
      <div className="bg-white overflow-hidden shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🎉 认证成功！
        </h2>
        <p className="text-gray-600 mb-4">
          您已经成功登录管理员后台。
        </p>
        <p className="text-gray-600">
          接下来可以实现PDF上传和题目管理功能。
        </p>
      </div>
    </div>
  )
}