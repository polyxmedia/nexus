# NEXUS Go-Live Checklist

Production launch readiness review. Audited and validated on 2026-03-10.

---

## P0: Must Fix Before Launch

### Security

- [ ] **Generate production NEXTAUTH_SECRET** - Current value is `nexus-dev-secret-change-in-production`. Generate with `openssl rand -base64 64` and set in Vercel env vars
- [ ] **Set SETTINGS_ENCRYPTION_KEY** - API keys in settings table are unencrypted without it. Generate with `openssl rand -hex 32`
- [x] **Add CSRF validation to all mutation routes** - Added `validateOrigin()` to 71 files covering 104 mutation handlers. All POST/PUT/PATCH/DELETE routes now have CSRF protection
- [x] **Add security headers** - Added X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS via next.config.ts headers. Also set `poweredByHeader: false`
- [x] **Fix IG OAuth state token** - Changed to per-user key `ig_oauth_state:{username}` in both oauth/route.ts and oauth/callback/route.ts. Added timing-safe comparison via crypto.timingSafeEqual
- [x] **Add missing public paths to middleware** - Added `/api/analytics/track`, `/api/referrals/click`, `/api/health` to PUBLIC_API_PATHS
- [x] **Audit admin dangerouslySetInnerHTML** - Verified: `previewHtml` state is declared but never set (dead code). No XSS risk. Can remove in cleanup

### Database

- [x] **Add missing indexes** - Created migration `drizzle/0003_add_indexes.sql` with 13 indexes on subscriptions, credit_balances, credit_ledger, chat_sessions, chat_messages, trades, predictions, alert_history, analytics_events. Run with `npm run db:migrate`
- [ ] **Verify Neon connection pooling** - Confirm pool size and timeout settings are appropriate for expected load
- [ ] **Confirm Neon backup/PITR settings** - Document retention window and recovery procedure

### Environment

- [x] **Add env var validation at startup** - Added `validateEnv()` in `instrumentation.ts`. 5 required vars throw on missing, 6 recommended vars warn. Blocks production start with default NEXTAUTH_SECRET
- [ ] **Verify all required env vars are set in Vercel** - DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RESEND_API_KEY, SETTINGS_ENCRYPTION_KEY, CRON_SECRET, VOYAGE_API_KEY

### Monitoring

- [x] **Reduce Sentry trace sampling** - Set `tracesSampleRate: 0.2` in sentry.server.config.ts, sentry.edge.config.ts, and instrumentation-client.ts
- [x] **Add Sentry capture to app/error.tsx** - Added `Sentry.captureException(error)` in dedicated useEffect with [error] dependency

### Legal/Compliance

- [x] **Add cookie consent banner** - Created `components/cookie-consent.tsx` with localStorage persistence. Added to root layout. Links to /cookies page. Dark theme matching design system

---

## P1: Should Fix Before Launch

### Security Hardening

- [x] **Add per-IP rate limiting on login** - Added 20 attempts/15min per-IP limit alongside existing per-username limit
- [x] **Rate limit public endpoints** - Added 30/min per-IP on `/api/subscription/tiers`, `/api/predictions/recent-resolved`; 20/min on `/api/predictions/feedback`
- [x] **Fix API key scope fallback** - Invalid JSON in scopes now returns 403 instead of allowing all
- [x] **Verify localhost rate-limit bypass is disabled in prod** - Removed localhost bypass from registration rate limiter

### Resilience

- [x] **Add /api/health endpoint** - Checks DB + Redis connectivity, returns version/uptime, 503 on degraded
- [x] **Standardize API timeouts** - Added 15s timeout to Alpha Vantage, 10s to OpenSky
- [x] **Fix aircraft API silent failure** - Now returns 502 with error field instead of 200 with empty data
- [x] **Add database connection error handling** - Added pool config (max: 20, idle: 30s, connect: 5s) and error listener
- [x] **Add IG OAuth token refresh job** - Scheduler job runs every 45min to proactively refresh IG tokens

### Account Management

- [x] **Add account deletion UI** - Already existed (CloseAccountSection in settings profile tab)
- [x] **Add data export** - API at `/api/account/export` + download button in settings profile tab
- [x] **Add in-app password change** - API at `/api/account/password` + form in settings profile tab

### TypeScript

- [ ] **Enable noImplicitAny** - 333 errors to resolve. Needs dedicated follow-up pass.

### Infrastructure

- [x] **Add `engines` field to package.json** - Set `"node": ">=18"`
- [x] **Verify maxDuration exports on long-running routes** - Added `export const maxDuration = 60` to all 6 routes in vercel.json
- [x] **Remove poweredByHeader** - Added `poweredByHeader: false` to next.config.ts (+ security headers via linter)

### Billing

