import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123'
    
    console.log('Expected password:', expectedPassword, 'Received password:', password)
    
    if (password === expectedPassword) {
      return NextResponse.json({ 
        success: true
      })
    } else {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    )
  }
}