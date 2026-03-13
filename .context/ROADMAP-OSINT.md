# NEXUS OSINT & Investigation Capability Roadmap

Roadmap for building Maltego/SpiderFoot-grade entity resolution, dark web intelligence, corporate registry mapping, identity lookups, and blockchain analytics into NEXUS.

---

## Current State

What NEXUS already has that we build on:

| Capability | Current State |
|---|---|
| **Entity Graph** | `entities` + `relationships` tables, Vis.js graph UI, BFS traversal, path finder |
| **Actor Profiles** | 20+ hardcoded Bayesian actor-belief profiles, auto-update from GDELT |
| **OSINT Events** | GDELT integration in war room + chat tools, entity extractor (regex-based) |
| **Knowledge Bank** | pgvector semantic search, 1024-dim Voyage AI embeddings |
| **On-Chain** | Whale alerts (BTC >100), exchange flows (CoinGecko), DeFi TVL, stablecoin metrics |
| **Chat Tools** | Full tool pipeline pattern: definition, executor, widget, renderer |

**Key gaps:** No entity deduplication, no dark web data, no corporate registries, no blockchain entity labelling, no identity resolution, no cross-source entity linking.

---

## Phase 1: Entity Resolution Engine (Weeks 1-3)

**Goal:** Replace regex-based entity extraction with proper entity resolution. Every person, company, domain, wallet, and phone number becomes a node in the graph with deduplicated, linked records.

### Architecture

```
Raw Data (GDELT, news, KB entries, user input)
  -> Entity Extractor (NER + pattern matching)
    -> Entity Resolver (fuzzy match + dedupe against existing graph)
      -> Entity Graph (entities + relationships tables)
        -> Graph UI (Vis.js, already exists)
```

### New Entity Types

Extend the `entities.type` enum:

```
Current: actor | aircraft | vessel | signal | prediction | trade | thesis | sector | ticker | event | location
Add:     person | company | domain | email | phone | username | crypto_wallet | ip_address | document
```

### New Relationship Types

```
Current: affects | triggers | belongs_to | correlated_with | trades | opposes | allies | monitors | predicts | located_in | involves
Add:     owns | directs | registered_to | funds | subsidiary_of | associated_with | sanctioned_by | linked_account
```

### Implementation

1. **`lib/osint/entity-resolver.ts`** - New module
   - Levenshtein + Jaro-Winkler fuzzy matching against existing entities
   - Merge scoring: if confidence > 0.85, auto-merge; 0.6-0.85 flag for review; < 0.6 create new
   - Entity confidence decay over time (stale entities lose weight)

2. **Upgrade `lib/osint/entity-extractor.ts`**
   - Add NER via Claude (batch extraction from text -> structured entities)
   - Keep regex as fast-path, Claude as deep-path
   - Extract: names, companies, domains, emails, phones, wallet addresses, locations

3. **`lib/osint/graph-enricher.ts`** - Auto-link new entities
   - When an entity is created, search KB for mentions
   - Auto-create relationships between co-mentioned entities
   - Weight relationships by co-occurrence frequency

### Third-Party: SpiderFoot (Self-Hosted)

- **What:** Open-source OSINT automation, 100+ data source modules
- **Cost:** Free (self-hosted)
- **Integration:** Deploy as Docker container, call its REST API from NEXUS
- **Use for:** Automated entity enrichment (domain -> IP -> WHOIS -> email -> social)
- **API pattern:** Fire scan -> poll for results -> ingest into entity graph

### Database Changes

```sql
-- Add new columns to entities table
ALTER TABLE entities ADD COLUMN confidence REAL DEFAULT 1.0;
ALTER TABLE entities ADD COLUMN last_verified TIMESTAMP;
ALTER TABLE entities ADD COLUMN merge_history JSONB DEFAULT '[]';

-- Entity aliases (one entity, many names/identifiers)
CREATE TABLE entity_aliases (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
  alias_type TEXT NOT NULL, -- 'name', 'domain', 'email', 'phone', 'wallet', 'username'
  alias_value TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_entity_aliases_value ON entity_aliases(alias_value);
CREATE INDEX idx_entity_aliases_type ON entity_aliases(alias_type);
```

---

## Phase 2: Corporate Registry Integration (Weeks 3-5)

**Goal:** Map shell company structures, directors, beneficial owners across jurisdictions. Start with UK + US (free APIs), expand to OpenCorporates for global coverage.

### Data Sources

