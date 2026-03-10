# Configuration Reference

## package.json Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `rm -rf .next && next dev --turbopack` | Dev server (clears cache first) |
| `build` | `next build` | Production build |
| `start` | `next start` | Run production server |
| `db:generate` | `drizzle-kit generate` | Generate Drizzle migrations |
| `db:migrate` | `drizzle-kit migrate` | Apply migrations |
| `db:seed` | `npx tsx data/seed-signals.ts` | Seed signal data |
| `test` | `vitest run` | Unit tests |
| `test:watch` | `vitest` | Unit tests (watch mode) |
| `test:e2e` | `playwright test` | E2E tests |
| `lint` | `next lint` | Lint codebase |
| `ios` | `npx cap open ios` | Open iOS project |
| `ios:sync` | `npx cap sync ios` | Sync iOS assets |
| `test:e2e:ui` | `playwright test --ui` | E2E tests with UI |

## TypeScript (tsconfig.json)

- Target: ES2017
- Strict mode with `noImplicitAny: false`
- Path alias: `@/*` maps to project root
- Excluded: `node_modules`, `data`, `mcp-server`

## Next.js (next.config.ts)

- Server external packages: `pdfkit`, `pptxgenjs` (CommonJS)
- Turbopack: persistent disk cache disabled (prevents stale HMR)
- Sentry: source maps, tunnel via `/monitoring`, tree-shaking
- Vercel Cron monitors for scheduled jobs

## Tailwind v4 (app/globals.css)

Theme defined via `@theme` block in CSS (not tailwind.config.js):

### Colors
```
navy-950: #000000    navy-900: #0a0a0a    navy-800: #141414
navy-700: #1f1f1f    navy-600: #303030    navy-500: #505050
navy-400: #787878    navy-300: #9e9e9e    navy-200: #c0c0c0
navy-100: #e0e0e0

signal-1: #4a5568 (gray-blue)    signal-2: #5a6577 (slate)
signal-3: #8b8b6e (olive)        signal-4: #9a7b6a (warm brown)
signal-5: #8b5c5c (muted red-brown)

accent-cyan: #06b6d4    accent-slate: #94a3b8
accent-amber: #f59e0b   accent-emerald: #10b981
accent-rose: #f43f5e
```

### Fonts
- `--font-mono`: IBM Plex Mono
- `--font-sans`: IBM Plex Sans

### Theme Modes
- Default: dark (pure black base)
- `.dim`: warm dark (brown-tinted)
- `.soft`: muted light (inverted, warm)
- `.light`: bright (full light mode)

## Middleware (middleware.ts)

Protected routes via NextAuth `withAuth`:

### Public (no auth)
- `/api/predictions/feedback`
- `/api/predictions/recent-resolved`
- `/api/telegram/webhook`

### Special Auth
- `/api/v1/*`: Bearer token auth
- Scheduler calls: `CRON_SECRET` header

### Sign-in redirect
`/login`

## Drizzle ORM (drizzle.config.ts)

- Schema: `lib/db/schema.ts`
- Migrations: `drizzle/` directory
- Dialect: PostgreSQL
- **WARNING**: Do not use `drizzle-kit push` (drops pgvector column)

## Vercel (vercel.json)

- Region: `iad1`
- 60s function timeout for: chat, analysis, prediction generation, thesis, calendar reading

## Testing

### Vitest (vitest.config.ts)
- Global test utilities
- Excluded: `e2e/**`, `node_modules/**`, `mcp-server/**`

### Playwright (playwright.config.ts)
- Test dir: `./e2e`
- Sequential (workers: 1), no retries
- Base URL: `http://localhost:3000`
- Chromium only, headless

## Sentry (sentry.*.config.ts)

- 100% trace sampling
- PII collection enabled
- Server + edge runtime configs

## Capacitor (capacitor.config.ts)

- App ID: `com.nexus.intel`
- Dev server: `http://localhost:3000`
- iOS scheme: `NEXUS`

## Environment Variables

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
ALPHA_VANTAGE_API_KEY=...
TRADING212_API_KEY=...
TRADING212_SECRET=...
FRED_API_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
VOYAGE_API_KEY=...
SENTRY_DSN=...
CRON_SECRET=...
```
