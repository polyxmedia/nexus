---
paths:
  - "lib/game-theory/**/*.ts"
  - "app/api/game-theory/**/*.ts"
  - "app/game-theory/**/*.tsx"
---

# Game Theory Rules

@SYSTEMS.md

## Architecture

- `lib/game-theory/wartime.ts` - Wartime threshold detection
- `scenario_states` table tracks branch state: peacetime > escalating > wartime > de-escalating
- Stores triggered thresholds, invalidated strategies, escalation trajectories

## Conventions

- Payoff matrices use 2-player format by default
- Nash equilibria calculated per scenario
- Bayesian N-player analysis available via `/api/game-theory/bayesian`
- Strategy invalidation fires when wartime thresholds are crossed
- Escalation trajectories are time-series arrays

## State Machine

Valid transitions:
- peacetime -> escalating
- escalating -> wartime
- wartime -> de-escalating
- de-escalating -> peacetime
- Any state -> peacetime (de-escalation shortcut)
