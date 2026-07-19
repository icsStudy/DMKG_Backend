# social-service

## Role

OAuth, webhooks, multi-platform publish, Meta Ads, WhatsApp templates, unified inbox.

**Port:** `3030` (`SOCIAL_PORT`)

## Platform connectors

| Platform | OAuth | Publish | Webhook |
|----------|-------|---------|---------|
| Meta / Instagram | `GET /social/connect/meta` | worker `publishMeta` | `webhooks/meta/leadgen` |
| WhatsApp | `GET /social/connect/whatsapp` | templates API | `webhooks/meta/whatsapp` |
| TikTok | `GET /social/connect/tiktok` | worker `publishTikTok` (async poll) | `webhooks/tiktok/leadgen` |
| LinkedIn | `GET /social/connect/linkedin` | worker `publishLinkedIn` | `webhooks/linkedin/leadgen` |
| X (Twitter) | `GET /social/connect/twitter` (PKCE) | worker `publishTwitter` | — |
| YouTube | `GET /social/connect/youtube` | worker `publishYouTube` (resumable upload) | — |

## Key routes

| Path | Description |
|------|-------------|
| `POST /social/publish` | Create post + SSE progress |
| `GET /social/messages` | Unified inbox list |
| `POST /social/messages/:id/reply` | Reply to comment |
| `* /businesses/:id/meta/*` | Meta Ads campaigns |
| `GET /public/bio/:slug` | (core-service) public link-in-bio |

## Env vars

See `.env.example`: `TIKTOK_*`, `LINKEDIN_*`, `X_*`, `YOUTUBE_*`, `META_*`, `TIKTOK_PUBLISH_PRIVACY`.

## Workers

- `social-publish.worker.ts` — per-platform dispatch via `platform-publish.ts`
- Cron: `enqueueEvergreenReposts`, `sweepStalePublishes` (TikTok in-flight re-poll)
