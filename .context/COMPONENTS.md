# Components Reference

All components use `"use client"` when using hooks/interactivity. Tailwind CSS with navy palette, Lucide icons, Radix UI for accessible primitives.

## Layout (`components/layout/`)

| Component | Purpose |
|-----------|---------|
| `sidebar.tsx` | Fixed left nav (w-48). Context-aware menu with tier-based visibility. Credit meter, user status. Mobile hamburger. Hidden on landing, auth, research pages. |
| `page-container.tsx` | Standard page wrapper. Adds ml-48 on desktop, pt-14 on mobile. Accepts title, subtitle, actions. |
| `public-nav.tsx` | Public-facing header. Navigation: Methodology, Research, About, Investors. Sign in + CTA. |
| `public-footer.tsx` | Footer for public pages. Links to legal, social, contact. |
| `impersonation-banner.tsx` | Admin impersonation indicator with revert button. |

## UI Primitives (`components/ui/`)

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Variants: default, primary, outline, ghost, destructive, signal. Sizes: sm, md, lg, icon. |
| `card.tsx` | Container (navy-900/80 bg, navy-700 border). Sub-components: CardHeader, CardTitle, CardDescription, CardContent. |
| `badge.tsx` | Status indicators. Variants: default, intensity (signal-1 to signal-5), status, category. |
| `input.tsx` | Text input with navy theme and focus states. |
| `markdown.tsx` | Basic markdown parser (headers, bold, italic, lists). No external library. |
| `skeleton.tsx` | Loading placeholder state. |
| `metric.tsx` | Key/value display for dashboard stats. |
| `data-grid.tsx` | Table component for tabular data. |
| `code-editor.tsx` | Code syntax highlighting and editing. |
| `briefing-card.tsx` | Intelligence briefing card variant. |
| `upgrade-gate.tsx` | Subscription paywall. Shows tier requirements, blurs content, Stripe checkout integration. |

## Chat (`components/chat/`)

| Component | Purpose |
|-----------|---------|
| `ChatInput.tsx` | Multi-modal input. File drag-drop/paste (images 5MB, text 512KB). Voice input (operator+). Voice calling (TTS + listening). Shift+Enter newline. Stop streaming button. |
| `MessageBlock.tsx` | Renders individual messages. User/assistant styling, file attachments, copy button. |
| `ToolCallIndicator.tsx` | Visual indicator during tool invocation. |
| `ToolResultRenderer.tsx` | Routes tool names to 50+ specialized widgets. Human-readable tool labels. |
| `VoiceWaveform.tsx` | Real-time audio waveform visualization during recording. |

## Chat Widgets (`components/chat/widgets/`)

50+ specialized tool result renderers:

| Widget | Tool | What It Renders |
|--------|------|-----------------|
| `SignalsWidget` | get_signals | Signal detection across 4 layers |
| `GameTheoryWidget` | get_game_theory | Scenario analysis, payoff matrices |
| `CustomGameTheoryWidget` | create_custom_game_theory | Custom 2-actor scenarios |
| `ThesisWidget` | get_active_thesis | Active thesis briefing |
| `PredictionsWidget` | get_predictions | Predictions with Brier scores |
| `PredictionFeedbackWidget` | get_prediction_feedback | Calibration data |
| `PortfolioWidget` | get_portfolio | Holdings and P&L |
| `PortfolioRiskWidget` | get_portfolio_risk | VaR, Sharpe, drawdown |
| `MonteCarloWidget` | monte_carlo_simulation | Simulation results with confidence intervals |
| `MacroWidget` | get_macro_data | FRED macro indicators |
| `QuoteWidget` | get_live_quote | Live market quotes |
| `PriceHistoryWidget` | get_price_history | Historical price charts |
| `OptionsFlowWidget` | get_options_flow | Options market flow, gamma |
| `SentimentWidget` | get_market_sentiment | Market sentiment analysis |
| `MarketRegimeWidget` | - | Regime identification |
| `OsintWidget` | get_osint_events | OSINT events with geolocation |
| `WebSearchWidget` | web_search | Web search results |
| `KnowledgeWidget` | search_knowledge | Knowledge bank results |
| `SaveKnowledgeWidget` | save_document_to_knowledge | Save confirmation |
| `ActorProfileWidget` | get_actor_profile | Geopolitical actor profiles |
| `ParallelsWidget` | search_historical_parallels | Historical parallels |
| `TimelineWidget` | - | Event timeline |
| `CalendarWidget` | - | Calendar events |
| `EsotericWidget` | - | Celestial readings |
| `ArtifactWidget` | create_artifact | Generated artifacts |
| `MemoryWidget` | recall_memory/save_memory | Memory operations |
| `BayesianWidget` | - | Bayesian analysis results |
| `NowcastWidget` | - | Economic nowcasting |
| `GPRWidget` | - | Geopolitical risk index |
| `ChangePointsWidget` | - | BOCPD change points |
| `CongressionalTradingWidget` | - | Insider trading data |
| `ShippingWidget` | - | Shipping intelligence |
| `ShortInterestWidget` | - | Short interest data |
| `GammaExposureWidget` | - | Options gamma heatmaps |
| `SystemicRiskWidget` | - | Systemic risk assessment |
| `CorrelationWidget` | - | Asset correlations |
| `SourceReliabilityWidget` | - | Source assessment |
| `ACHWidget` | - | Competing hypotheses |
| `CentralBankWidget` | - | Central bank analysis |
| `CollectionGapsWidget` | - | Intel collection gaps |
| `NarrativesWidget` | - | Narrative tracking |
| `PredictionMarketsWidget` | - | Prediction market odds |
| `OnChainWidget` | - | On-chain metrics |
| `AIProgressionWidget` | - | AI model tracking |
| `DocumentWidget` | - | Document save status |
| `DocumentDownloadWidget` | - | Document with download |
| `SnapshotWidget` | get_market_snapshot | Technical snapshot data |
| `IWStatusWidget` | get_iw_status | Intelligence warning status |
| `VesselTrackingWidget` | get_vessel_tracking | Vessel tracking results |
| `CollapsibleCard` | - | Wrapper for collapsible sections |

