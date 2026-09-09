import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      return NextResponse.json(
        { success: false, error: '管理员登录未配置' },
        { status: 503 }
      )
    }

    const { password } = await request.json()

    if (typeof password === 'string' && password === expectedPassword) {
      return NextResponse.json({
        success: true
      })
    } else {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    )
  }
}
