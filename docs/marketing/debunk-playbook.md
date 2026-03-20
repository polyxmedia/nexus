# The Debunk Playbook

How to use public correction as a growth channel for NEXUS.

## Why this works

Most people in fintwit and crypto Twitter post confidently about things they haven't actually built systems around. They'll throw out win rates without calibration data, make geopolitical calls with no framework, or push AI trading tools that have never seen a regime shift. The audience watching these threads is smart enough to notice when someone comes in and surgically picks apart a bad take, they just don't see it happen often because the people who actually know better are usually too busy building to engage.

That's the gap. When you show up in a thread, explain precisely why something is wrong, and do it with enough clarity that lurkers learn something... those lurkers click your profile. They see NEXUS. Some of them convert.

You're not selling anything in the thread. You're demonstrating competence, and the product is sitting right there in your bio for anyone curious enough to look.

## The approach

The formula is simple: find a flawed claim, correct it with specificity, keep it respectful but direct, and let your profile do the rest. Never link NEXUS in the reply unless someone asks. The moment you drop a link unprompted it looks like a shill and the credibility evaporates.

The best debunks teach something. You want the reader to walk away thinking "oh shit, I didn't know that" rather than "this guy is just being contrarian". There's a difference between adding signal and just being a reply guy.

## Target threads

### 1. Inflated win rate claims

These are everywhere. Someone posts a backtest with 85%+ accuracy and no context. The debunk is almost always the same: accuracy on binary outcomes is meaningless without calibration data.

**What to look for:**
- "89% win rate" or similar with no Brier score, no log loss, no calibration curve
- Backtest results on data that doesn't match the claimed trading venue (the XGBoost thread claimed Polymarket results using 2006-2018 data, Polymarket launched in 2020)
- No mention of transaction costs, slippage, or liquidity constraints
- Survivorship bias, showing only the winning trades or the winning model configuration

**How to reply:**

> Solid pipeline overview. The sequential correction framing is clean. Main gap: accuracy on binary outcomes without Brier scores or calibration curves is a vanity metric. If 80% of your contracts resolve YES, predicting YES every time gives you 80%. What's the log loss? What does the calibration curve look like at different confidence bands?

