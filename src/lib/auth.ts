import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_must_be_changed_in_production_32_chars';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  sub: string;
  pwdHash: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(username: string, pwdHash: string): Promise<string> {
  const jwt = await new SignJWT({ sub: username, pwdHash })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedSecret);
  
  return jwt;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}
