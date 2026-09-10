import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증 없이 접근 허용할 경로 접두사
const PUBLIC_PATHS = ['/login', '/_next', '/api', '/favicon.ico'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 인증 쿠키 확인:
  // 1) 클라이언트 auth-token 쿠키
  // 2) Supabase auth 쿠키 (sb-*-auth-token)
  const hasAuthToken =
    request.cookies.has('auth-token') ||
    request.cookies.has('mock-auth-token') ||
    [...request.cookies.getAll()].some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!hasAuthToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
