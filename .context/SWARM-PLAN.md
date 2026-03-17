# Swarm Intelligence Integration Plan

Inspired by MiroFish's agent-based simulation approach, adapted for NEXUS's existing architecture. Three phases, each delivers value independently.

## Phase 1: GraphRAG Knowledge Layer (2-3 days)

**Goal:** Make the knowledge bank graph-aware so every downstream system gets better context.

### 1.1 LLM Entity Extraction on Ingest
- When knowledge is added (chat tool, ingest, API), run Haiku to extract entities + relationships
- Create entity nodes + "mentions"/"affects"/"relates_to" edges automatically
- Replace current substring matching in `app/api/graph/auto-link/route.ts`
- **Files:** `lib/knowledge/engine.ts`, `lib/graph/engine.ts`

### 1.2 Cross-link Knowledge Entries
- On new knowledge, find related entries via embedding similarity (top 3-5)
- Create "related_to" relationships in graph between knowledge entries
- Add `knowledge` as entity type in graph
- **Files:** `lib/knowledge/engine.ts`, `lib/graph/engine.ts`, `lib/db/schema.ts` (entity type)

### 1.3 Graph-Aware Search
- When `searchKnowledge()` runs, also traverse graph 1-2 hops from matched entities
- Boost results that are graph-connected to query context
- Return both direct matches and graph-discovered context
- **Files:** `lib/knowledge/engine.ts`, `lib/graph/traversal.ts`

### 1.4 Chat Analyst Integration
- Update `search_knowledge` tool to use graph-enhanced search
- Add `explore_connections` tool that traverses entity graph from a topic
- **Files:** `lib/chat/tools.ts`

**Cost:** Haiku call per knowledge ingest (~$0.001 each). Near zero for graph traversal.

---

## Phase 2: Dynamic Actor Profiles (2-3 days)

**Goal:** Actors evolve based on real signals and knowledge, not hardcoded JSON.

### 2.1 Actor Knowledge Integration
- Each actor gets a knowledge subgraph (filter by actor name/region)
- When game theory runs, pull latest signals, predictions, knowledge for each actor
- Actor capabilities, objectives, redlines adjust based on recent events
- **Files:** `lib/game-theory/actors.ts`, `lib/game-theory/dynamic-payoffs.ts`

### 2.2 Belief Update Engine
- When signals fire or predictions resolve, update actor type distributions (Bayesian priors)
- Store actor state snapshots in DB (new `actor_states` table)
- Track how actor postures shift over time
- **New table:** `actor_states` (actorId, beliefs JSON, lastUpdated, stateHistory JSON)
- **Files:** new `lib/game-theory/actor-state.ts`, `lib/game-theory/bayesian.ts`

### 2.3 Actor Deliberation (Lightweight Council)
- For key scenarios, run one Haiku call per actor (5-8 calls, not thousands)
- Each call gets: actor profile + recent signals + knowledge context + current scenario state
- Returns: actor's likely response, updated strategy preferences, internal reasoning
- Feeds back into game theory payoff adjustments
- **Files:** new `lib/game-theory/deliberation.ts`, `lib/game-theory/dynamic-payoffs.ts`

### 2.4 Actor Memory
- Actors remember past scenario outcomes (stored in actor_states)
- "Iran chose brinkmanship last time and it led to sanctions" informs future probability weighting
- Simple reinforcement: strategies that worked get probability boosts
- **Files:** `lib/game-theory/actor-state.ts`, `lib/game-theory/bayesian.ts`

**Cost:** 5-8 Haiku calls per scenario refresh (~$0.01-0.02 per run)

---

## Phase 3: Scenario Sandbox / God's Eye (3-5 days)

**Goal:** Live, interactive scenarios where users inject variables and watch the system respond.

### 3.1 Persistent Scenario Sessions
- Scenarios become live sessions (like chat sessions) with persisted state
- New `scenario_sessions` table: scenario config, current state, event log, actor states
- Users can have multiple running scenarios
- **New table:** `scenario_sessions` (id, userId, scenarioId, state JSON, eventLog JSON, createdAt)
- **Files:** new `lib/game-theory/sandbox.ts`

### 3.2 Variable Injection API
- POST endpoint: inject an event into a running scenario
- "Iran test-fires ballistic missile" or "OPEC announces emergency cut"
- System re-runs actor deliberation, updates payoffs, recalculates equilibria
- Returns before/after comparison, which actors shifted, market impact delta
- **Files:** new `app/api/game-theory/sandbox/route.ts`

### 3.3 Event Cascade Simulation
- When variable injected, run 2-3 rounds of actor responses
- Round 1: immediate reactions (each actor responds to event)
- Round 2: secondary responses (actors respond to each other's round 1 moves)
- Round 3: stabilization or escalation assessment
- 3 rounds x 5-8 actors = 15-24 Haiku calls total
- **Files:** `lib/game-theory/sandbox.ts`, `lib/game-theory/deliberation.ts`

### 3.4 War Room Integration
- Scenario sandbox embedded in war room page
- Map shows actor positions and movements
- Timeline shows event cascade as it unfolds
- Signal overlay highlights which real signals match the scenario
- **Files:** new `app/game-theory/sandbox/page.tsx`, `components/warroom/scenario-overlay.tsx`

### 3.5 Auto-Trigger from Signals
- When high-intensity signal fires matching a running scenario, auto-inject it
- "Signal detected: Iran nuclear facility activity" feeds into Iran Nuclear scenario
- User gets notified that their scenario updated
- **Files:** `lib/game-theory/sandbox.ts`, `lib/signals/` (hook into signal pipeline)

**Cost:** 15-24 Haiku calls per variable injection (~$0.03-0.05 per event)

---

## What We're NOT Doing

- **Thousands of agents**: Too expensive, too slow. 5-8 well-prompted actors > 1000 generic ones
- **Replacing formal game theory**: Nash/QRE/Fearon stay. Adding dynamism on top.
- **Open-ended sandbox**: Scenarios need structured actors and strategy sets. Injection is structured.
- **New dependencies**: No Zep, no GraphRAG library. PostgreSQL + JSON is sufficient.
- **Vue/Python**: Everything stays Next.js/TypeScript/PostgreSQL.

## Sequence

Phase 1 first. Then Phase 2. Then Phase 3. Each ships independently. Phase 1 makes Phase 2 better (actors get graph context). Phase 2 makes Phase 3 better (dynamic actors make sandbox interesting).
