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
      const payload = await jwtVerify(token, encodedSecret);
      const currentUser = payload.payload.sub as string;

      // Check access for private rooms
      const match = request.nextUrl.pathname.match(/^\/chat\/private:(.+):(.+)$/);
      if (match) {
        const user1 = match[1];
        const user2 = match[2];
        
        if (currentUser !== user1 && currentUser !== user2) {
          return NextResponse.redirect(new URL('/', request.url));
        }
        
        const otherUser = currentUser === user1 ? user2 : user1;
        
        // Use Upstash Redis directly via fetch in Edge runtime
        const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || '';
        const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
        if (upstashUrl && upstashToken && upstashUrl.startsWith('http')) {
          const res = await fetch(`${upstashUrl}/sismember/friends:${currentUser}/${otherUser}`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
          });
          const data = await res.json();
          if (data.result === 0) {
            // Not friends
            return NextResponse.redirect(new URL('/', request.url));
          }
        }
      }
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
