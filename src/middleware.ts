import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_must_be_changed_in_production_32_chars';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (request.nextUrl.pathname.startsWith('/chat')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, encodedSecret);
    } catch (err) {
      // Недійсний або прострочений токен
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Якщо користувач вже залогінений, але намагається зайти на /login чи /register, можна теж зробити редірект
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
    if (token) {
      try {
        await jwtVerify(token, encodedSecret);
        const homeUrl = new URL('/', request.url);
        return NextResponse.redirect(homeUrl);
      } catch (err) {
        // Прострочений токен ігноруємо
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/register'],
};
