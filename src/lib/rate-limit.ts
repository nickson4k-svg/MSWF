import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Auth rate limiter: 5 requests per 60 seconds per IP
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  prefix: 'ratelimit:auth',
});

// General API rate limiter: 30 requests per 10 seconds per user
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  prefix: 'ratelimit:api',
});
