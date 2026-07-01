import type { Express } from 'express';
import { coreRouter } from './core.proxy.js';
import { aiRouter } from './ai.proxy.js';
import { socialRouter } from './social.proxy.js';

export function mountRoutes(app: Express): void {
  app.use(aiRouter);
  app.use(socialRouter);
  app.use(coreRouter);
}
