# NEXUS Intelligence Platform

## What It Is

NEXUS is an integrated geopolitical-market intelligence platform that fuses four primary signal layers (GEO, MKT, OSI, systemic risk) with a narrative overlay (calendar/celestial as actor-belief context) to produce actionable intelligence briefings, regime-aware predictions, game theory scenarios, and trading integration.

## Core Thesis

Markets and geopolitics are interconnected systems. By detecting convergences across multiple signal layers, applying Bayesian reasoning, and tracking predictions with honest calibration feedback, NEXUS provides an intelligence edge that traditional financial analysis misses.

## Platform Capabilities

### Intelligence Analysis
- **Signal Detection**: 3 primary convergence layers (GEO, MKT, OSI) + systemic risk metrics + narrative overlay (CAL/CEL), scored via Bayesian fusion
- **AI Analyst Chat**: Claude-powered analyst with 59 tools, persistent memory, voice mode, file attachments
- **Thesis Generation**: Daily intelligence briefings with executive summary, trading actions, red team challenge
- **Knowledge Bank**: Institutional memory with pgvector semantic search (1024-dim Voyage AI embeddings)

### Prediction & Calibration
- **Prediction Engine**: Regime-aware predictions with direction vs level split scoring
- **Self-Calibration**: Brier score feedback loops, per-category confidence multipliers, base rate integration
- **Pre-Event Lock**: Predictions locked before events, marked post-event if overtaken by reality

### Geopolitical Intelligence
- **War Room**: Real-time Leaflet map with military aircraft (OpenSky), OSINT (GDELT), conflict zones (ACLED), vessel tracking, VIP aircraft (15,000+ known aircraft database)
- **Game Theory**: 10 built-in scenarios, custom 2-actor games, Nash equilibrium finder, Schelling points, wartime threshold detection
- **Actor Profiles**: Bayesian behavioral typing, decision history, calendar-conditioned probability modifiers

### Market Operations
- **Multi-Broker Trading**: IBKR, IG Markets, Trading 212, Coinbase integration
- **Technical Analysis**: RSI, MACD, Bollinger Bands, ATR, SMAs via Alpha Vantage
- **Options Flow**: Put/call ratios, gamma exposure, max pain
- **Monte Carlo**: Probability-weighted price forecasting

### Advanced Analytics
- **Regime Detection**: 6-dimensional classification (volatility, growth, monetary, risk appetite, dollar, commodities)
- **BOCPD**: Bayesian Online Change Point Detection for regime shift early warning
- **Congressional Trading**: STOCK Act insider disclosures and conflict-of-interest detection
- **Prediction Markets**: Polymarket/Kalshi integration with divergence detection
- **On-Chain Analytics**: Exchange flows, whale wallet monitoring

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.1 + Turbopack, React 19, TypeScript 5.7 |
| Styling | Tailwind CSS v4 (CSS-based config), Radix UI |
| Database | PostgreSQL (Herd local, Neon prod) + Drizzle ORM + pgvector |
| Auth | next-auth 4.x, credentials provider, JWT sessions |
| Payments | Stripe (subscriptions, credits, referral commissions) |
| AI | Anthropic Claude (analysis/chat/predictions), Voyage AI (embeddings) |
| Maps | Leaflet + react-leaflet, CARTO dark tiles |
| Monitoring | Sentry (server + edge), Vercel analytics |
| Mobile | Capacitor (iOS) |
| Testing | Vitest (unit), Playwright (E2E) |

## Subscription Tiers

| Tier | Price | Credits/mo | Key Features |
|------|-------|-----------|--------------|
| Analyst | $150/mo | 50,000 | Core intelligence, signals, predictions |
| Operator | $450/mo | 250,000 | Trading integration, voice mode, advanced analytics |
| Institution | Custom | Unlimited | Full API access, priority support |

## Design System

- Dark theme default with dim, soft, light modes
- Navy palette: navy-950 (#000000) through navy-100 (#e0e0e0)
- Signal colors: signal-1 (#4a5568 gray-blue) through signal-5 (#8b5c5c muted red-brown)
- Accents: cyan (#06b6d4), amber (#f59e0b), emerald (#10b981), rose (#f43f5e), slate (#94a3b8)
- Fonts: IBM Plex Mono (primary), IBM Plex Sans, Orbitron (display), Space Grotesk
- No emojis in UI
- Font mono labels: `text-[10px] font-mono uppercase tracking-wider`
