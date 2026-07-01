import express from 'express';

const PORT = Number(process.env.SOCIAL_PORT ?? process.env.PORT ?? 3030);
const BUILD_REF = process.env.BUILD_REF ?? 'local';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'social-service', buildRef: BUILD_REF });
});

app.get('/api/v1/webhooks/logs', (_req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/v1/social/publish', (req, res) => {
  const body = req.body as { platforms?: string[]; content?: string };
  const platforms = body.platforms?.length ? body.platforms : ['meta'];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let index = 0;
  const sendNext = (): void => {
    if (index >= platforms.length) {
      res.end();
      return;
    }
    const platform = platforms[index];
    const event = {
      postId: 'e2e-stub-post',
      platform,
      status: 'published',
      message: 'E2E stub publish',
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    index += 1;
    setTimeout(sendNext, 30);
  };

  sendNext();
});

app.listen(PORT, () => {
  console.log(`social-service listening on :${PORT}`);
});

export { app };