## War Room (`components/warroom/`)

| Component | Purpose |
|-----------|---------|
| `war-room-map.tsx` | Main Leaflet map container with layer system |
| `aircraft-layer.tsx` | Real-time aircraft tracking (OpenSky). Clusters on zoom-out. |
| `aircraft-detail-modal.tsx` | Aircraft detail (callsign, altitude, speed, heading) |
| `vip-aircraft-layer.tsx` | VIP/military aircraft with distinct styling |
| `vip-aircraft-modal.tsx` | VIP aircraft detail |
| `vessel-layer.tsx` | Maritime vessel positions and types |
| `vessel-detail-modal.tsx` | Vessel details (name, flag, cargo) |
| `vessel-trail-layer.tsx` | Historical vessel movement trails |
| `osint-markers-layer.tsx` | GDELT OSINT event markers |
| `osint-event-modal.tsx` | OSINT event details |
| `osint-feed.tsx` | Side panel feed of recent events |
| `conflict-heatmap-layer.tsx` | ACLED conflict data heatmap |
| `country-click-layer.tsx` | Clickable country borders |
| `country-detail-panel.tsx` | Country info panel (actors, threats, trade) |
| `actor-detail-modal.tsx` | Individual actor profiles |
| `chokepoint-detail-modal.tsx` | Strategic chokepoint details |
| `layer-toggle.tsx` | Map layer visibility controls |
| `map-type-selector.tsx` | Satellite/terrain/dark mode selection |
| `intel-panel.tsx` | Intelligence state summary |
| `scenario-panel.tsx` | Game theory on map |
| `watchlist-panel.tsx` | User watchlist of actors/regions |
| `sources-panel.tsx` | Data source reliability |
| `globe-view.tsx` | 3D globe (custom shaders + atmosphere) |
| `view-mode-toggle.tsx` | 2D map / 3D globe switch |

## Trading (`components/trading/`)

| Component | Purpose |
|-----------|---------|
| `trade-approval-modal.tsx` | Trade approval with risk estimates, position sizing, confirmation |
| `trade-suggestion-card.tsx` | Trade idea card (thesis, entry, targets, stops) |
| `equity-curve.tsx` | Portfolio performance chart |
| `ibkr-panel.tsx` | Interactive Brokers panel |
| `ig-panel.tsx` | IG Markets panel |

## Graph (`components/graph/`)

| Component | Purpose |
|-----------|---------|
| `graph-canvas.tsx` | ReactFlow node-link diagram. Custom styling per entity type. Mini-map + controls. |
| `custom-node.tsx` | Custom ReactFlow node (name, type, properties) |
| `entity-detail-panel.tsx` | Selected entity details and relationships |
| `entity-list-panel.tsx` | Entity list with search/filter |
| `context-menu.tsx` | Right-click context menu on nodes |

## Other Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `daily-predictions.tsx` | `predictions/` | Dashboard predictions with calibration |
| `global-scenario-map.tsx` | `game-theory/` | Geopolitical alliance map |
| `widget-renderer.tsx` | `dashboard/` | Dashboard widget renderer (30+ types) |
| `news-widget.tsx` | `dashboard/` | News feed widget |
| `threat-map-preview.tsx` | `landing/` | Landing page threat map demo |
| `hero-terminal.tsx` | `landing/` | Animated terminal on landing |
| `notification-provider.tsx` | `notifications/` | Alert SSE streaming + context |
| `notification-bell.tsx` | `notifications/` | Header bell with unread count |
| `notification-toast.tsx` | `notifications/` | Toast for new alerts |
| `bet-modal.tsx` | `prediction-markets/` | Prediction market bet placement |
| `session-provider.tsx` | `providers/` | NextAuth SessionProvider wrapper |
| `json-ld.tsx` | `seo/` | Schema.org structured data |
| `theme-toggle.tsx` | `theme/` | Dark/dim/soft/light mode toggle |
| `tracker.tsx` | `analytics/` | Analytics event tracking |
| `graph-stats-bar.tsx` | `graph/` | Node/edge count stats |
| `graph-empty-state.tsx` | `graph/` | Empty graph state |
| `map-tile-updater.tsx` | `warroom/` | Tile layer update manager |
| `trial-banner.tsx` | `subscription/` | Trial expiration warning |
| `payment-form.tsx` | `payments/` | Stripe card element checkout |
| `candlestick-chart.tsx` | `charts/` | OHLCV candlestick chart |
| `signal-lineage-panel.tsx` | `signals/` | Signal source lineage |
| `comment-section.tsx` | `social/` | Comments on posts |