| Source | Cost | Coverage | Priority |
|---|---|---|---|
| **Companies House API** | Free | UK companies, officers, PSCs (beneficial owners) | P0 |
| **SEC EDGAR API** | Free | US public companies, filings, officers | P0 |
| **OpenCorporates API** | 2,250 GBP/yr | 200M+ companies, 140+ jurisdictions | P1 |

### Implementation

1. **`lib/corporate/companies-house.ts`**
   - Search companies by name/number
   - Fetch officers, PSCs (persons of significant control)
   - Fetch filing history
   - Rate limit: generous, no published cap
   - Auto-create entity graph nodes: company -> director -> PSC -> registered address

2. **`lib/corporate/sec-edgar.ts`**
   - Search by CIK or company name
   - Fetch filings (10-K, 10-Q, 8-K, 13D/13G for beneficial ownership)
   - 10 req/sec rate limit
   - Extract officers/directors from filing data

3. **`lib/corporate/registry.ts`** - Unified interface
   - `searchCompany(name, jurisdiction?)` -> routes to appropriate API
   - `getCompanyGraph(id)` -> returns full entity subgraph (company + officers + subsidiaries)
   - Results cached in entities table with `type='company'` / `type='person'`

4. **`app/api/corporate/route.ts`** - API endpoint
   - `GET /api/corporate?q=company_name&jurisdiction=uk`
   - `GET /api/corporate/[id]` - Full company profile with graph

5. **Chat tool: `search_corporate_registry`**
   - Natural language: "Who are the directors of XYZ Holdings?"
   - Returns structured company data + auto-links to entity graph

### Entity Graph Integration

