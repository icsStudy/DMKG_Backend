import rateLimit from 'express-rate-limit';

export const leadsLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhooksLimiter = rateLimit({
  windowMs: 60_000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

export const emailLimiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

export const analyticsLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
  standardHeaders: true,
  legacyHeaders: false,
});

export const defaultLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
