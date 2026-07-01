import cors from 'cors';
import { config } from '../config.js';

export const corsMiddleware = cors({
  origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'x-business-id',
    'x-request-id',
  ],
});