When a company is looked up:
- Create `company` entity node
- Create `person` nodes for each director/PSC
- Create `directs` / `owns` relationships with weight = shareholding percentage
- If any person/company already exists in graph, MERGE (don't duplicate)
- Auto-check entity aliases table for matches

---

## Phase 3: Identity Resolution & OSINT Lookups (Weeks 5-7)

**Goal:** Given an email, phone, username, or crypto wallet, map all linked accounts and identities.

### Data Sources

| Source | Cost | Capabilities | Priority |
|---|---|---|---|
| **OSINT Industries** | ~19 GBP/mo (Basic), more for API | Email, phone, username, crypto wallet, name lookup | P0 |
| **Epieos** | ~30 USD/mo | Email + phone reverse lookup, 140+ services | P1 |
| **Holehe** (self-hosted) | Free | Email -> account existence on 120+ sites | P2 (backup) |

### Implementation

1. **`lib/osint/identity-resolver.ts`** - Unified identity lookup
   - `resolveEmail(email)` -> linked accounts, names, social profiles
   - `resolvePhone(phone)` -> linked accounts, carrier info
   - `resolveUsername(username)` -> platform presence map
   - `resolveWallet(address)` -> linked wallets, exchange associations
   - Results create entity nodes + `linked_account` relationships

2. **`app/api/osint/resolve/route.ts`** - API endpoint
   - `POST /api/osint/resolve` with `{ type: 'email', value: 'target@example.com' }`
   - Returns identity graph subgraph
   - Operator tier minimum (sensitive capability)

3. **Chat tool: `resolve_identity`**
   - "What accounts are linked to this email?"
   - Returns structured identity map

### Privacy & Compliance

- All lookups logged with timestamp, user, and justification field
- Results cached but expire after 7 days
- Operator tier minimum for access
- Rate limited: max 50 lookups/day per user

---

## Phase 4: Dark Web & Historical Data (Weeks 7-9)

**Goal:** Search breach databases, dark web archives, and historical web data for asset tracing when subjects scrub their footprint.

### Data Sources

| Source | Cost | Data Types | Priority |
|---|---|---|---|
| **Intelligence X** | 2,500-5,000 EUR/yr | Tor, I2P, paste sites, leaks, WHOIS history | P0 |
| **DeHashed** | ~0.02 USD/query | Breach records (email, password hash, username, address) | P1 |
| **Have I Been Pwned** | ~3.50 USD/mo | Breach confirmation (no actual data) | P2 (lightweight) |

### Implementation

1. **`lib/osint/dark-intel.ts`** - Dark web intelligence module
   - `searchSelector(selector, type)` -> search by email/domain/IP/BTC address/phone
   - `getBreachExposure(email)` -> which breaches contain this email
   - `getHistoricalWHOIS(domain)` -> WHOIS history for domain
   - `getPasteResults(query)` -> paste site mentions

2. **`lib/osint/archive.ts`** - Historical data archiving
   - Snapshot current state of a webpage (via Wayback Machine API, free)
   - Store snapshots in knowledge bank with `category='web_archive'`
   - Diff snapshots over time to detect scrubbing

3. **`app/api/osint/darkint/route.ts`** - API endpoint
   - `POST /api/osint/darkint` with `{ selector: 'target@example.com', type: 'email' }`
   - Institution tier minimum (most sensitive capability)

4. **Chat tool: `search_dark_intel`**
   - "Has this email appeared in any breaches?"
   - "What historical WHOIS records exist for this domain?"

### Data Handling

- Breach data is NEVER stored in NEXUS database (legal risk)
- Results displayed in session only, not persisted
- Audit log of all queries (who searched what, when)
- Institution tier only (highest access level)

---

## Phase 5: Blockchain Analytics (Weeks 9-12)

**Goal:** Trace crypto assets, cluster wallets, identify entity ownership, flag sanctions exposure.

### Data Sources

| Source | Cost | Capabilities | Priority |
|---|---|---|---|
| **Nansen** | 49 USD/mo (Pro) | 500M+ labelled addresses, Smart Money, token flows | P0 |
| **Etherscan API** | Free (3 req/s) | Raw Ethereum tx data, token transfers, contract info | P0 |
| **Blockchair** | Free (1K/day) | Multi-chain raw data (48 chains), SQL-like queries | P1 |
| **Arkham Intelligence** | Application-based | Entity labels, wallet clustering, intent detection | P1 |

### Implementation

1. **Upgrade `lib/on-chain/index.ts`**
   - Add Nansen API: wallet labels, entity attribution, smart money tracking
   - Add Etherscan API: transaction history, token balances, internal txs
   - Add Blockchair: multi-chain coverage for BTC, ETH, and 46 other chains

2. **`lib/on-chain/wallet-resolver.ts`** - Wallet entity resolution
   - `resolveWallet(address, chain)` -> entity label, associated wallets, risk score
   - `getTransactionGraph(address, depth)` -> transaction flow graph (1-3 hops)
   - `checkSanctions(address)` -> match against OFAC SDN list (free, public)
   - Results create `crypto_wallet` entity nodes linked to `person`/`company` entities

3. **`lib/on-chain/sanctions.ts`** - OFAC/sanctions matching
   - Ingest OFAC SDN list (free, updated daily)
   - Match wallet addresses against sanctioned entities
   - Flag in entity graph with `sanctioned_by` relationship

4. **`app/api/on-chain/trace/route.ts`** - Transaction tracing endpoint
   - `POST /api/on-chain/trace` with `{ address: '0x...', chain: 'ethereum', depth: 2 }`
   - Returns transaction graph with entity labels
   - Operator tier minimum

5. **Chat tools:**
   - Upgrade `get_on_chain` with entity labels from Nansen
   - New `trace_wallet` tool for transaction graph queries
   - New `check_sanctions` tool for compliance screening

### Entity Graph Integration

- Every resolved wallet becomes an entity node
- Nansen labels create automatic relationships: wallet -> exchange, wallet -> person
- Transaction flows create `funds` relationships with weight = transaction volume
- Cross-reference with corporate registry: if a company wallet is identified, link to company entity

---

## Phase 6: Investigation Dashboard (Weeks 12-14)

**Goal:** Unified investigation interface that ties all the above together. Think Maltego canvas but in the browser.

### Features

1. **Investigation workspace** - Create named investigations (case files)
2. **Entity canvas** - Drag-and-drop entity graph with manual + automatic enrichment
3. **One-click enrichment** - Right-click entity -> "Enrich from Companies House" / "Resolve identity" / "Trace wallet"
4. **Timeline view** - Chronological view of all entity activity
5. **Report generator** - Export investigation as structured report (PDF)
6. **Collaboration** - Share investigations between users (Institution tier)

### Page: `/investigations`

- New page scaffolded with existing patterns (PageContainer, UpgradeGate)
- Institution tier for full access, Operator tier for read-only view of shared investigations
- Uses existing graph visualization (Vis.js) with enrichment overlays

---

## Provider Cost Summary

| Provider | Annual Cost | Phase | Critical? |
|---|---|---|---|
| SpiderFoot OSS | Free (self-hosted) | 1 | Nice to have |
| Companies House | Free | 2 | Yes |
| SEC EDGAR | Free | 2 | Yes |
| OpenCorporates | 2,250 GBP/yr | 2 | For multi-jurisdiction only |
| OSINT Industries | ~228 GBP/yr (Basic) | 3 | Yes |
| Intelligence X | 2,500-5,000 EUR/yr | 4 | Yes for dark web |
| DeHashed | Pay-per-query (~0.02/q) | 4 | Budget alternative |
| Nansen | 588 USD/yr (Pro) | 5 | Yes for wallet labels |
| Etherscan | Free | 5 | Yes |
| Blockchair | Free (1K/day) | 5 | Yes for multi-chain |

**Minimum viable budget (Phase 1-5):** ~3,500 GBP/yr using free APIs + OSINT Industries + Nansen
**Full capability budget:** ~8,000-10,000 GBP/yr adding Intelligence X + OpenCorporates

---

## Tier Gating

| Capability | Minimum Tier |
|---|---|
| Entity graph (view) | Analyst / Observer |
| Corporate registry lookup | Operator |
| Identity resolution | Operator |
| Blockchain wallet tracing | Operator |
| Dark web / breach search | Institution / Station |
| Investigation workspace | Institution / Station |

---

## Implementation Priority

```
Phase 1 (Entity Resolution)     ████████░░  Foundation - everything depends on this
Phase 2 (Corporate Registry)    ████████░░  High value, free APIs, quick wins
Phase 5 (Blockchain Analytics)  ███████░░░  High demand, cheap providers
Phase 3 (Identity Resolution)   ██████░░░░  Powerful but needs careful compliance
Phase 4 (Dark Web Intel)        █████░░░░░  Most sensitive, highest tier gate
Phase 6 (Investigation UI)      ████░░░░░░  Polish layer, ties it all together
```

Phase 2 and 5 can run in parallel since they share no dependencies. Phase 3 and 4 can also overlap. Phase 6 should wait until at least Phases 1-3 are complete.

---

## Investment Case & Go-to-Market

### Why This Needs Investment

The NEXUS platform core (signals, predictions, chat, trading integration) is built and live. The OSINT investigation layer described in this roadmap is the step-change that moves NEXUS from a market intelligence tool into a full investigation platform competing with Maltego, Palantir, and Chainalysis.

The code itself is not the bottleneck. The platform architecture, entity graph, knowledge bank, and chat tool pipeline are already in place. What requires capital:

1. **Third-party API subscriptions** - The intelligence providers that give NEXUS its data advantage. Minimum viable stack costs ~3,500 GBP/yr, full capability ~8,000-10,000 GBP/yr. These costs scale with usage but the baseline is fixed regardless of revenue.

2. **Compute for self-hosted tooling** - SpiderFoot and any future self-hosted OSINT automation needs a dedicated server or container orchestration. Roughly 50-100 GBP/mo for a capable VPS.

3. **Development runway** - 14 weeks of focused build time across 6 phases. The entity resolution foundation (Phase 1) must be solid before anything else layers on top. Rushing this creates compounding technical debt.

4. **Compliance and legal review** - Phases 3 and 4 (identity resolution, dark web) touch personal data and breach records. Need legal sign-off on data handling, retention policies, and GDPR obligations before going live with those features.

### What We Replace

Investigation firms and due diligence teams currently pay for and manually operate multiple disconnected tools:

| Tool | What They Pay | What NEXUS Replaces It With |
|---|---|---|
| Maltego Professional | 6,600 USD/yr per seat | Entity graph with auto-resolution, one-click enrichment |
| Intelligence X | 2,500-5,000 EUR/yr | Dark web search integrated into entity graph + chat |
| Chainalysis / Elliptic | 10,000+ USD/yr per seat | Blockchain tracing with Nansen labels + sanctions matching |
| OSINT Industries | 228+ GBP/yr | Identity resolution wired into the entity graph |
| OpenCorporates | 2,250 GBP/yr | Corporate registry lookups from multiple jurisdictions |
| Manual entity linking | Hours of analyst time per case | Automated fuzzy matching, deduplication, graph linking |

A single investigation analyst using all of these separately spends 15,000-25,000 USD/yr on tool subscriptions alone, plus significant time doing manual cross-referencing between them. NEXUS wraps all of it into one platform where the AI analyst handles the cross-referencing automatically.

### Revenue Model

The OSINT investigation capability lives in two tiers:

**Operator (199 GBP/mo)** - Corporate registries, identity resolution, blockchain tracing. Target: independent analysts, small due diligence firms, compliance teams. At this price point, one Operator subscription covers our entire minimum API budget.

**Station (custom pricing, target 2,000-5,000 GBP/mo)** - Full capability including dark web intelligence, investigation workspaces, collaboration, and dedicated support. Target: investigation firms (like Conflict International), law firms doing asset tracing, government contractors, family offices doing counterparty due diligence.

### Unit Economics

| Metric | Conservative | Target |
|---|---|---|
| API costs (fixed) | 3,500 GBP/yr | 10,000 GBP/yr (full stack) |
| Compute (self-hosted tools) | 1,200 GBP/yr | 2,400 GBP/yr |
| **Total fixed costs** | **4,700 GBP/yr** | **12,400 GBP/yr** |
| Break-even (Operator only) | 2 subscribers (398 GBP/mo) | 6 subscribers (1,194 GBP/mo) |
| Break-even (1 Station client) | 1 client at 2,000 GBP/mo | 1 client at 2,000 GBP/mo |

One Station client at 2,000 GBP/mo covers the full annual API budget in under 6 months. Three Station clients and the OSINT capability is generating 60,000+ GBP/yr in net margin before counting Operator subscriptions on top.

### Distribution Path

**Phase A: Pilot (Months 1-4)**
- Build Phases 1-3 (entity resolution + corporate registries + identity lookups)
- Approach 2-3 investigation/due diligence firms for paid pilot
- Pilot pricing: discounted Station rate (1,000 GBP/mo) in exchange for feedback and case study rights
- Success metric: pilot clients using NEXUS on real cases, replacing at least 2 existing tools

**Phase B: Launch (Months 4-7)**
- Build Phases 4-5 (dark web + blockchain) based on pilot feedback
- Full Station tier goes live at 2,000-5,000 GBP/mo
- Target: investigation firms, law firms (asset tracing, sanctions compliance), family offices
- Distribution: direct sales, LinkedIn thought leadership on OSINT methodology, conference presence (OSINT conferences, compliance events)

**Phase C: Scale (Months 7-12)**
- Build Phase 6 (investigation dashboard, collaboration, report export)
- Self-serve onboarding for Operator tier
- Partner integrations (law firm case management systems, compliance platforms)
- Target: 10-15 Station clients, 50+ Operator subscribers
- Revenue target: 300,000-500,000 GBP/yr ARR

### What We Need

For an investor meeting, the ask would be:

| Item | Amount | Purpose |
|---|---|---|
| API subscriptions (12mo) | 10,000 GBP | Full third-party data stack |
| Compute infrastructure | 2,400 GBP | Self-hosted OSINT tooling |
| Development runway (6mo) | Variable | Depends on team size and structure |
| Legal/compliance review | 3,000-5,000 GBP | GDPR, data handling, breach data policies |
| **Total (excl. salaries)** | **~17,000 GBP** | |

The non-salary capital requirement is modest. The real investment is time. 6 months of focused development with the API budget covered gets NEXUS to a product that replaces 15,000+ USD/yr of tooling per seat.

### Competitive Positioning

NEXUS is not trying to be Palantir (government contracts, 7-figure deals, 18-month sales cycles). The positioning is:

- **vs Maltego**: Same entity resolution capability, but browser-based, AI-assisted, and with integrated market intelligence. Maltego is desktop software from 2008 with a GUI designed for power users. NEXUS is web-native with natural language queries.
- **vs Chainalysis**: Chainalysis charges enterprise rates for blockchain analytics alone. NEXUS bundles blockchain tracing with corporate registries, identity resolution, and dark web intelligence in one platform.
- **vs Manual OSINT**: The analyst who currently spends 3 hours cross-referencing Maltego, Intelligence X, Companies House, and Etherscan to build an entity map gets it in 30 seconds from the NEXUS chat: "Map the corporate structure and wallet connections for XYZ Holdings."

The moat is the integration. Anyone can sign up for these APIs individually. The value is having them all feed into one entity graph with AI-powered cross-referencing, and having that graph sit alongside the market intelligence, signals, and prediction engine that NEXUS already has. No one else has that combination.

### Risk Factors

1. **API provider risk** - If Intelligence X or Nansen change pricing or restrict API access, we need alternatives ready. The roadmap identifies backup providers for every category.
2. **Legal/compliance** - Dark web data and breach records carry legal obligations. Phase 4 must not ship without legal review.
3. **Pilot conversion** - If pilot clients don't convert to paid Station subscriptions, the revenue model needs recalibration. Mitigation: get written commitment to convert before starting the pilot.
4. **Development timeline** - 14 weeks is aggressive. Phase 1 (entity resolution) is the highest-risk phase because everything builds on it. If it slips, everything slips. Mitigation: keep Phase 1 scope tight, ship minimum viable entity resolution before moving to Phase 2.
