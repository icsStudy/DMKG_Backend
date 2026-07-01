import express from 'express';

const PORT = Number(process.env.AI_PORT ?? process.env.PORT ?? 3020);
const BUILD_REF = process.env.BUILD_REF ?? 'local';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-service', buildRef: BUILD_REF });
});

app.post('/api/v1/businesses/:id/website', (_req, res) => {
  res.json({
    success: true,
    data: { previewUrl: 'https://example.com/preview/e2e-stub' },
  });
});

app.post('/api/v1/businesses/:id/website/domain', (req, res) => {
  res.json({
    success: true,
    data: { domain: (req.body as { domain?: string })?.domain ?? null },
  });
});

app.listen(PORT, () => {
  console.log(`ai-service listening on :${PORT}`);
});

export { app };
