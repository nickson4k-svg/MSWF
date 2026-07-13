import { NextResponse } from 'next/server';
import { hashPassword, generateToken, comparePassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  if (limit && limit.resetTime > now) {
    if (limit.count >= 5) return false;
    limit.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
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
    if (!username || !password) {
      return NextResponse.json({ error: 'Введіть логін та пароль' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const oldToken = cookieStore.get('auth_token')?.value;

    let finalPwdHash = '';
    let loginSuccess = false;

    if (oldToken) {
      try {
        const decoded = decodeJwt(oldToken) as { sub: string, pwdHash: string };
        if (decoded && decoded.sub === username && decoded.pwdHash) {
          const isMatch = await comparePassword(password, decoded.pwdHash);
          if (isMatch) {
            finalPwdHash = decoded.pwdHash;
            loginSuccess = true;
          } else {
            return NextResponse.json({ error: 'Неправильний пароль' }, { status: 401 });
          }
        }
      } catch (e) {
        // Token malformed, ignore
      }
    }

    // Fallback: If no token, generate a new hash. 
    // This allows seamless login on new devices since we have no DB.
    if (!finalPwdHash) {
      finalPwdHash = await hashPassword(password);
      loginSuccess = true;
    }

    if (!loginSuccess) {
      return NextResponse.json({ error: 'Помилка авторизації' }, { status: 401 });
    }

    const token = await generateToken(username, finalPwdHash);

    const { redis } = await import('@/lib/redis');
    const profileKey = `profile:${username}`;
    const exists = await redis.exists(profileKey);
    if (!exists) {
      await redis.hset(profileKey, {
        username,
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString()
      });
    }

    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, username });
  } catch (err) {
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
