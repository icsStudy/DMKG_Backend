import type { Request } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

/** Proxy to an internal service; re-serializes JSON bodies parsed by express.json(). */
export function createServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Express strips mount prefixes (e.g. /api/v1/auth) before the proxy runs.
    pathRewrite: (_path, req) => (req as Request).originalUrl ?? _path,
    on: {
      proxyReq: fixRequestBody,
    },
  });
}

/** For routes that use express.raw() — body is forwarded as-is by the proxy stream. */
export function createRawServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
  });
}
