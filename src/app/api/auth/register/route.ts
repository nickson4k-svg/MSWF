import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Simple in-memory rate limiting (per IP).
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  if (limit && limit.resetTime > now) {
    if (limit.count >= 5) return false;
    limit.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute
  }
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Забагато запитів. Спробуйте пізніше.' }, { status: 429 });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password || username.length < 3 || password.length < 6) {
      return NextResponse.json({ error: 'Некоректні дані' }, { status: 400 });
    }

    const pwdHash = await hashPassword(password);
    const token = await generateToken(username, pwdHash);

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({ success: true, username });
  } catch (err) {
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
