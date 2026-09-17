import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (options: RateLimiterOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests from this client, please try again later.',
    keyGenerator = (req: Request) => {
      // Use user ID if authenticated, fallback to IP address
      const userId = (req as any).user?.id;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
      return userId ? `user:${userId}` : `ip:${Array.isArray(ip) ? ip[0] : ip}`;
    },
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting in test environment if desired
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetTime) {
      hits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      logger.warn(`[RATE LIMIT EXCEEDED] Key: ${key} on ${req.method} ${req.originalUrl}`);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    return next();
  };
};

// Preset limiters for key routes
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const tutorRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 prompts per minute
  message: 'AI Tutor query limit reached. Please wait a moment before sending another message.',
});

export const quizGenRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // 15 quiz generations per 10 minutes
  message: 'Quiz generation limit reached. Please wait a few minutes before generating more quizzes.',
});

export const materialUploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 uploads per 10 minutes
  message: 'Material upload rate limit reached. Please wait before uploading more files.',
});
