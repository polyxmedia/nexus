---
paths:
  - "app/api/trading/**/*.ts"
  - "app/trading/**/*.tsx"
  - "components/trading/**/*.tsx"
  - "lib/trading/**/*.ts"
---

# Trading Rules

@SYSTEMS.md

## Brokers

- **IBKR** - Interactive Brokers (stocks, options, futures)
- **IG** - CFD/spread betting
- **Trading 212** - Stock trading (demo/live modes)
- **Coinbase** - Crypto trading

## Safety

- Demo mode by default, live mode requires explicit user toggle
- All trade execution requires user approval (no auto-execution)
- API keys stored in user settings (encrypted)
- Trade deduplication via hash in `trades` table

## Conventions

- Portfolio snapshots track: value, cash, invested, P&L
- Manual positions support: long/short, avg cost, open/closed dates
- Market snapshots cache technical indicators: RSI, MACD, Bollinger, ATR, SMAs
- Alpha Vantage auto-detects crypto symbols (BTC, XRP, ETH, etc.)
