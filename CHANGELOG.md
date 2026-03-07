# Changelog

All notable changes to Nexus are documented here.

## [Unreleased]

### Added
- **Watchlists** - create multiple watchlists, add/remove symbols, live quotes from Alpha Vantage, drag-and-drop reorder, rename/delete, popular symbol suggestions
- **Chat Projects** - organize chats into color-coded projects
- **Chat Tags** - tag chats with custom labels, filter by tag
- **Chat Search** - full-text search across chat titles and message content
- **Chat Context Menu** - right-click to tag, move to project, or delete chats
- **Credit Stress Monitor widget** - HY/IG OAS spreads with stress regime classification and gauge bars
- **Dollar Liquidity Index widget** - net liquidity from Fed balance sheet minus reverse repo, M2 tracking
- **Inflation Pulse widget** - 5Y/10Y breakeven inflation rates with trend analysis
- **Volatility Regime widget** - VIX fear gauge with 5-level regime label and sparkline
- **Currency Stress widget** - DXY, EUR/USD, JPY/USD, CNY/USD with strength direction
- **Labor Market Pulse widget** - initial/continuing claims, unemployment, payrolls with health status
- **Commodity Complex widget** - gold, WTI, Brent, natural gas with sparklines and % changes
- **Housing & Consumer widget** - housing starts, consumer sentiment, retail sales
- **GDP Nowcast widget** - real GDP growth with regime classification and industrial production
- Expanded FRED macro snapshot from 17 to 31 series

### Changed
- Chat sessions schema now supports `projectId` and `tags` fields
- Chat list page rebuilt with project sidebar, tag filter, and search bar
- Dashboard marketplace expanded with 9 new institutional-grade widgets

---

## [1.0.0] - 2026-03-06

### Added
- War Room geopolitical map (CARTO tiles, conflict zones, actor markers, strategic locations)
- Aircraft tracking layer (OpenSky Network, military callsign classification, 20s polling)
- OSINT layer (GDELT API with seed data fallback, 15 conflict hotspots)
- Scenario modeling panel with game theory analysis
- AI Chat with SSE streaming and 20+ intelligence tools
- Signal detection engine (celestial, Hebrew calendar, geopolitical, convergence layers)
- Signal intensity scoring (1-5) with multi-layer convergence
- Prediction engine with confidence scoring and outcome tracking
- Brier score and binary accuracy metrics for predictions
- Trading integration with Trading212 (demo and live)
- Trade execution from AI chat and thesis recommendations
- Thesis generation engine with executive summary, risk scenarios, trading actions
- Knowledge bank (theses, world models, actor profiles)
- Timeline event stream with cross-referencing
- Entity relationship graph with force-directed visualization
- Alert system (price threshold, VIX level, geofence, signal intensity, OSINT keyword)
- Alert history with dismissal
- Dashboard with configurable widget grid
- Widget drag-and-drop reordering in edit mode
- Widget marketplace with categories and search
- Candlestick chart widget (Alpha Vantage)
- Macro dashboard widget (FRED API)
- Yield curve visualization
- VIX gauge metric
- Put/call ratio widget
- Portfolio risk metrics (VaR, Sharpe, max drawdown)
- Calendar widget (Hebrew, Islamic, economic events)
- News feed widget (RSS aggregation)
- Portfolio value metric with P&L
- Threat level, market regime, convergence density metrics
- Thesis confidence and prediction accuracy metrics
- Multi-calendar convergence (Hebrew, Islamic, Chinese, FOMC, OPEX)
- Monte Carlo simulation tool in chat
- OSINT ingestion from GDELT and RSS feeds
- Marketing landing page with animated bento grid and pricing tiers
- SQLite database with WAL mode via drizzle-orm
- Dark navy theme with signal color system
- IBM Plex Mono + Sans typography