- [ ] **Test full Stripe subscription lifecycle** - Manual QA: signup > checkout > active > failed payment > retry > cancel > resubscribe. Webhook handles all transitions (verified in code)
- [ ] **Test credit system edge cases** - Manual QA: monthly rollover, top-up purchase, hitting zero balance mid-chat, admin bypass

---

## P2: Fix Soon After Launch

### Data Hygiene

- [x] **Implement data retention jobs** - Created `lib/cleanup/retention.ts` with daily scheduler job. Cleans: analyticsEvents (90d), alertHistory (90d), timelineEvents (180d), expired knowledge entries
- [x] **Add cascade delete for chat messages** - Already existed: `chat/sessions` DELETE handler deletes messages before session
- [x] **Enforce knowledge.validUntil** - Retention job now archives active knowledge entries past validUntil. Supplements existing live-ingest expiry

### UX Polish

- [x] **Add loading states** - Created `app/loading.tsx` with pulsing dot + skeleton placeholders matching design system
- [x] **Add web app manifest** - Created `public/manifest.json` with NEXUS branding. Favicon already existed via `app/icon.tsx`
- [x] **Add unsubscribe link to emails** - Added settings link in email footer in `lib/email/templates.ts`
- [x] **Fix viewport meta tag** - Added `initialScale: 1, userScalable: true` to viewport export in layout.tsx

### Observability

- [x] **Add request correlation IDs** - Created `lib/request-id.ts` with `generateRequestId()` and `errorResponse()` utility for incremental adoption
- [x] **Monitor email delivery** - Added `Sentry.captureException()` on email send failures in `lib/email/index.ts`
- [x] **Add scheduler failure alerting** - After 3 consecutive failures, errors sent to Sentry with job name/count tags
- [x] **Sanitize error messages in API responses** - Fixed `analyst-jobs` and `calendar/reading` routes. ~100 other routes can adopt `errorResponse()` incrementally

### Performance

- [ ] **Install bundle analyzer** - Added `analyze` script to package.json. Needs `npm install --save-dev @next/bundle-analyzer` and next.config.ts wrapper
- [x] **Review image optimization** - Audit complete: zero raw `<img>` tags found. All images use Next.js Image component
- [x] **Cache tier limits** - Added 60s TTL in-memory cache to `requireTier()` and `getUserTier()` with `invalidateTierCache()` export

### Security (Non-Urgent)

- [x] **Create dedicated audit_logs table** - Created migration `drizzle/0004_audit_logs.sql` with indexes. Ready for incremental adoption
- [x] **Add API key rotation endpoint** - Added PUT handler to `settings/api-keys/route.ts` for key rotation
- [x] **Add referrals route admin guard at entry** - Moved admin check to top of POST handler with ADMIN_ACTIONS list

---

## Already Done (verified)

- [x] Auth middleware with deny-by-default routing
- [x] bcrypt password hashing (12 rounds)
- [x] Login rate limiting (10 attempts / 15 min per username)
- [x] Registration rate limiting (5 / hour / IP)
- [x] Stripe webhook signature verification (HMAC-SHA256 via constructEvent)
- [x] Drizzle ORM parameterized queries (no SQL injection risk)
- [x] Sentry error monitoring configured (client, server, edge)
- [x] Upstash Redis rate limiting with in-memory fallback
- [x] Credit system with auditable ledger and monthly rollover
- [x] Transactional emails via Resend (welcome, subscription lifecycle, payment issues)
- [x] SEO: robots.txt, sitemap, meta tags, JSON-LD structured data
- [x] Stripe timeout and retry config (25s, 3 retries)
- [x] Encryption module for sensitive settings (AES-256-GCM)
- [x] Admin impersonation with time limits and nonce revocation
- [x] Scheduler with 17 cron jobs and error tracking
- [x] No TODO/FIXME/HACK in critical code paths
- [x] pgvector knowledge table protected from Drizzle push
- [x] .env.local properly gitignored (`.env*.local` pattern)
- [x] Legal pages: privacy policy, terms of service, cookie policy, security
- [x] Password reset flow (forgot-password + reset-password pages)
- [x] Mobile responsive layout (sidebar hamburger menu, responsive padding)
- [x] Error pages production-ready (404 with radar viz, 500 with retry)
- [x] No hardcoded localhost/dev URLs in production code
- [x] Coinbase OAuth: per-user state, timing-safe comparison, encrypted tokens
- [x] Alpaca OAuth: per-user state, tier-gated, encrypted tokens
- [x] API v1: Bearer token auth with scopes, per-tier rate limits, key hashing
- [x] File uploads: tier-gated, size-limited (10MB), type-validated, no disk storage
- [x] SSE endpoints authenticated (alerts stream, chat streaming)
- [x] Console output is error-logging only (no debug console.logs in prod paths)
