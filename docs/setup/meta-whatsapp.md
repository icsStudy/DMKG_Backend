# Meta & WhatsApp Setup

Guide for connecting Meta (Facebook/Instagram Ads, organic publish, lead gen) and WhatsApp Business API per tenant business.

## Prerequisites

- Meta Business Manager account
- Facebook App with products: Facebook Login, Marketing API, WhatsApp, Webhooks
- WABA (WhatsApp Business Account) linked to the Meta app
- Ad Account with billing enabled (for paid campaigns)

## Environment variables

Add to `spacode-backend/.env`:

```bash
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/v1/social/callback/meta
META_GRAPH_API_VERSION=v21.0
META_WEBHOOK_VERIFY_TOKEN=spacode-meta-verify
WHATSAPP_WEBHOOK_VERIFY_TOKEN=spacode-wa-verify
META_WABA_CONFIG_ID=
PUBLIC_API_URL=http://localhost:3000
GEMINI_API_KEY=
```

## Meta App permissions

Request during App Review:

| Permission | Use |
|------------|-----|
| `pages_manage_posts` | Organic publish to Facebook Page |
| `pages_read_engagement` | Page insights |
| `ads_management` | Create/activate Meta ad campaigns |
| `leads_retrieval` | Lead gen webhook processing |
| `whatsapp_business_management` | Template sync & submit |
| `whatsapp_business_messaging` | Send approved templates |
| `business_management` | Ad accounts & WABA discovery |

## OAuth connect flow

1. Admin UI → **אינטגרציות** → **חבר Meta** / **חבר WhatsApp**
2. Gateway → `social-service` returns OAuth URL with `businessId` in state
3. Callback stores encrypted tokens in `SocialConnection` (per business, per platform)

## Webhooks (production)

Configure in Meta Developer Console:

| Callback URL | Verify token |
|--------------|--------------|
| `{PUBLIC_API_URL}/api/v1/webhooks/meta/leadgen` | `META_WEBHOOK_VERIFY_TOKEN` |
| `{PUBLIC_API_URL}/api/v1/webhooks/meta/whatsapp` | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |

Subscribe to: `leadgen`, `messages`, `message_template_status_update`.

## Per-business custom webhooks

Each business has `webhookSecret`. POST to:

```
POST /api/v1/webhooks/inbound/{businessId}
Header: x-spacode-signature: sha256=<hmac>
Body: { email, name, phone, contentItemId?, ... }
```

## Marketing automation cycle

1. **AI plan** — `POST /api/v1/businesses/:id/marketing/plans` (30 or 90 days)
2. **Calendar** — content items with `trackingSlug` for UTM attribution
3. **Publish** — organic via Meta Graph API or schedule for cron pickup
4. **Paid ads** — `POST /api/v1/businesses/:id/meta/campaigns` → activate
5. **WhatsApp** — sync templates, submit for approval, send when `APPROVED`
6. **Leads** — Meta leadgen + website contact form → `Lead.contentItemId`

## Troubleshooting

- **OAuth redirect mismatch** — `META_REDIRECT_URI` must match Meta App settings exactly
- **No ad account** — connect Meta first; store `adAccountId` in connection metadata
- **Template rejected** — check `rejectionReason` on `/whatsapp/templates/`
- **Dev mode** — use test users/pages until App Review completes
