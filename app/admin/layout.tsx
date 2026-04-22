'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

interface AdminLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Upload PDF', href: '/admin/upload', icon: '📄' },
  { name: 'Review Questions', href: '/admin/review', icon: '✅' },
  { name: 'Question Bank', href: '/admin/questions', icon: '📚' },
]

// Cookie helper functions
function getCookie(name: string): string | null {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`
}

function isAuthValid(): boolean {
  const authCookie = getCookie('admin-auth')
  const loginTime = getCookie('admin-login-time')
  
  if (!authCookie || authCookie !== 'authenticated' || !loginTime) {
    return false
  }
  
  // Check if login is within 7 days (7 * 24 * 60 * 60 * 1000 ms)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  const loginTimestamp = parseInt(loginTime, 10)
  
  if (loginTimestamp < sevenDaysAgo) {
    // Login expired, clean up
    deleteCookie('admin-auth')
    deleteCookie('admin-login-time')
    return false
  }
  
  return true
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setIsLoading(false)
      return
    }

    // Check both cookie and sessionStorage for authentication
    const sessionLoggedIn = sessionStorage.getItem('admin-logged-in')
    const cookieValid = isAuthValid()
    
    if (sessionLoggedIn === 'true' || cookieValid) {
      setIsAuthenticated(true)
      // Ensure sessionStorage is set if cookie is valid
      if (!sessionLoggedIn && cookieValid) {
        sessionStorage.setItem('admin-logged-in', 'true')
      }
    } else {
      router.push('/admin/login?redirect=' + encodeURIComponent(pathname))
    }
    setIsLoading(false)
  }, [pathname, router])

  const handleLogout = () => {
    // Clear both sessionStorage and cookies
    sessionStorage.removeItem('admin-logged-in')
    deleteCookie('admin-auth')
    deleteCookie('admin-login-time')
    window.location.href = '/admin/login'
  }

  // Show login page without protection
  if (pathname === '/admin/login') {
    return children
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查登录状态...</p>
        </div>
      </div>
    )
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  DEA练习管理后台
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm inline-flex items-center space-x-2`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}