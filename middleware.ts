import { NextRequest, NextResponse } from 'next/server'

// Temporarily disable all middleware for testing
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: []
}