**Why it works:** You're acknowledging what's good (builds goodwill, shows you're not just hating), then pointing out the specific methodological gap that most of their audience won't catch. Anyone who understands statistics will respect this. Anyone who doesn't will learn something.

### 2. Armchair geopolitical predictions

Twitter is full of "WW3 incoming" takes from people who have no framework for assessing escalation probability. They see a headline, extrapolate to the worst case, and post it confidently.

**What to look for:**
- Geopolitical predictions with no defined timeframe or probability
- No mention of actor incentive structures or game theory
- Single-event extrapolation ("Iran attacked a ship, Hormuz is closing")
- No consideration of de-escalation mechanisms or historical base rates

**How to reply:**

> The escalation risk is real but the framing is missing structure. What's the probability estimate and over what timeframe? Hormuz closure has been threatened dozens of times since the Tanker War, the base rate for actual sustained closure is very low because both sides have massive economic incentives to keep it open. You need a payoff matrix here, not a headline extrapolation. Iran's dominant strategy is to threaten without executing because the cost of actual closure is worse for them than the status quo.

**Why it works:** You're introducing game theory and base rates into a conversation that has neither. This is exactly what NEXUS does systematically, so the debunk is a natural demonstration of the product's analytical framework.

### 3. AI trading tools with no regime awareness

Most AI trading products are just pattern matchers trained on a single market regime. They work until the regime shifts, then they blow up. The founders rarely mention this because most of them don't understand it.

**What to look for:**
- "AI-powered trading signals" with no mention of regime detection
- Backtests that span only one market cycle (e.g., 2020-2024 bull run)
- No discussion of what happens during regime shifts, volatility spikes, or correlation breakdowns
- Features that are purely price/volume based with no exogenous signal inputs

**How to reply:**

> The feature set is standard quant: RSI, MACD, volume, momentum. Works fine in a trending regime. What happens when the regime shifts? A model trained on 2020-2024 data has never seen a real rate hiking cycle, a commodity supercycle, or a geopolitical shock that restructures correlations overnight. Without regime detection and exogenous signal inputs (geopolitical risk, OSINT, macro regime state), you're curve-fitting to one market environment and calling it intelligence.

**Why it works:** You're pointing out a structural limitation that most retail traders haven't considered. It positions you as someone who thinks about the failure modes, not just the happy path.

### 4. Prediction market "alpha" that ignores calibration

People post Polymarket strategies that sound clever but miss fundamental statistical concepts. They confuse accuracy with calibration, ignore liquidity, and treat binary outcomes as if they're continuous.

**What to look for:**
- Strategies that enter on model probability vs market price divergence but with arbitrary thresholds
- No discussion of sample size requirements for statistical significance
- Treating prediction markets like equity markets (they have completely different microstructure)
- Claims of edge without out-of-sample validation

**How to reply:**

> The conviction-vs-market-price spread approach is directionally right, that's where edge lives in prediction markets. But the entry threshold (model_probability * 0.5) is arbitrary. Why 0.5? Have you calibrated this against historical resolution data? And the sample size matters here, 1870 trades sounds like a lot but if you're splitting across dozens of market types, individual cells might have 20-30 observations. That's nowhere near enough for statistical significance. What's the p-value on the overall strategy vs a naive baseline?

**Why it works:** You're engaging seriously with the methodology while pointing out the specific statistical weaknesses. This attracts the quantitative audience that NEXUS is built for.

### 5. OSINT takes that miss context

Flight tracking and shipping data get posted on Twitter constantly, usually with breathless interpretations that miss the operational context entirely.

**What to look for:**
- "Military aircraft spotted over [region]" with no baseline comparison
- Shipping disruption claims with no chokepoint volume data
- Conflating routine military exercises with escalation signals
- No historical pattern matching (is this actually unusual?)

**How to reply:**

> FORTE12 flying over the Black Sea isn't a signal, it's been doing regular ISR orbits there since 2014. The signal is when the pattern changes: different altitude profiles, unusual loiter times, additional assets joining that don't normally operate in that theater. Raw ADS-B data without baseline pattern analysis is just noise that looks like intelligence.

**Why it works:** You're demonstrating the difference between raw data and actual intelligence analysis. This is NEXUS's entire value proposition, turning raw signal into contextual intelligence.

### 6. Fake engagement and manufactured social proof

Crypto projects with inflated metrics, bought followers, bot comments. This is an easy debunk because the evidence is right there in the thread.

**What to look for:**
- High view counts with almost no comments
- All comments are generic praise from low-follower accounts
- Contract address dropped in an "analysis" thread
- Revenue claims that are actually just trading fees from their own liquidity

**How to reply:**

> 200K views, 3 comments, all positive, all from accounts with under 500 followers. That's bought engagement. Real 200K-view tweets get hundreds of replies, many of them critical. The "$975 in real revenue" is trading fees from self-provided liquidity, not product revenue. The thread exists to get you to buy the token, everything above the CA is marketing copy.

**Why it works:** You're protecting the audience from a scam while demonstrating analytical rigor. People remember the person who called bullshit when everyone else was nodding along.

## Where to find these threads

**Search queries to monitor:**
- "win rate" + "backtest" or "accuracy"
- "AI trading" + "signals" or "bot"
- "prediction market" + "strategy" or "alpha"
- "geopolitical risk" + "market" or "portfolio"
- "OSINT" + "military" or "shipping" or "flight"
- "escalation" + "probability" or "war"
- Polymarket, Metaculus, prediction accuracy
- FOMC, macro, regime shift, vol

**Accounts to watch (not to engage directly, but their threads attract the right audience):**
- Macro traders posting about geopolitical risk
- OSINT community accounts (flight trackers, conflict monitors)
- Prediction market traders posting strategies
- Quant finance accounts discussing methodology
- AI x finance builders

## Rules of engagement

- **Never link NEXUS unprompted.** Let the profile do the work.
- **Always acknowledge what's good before pointing out what's wrong.** You're correcting, not attacking.
- **Be specific.** Vague criticism looks like jealousy. Specific criticism looks like expertise.
- **Keep it one reply.** Don't get into extended arguments. Make your point, let it stand.
- **Don't punch down.** Don't correct obvious beginners. Target people who are presenting themselves as experts.
- **If someone asks about NEXUS in a reply, answer directly.** That's organic interest, serve it.
- **Post from @nexushqintel when debunking.** It builds the brand account's authority directly.

## Measuring what works

Track which debunk threads actually drive profile visits and signups. Over time you'll see which topics and which style of correction converts best. The quant methodology debunks will probably outperform the crypto scam callouts because the audience quality is higher, but test both.

The gold check will amplify all of this. Verified org account replying with a precise technical correction carries weight that a personal account can't match.

## The long game

Every good debunk is a piece of content. Screenshot the thread, write it up as a short post on the NEXUS blog or research section. "We saw this claim on Twitter. Here's why it's wrong, and here's how NEXUS handles this differently." Now you've got SEO content, social proof, and a methodology showcase all from one reply.

The debunk isn't the end product, it's the seed. The thread gets you noticed, the profile gets you clicked, the platform gets you converted, and the writeup gets you indexed.
