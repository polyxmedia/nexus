# I Built an Intelligence Platform That Predicts Markets With 89% Accuracy. Here's How.

I've been building NEXUS for a while now. It started as a side project, one of those things where you're just scratching your own itch, and somewhere along the way it turned into something that genuinely works. The platform is hitting 89% accuracy on market predictions, with most of them confirming within days of being generated. I want to walk you through how I built it, what it actually does, and why the methodology matters more than the tech stack.

## What NEXUS actually is

NEXUS is an intelligence platform that fuses geopolitical signals, market data, open source intelligence, and systemic risk indicators into a unified picture. It generates falsifiable predictions, tracks them against reality, and feeds the results back into itself to get better over time.

The core idea is simple... markets and geopolitics aren't separate systems. They're deeply interconnected, and most analysis treats them as if they exist in isolation. A sanctions announcement moves oil prices. A military exercise shifts capital flows. An election result reprices entire sectors. NEXUS watches all of these layers simultaneously and identifies convergences, moments where multiple independent signals point in the same direction.

When enough independent layers align, the probability of a meaningful move goes up significantly. That's the edge.

## The signal architecture

The platform monitors four primary signal layers, each operating on different time scales.

**Geopolitical signals** have a long decay, days to years. These are conflicts, treaties, sanctions, regime changes, military deployments. The kind of macro events that reshape the operating environment.

**Market signals** have a short decay, hours to days. Price action anomalies, unusual volume, options flow, credit spread movements. The quantitative backbone.

**Open source intelligence** sits in the middle, days to weeks. This is ground truth validation. Social media, shipping data, flight tracking, news wires. It either confirms or contradicts what the other layers are suggesting.

**Systemic risk** has variable decay. Contagion modeling, yield curve analysis, VIX regime detection. The early warning system.

Each signal gets normalized into a common schema with a timestamp, category, affected entities, geographic scope, and an intensity score from 1 to 5. A level 5 signal, full alignment across all layers, is rare and historically precedes major market dislocations within 72 hours.

The signals feed into a Bayesian fusion engine that calculates likelihood ratios and conditional dependencies between layer pairs. It's not a simple average, it respects the fact that some layer combinations are more informative than others.

## Predictions that actually get scored

This is where most platforms fall apart. Everyone can make predictions. Almost nobody tracks them rigorously.

Every prediction NEXUS generates has to be falsifiable, with a specific claim, a measurable threshold, and a deadline. "SPY will close below $500 on at least 3 trading days within 14 days" is a valid prediction. "Markets look bearish" is not.

The system scores predictions using the Brier score, the same metric used in academic forecasting research and intelligence community assessments. It measures the squared error between your stated confidence and the actual outcome. Lower is better. 0 is perfect, 0.25 is coin-flip baseline.

Every prediction gets tagged with the market regime at creation, reference prices are captured as a snapshot, and the system tracks direction accuracy and price level accuracy separately. If you got the direction right but missed the target, that's a partial hit, and the scoring reflects that distinction.

The really important bit... predictions are locked as "pre-event" before the thing they're predicting can happen. If a wartime threshold triggers after you made a prediction about a conflict, that prediction gets marked post-event and excluded from your accuracy metrics. This ensures you're only measuring genuine forecasting ability, not hindsight.

## The calibration feedback loop

This is what makes NEXUS actually scientific rather than just another AI wrapper.

Every time predictions resolve, the system computes a full performance report. Brier score, log loss, binary accuracy, calibration gap, per-category breakdowns, per-timeframe breakdowns, failure pattern analysis. It uses Wilson score intervals for confidence bounds and bootstrapped Brier confidence intervals, the same statistical machinery you'd find in academic papers.

That report feeds directly back into the prediction generator. If the system has been overconfident on geopolitical predictions, the next batch gets generated with that knowledge baked in. If market predictions in the 7-day timeframe are performing well, the system knows to trust that window. If there's a consistent failure pattern, like compound probability claims being systematically too confident, the generator learns to correct for it.

The feedback includes a damped half-gap correction to prevent oscillation. You don't want the system overcorrecting from overconfident to underconfident and back again every cycle. It adjusts gradually, converging toward true calibration over time.

We actually caught an interesting calibration bug recently. The system was hitting 100% on market predictions but the Brier score was getting worse. Turns out the confidence levels were being artificially suppressed by hardcoded rules I'd written early on when the system was overconfident. The predictions were right every time, but the system was stating 40% confidence on things it should have been stating 75% on. Brier punishes underconfidence just as hard as overconfidence. Fixed the rules to be dynamic, driven by actual track record data rather than assumptions.

## Game theory as a reasoning framework

NEXUS doesn't just look at signals in isolation, it models the strategic interactions between actors. The game theory engine runs Nash equilibrium analysis across geopolitical scenarios, computing payoff matrices, best-response strategies, and stability classifications.

There's a five-level escalation ladder from diplomatic tensions up to direct confrontation, with quantified thresholds at each level. When a threshold fires, the system invalidates strategies that are no longer viable and activates escalation trajectory estimates.

The more sophisticated layer uses Bayesian N-Player analysis with incomplete information. Actors have private types, belief distributions get updated via Bayes' rule from observed signals, and the system finds Perfect Bayesian equilibria with audience cost constraints. If an actor can't back down publicly, that constrains their strategy space in quantifiable ways.

There's also a Fearon bargaining model. When the negotiation space between two actors collapses below 20%, conflict becomes the likely outcome regardless of whether either side "wants" it. That signal gets weighted heavily in prediction generation.

## Red team everything

Every prediction batch goes through an adversarial challenge before it ships. A separate AI prompt acts as red team, arguing against the prevailing thesis direction, challenging Bayesian analysis assumptions, identifying what would need to be true for the thesis to be completely wrong, and naming the weakest assumptions.

That devil's advocate output gets injected into the main prediction generator so it has to contend with the strongest counterarguments before assigning confidence levels. It's structured disagreement, borrowed from the intelligence community and Philip Tetlock's Good Judgment Project research.

## Grounded in real data, not vibes

Everything NEXUS produces traces back to actual data sources. Market data comes from Alpha Vantage, economic indicators from FRED, geopolitical events from GDELT's real-time feeds, conflict data from ACLED, flight tracking from OpenSky Network, vessel tracking for maritime chokepoints.

When the prediction resolver evaluates whether a prediction hit or missed, it fetches current market data and recent geopolitical events, then makes the judgment based on evidence it can cite. "HG hit target above 4.5 on 2026-03-09, 2026-03-10. Current price: 28.89 (started at 28.19)." Specific numbers, specific dates.

If the data isn't available to evaluate a prediction, the system doesn't guess. It marks it for retry on the next cycle rather than making a call with insufficient information.

## Base rate anchoring

One of the biggest sources of forecasting error is base rate neglect, people overweight the current narrative and forget how often similar situations have played out historically.

NEXUS maintains a knowledge bank with semantic vector search across historical events, resolved predictions, and signal archives. When generating new predictions, it pulls structural parallels, scoring them on actor constellation overlap, escalation dynamics, economic preconditions, and temporal context. The generator has to anchor on base rates before adjusting for current circumstances.

Specific price targets within narrow windows confirm about 25-35% of the time historically. Geopolitical "at least one announcement" type claims confirm 40-60%. These base rates are baked into the prompt so the AI can't just pattern-match on the current narrative and assign 80% confidence to everything.

## The tech stack

Built on Next.js 15 with Turbopack, React 19, TypeScript. PostgreSQL with Drizzle ORM for the data layer, pgvector for semantic embeddings. Tailwind v4 and Radix UI for the interface. Authentication through next-auth, payments through Stripe.

The AI layer uses Anthropic's Claude, Sonnet for prediction generation and thesis synthesis, Haiku for resolution scoring. Voyage AI handles the 1024-dimensional embeddings for the knowledge bank and historical parallel search.

The War Room runs on Leaflet with real-time aircraft tracking, vessel monitoring, OSINT event feeds, and conflict heatmaps. There's a 3D globe view with custom earth shaders for briefing contexts.

Honestly the tech stack is the least interesting part. You could build this on different tools and get similar results. The methodology is what matters.

## What I've learned

Building NEXUS taught me that the hard part of prediction isn't the prediction itself, it's the scoring. Anyone can claim they called something. Very few people track every call they make with timestamps, confidence levels, and objective resolution criteria. When you do that honestly, you discover uncomfortable things about your own calibration, and that discomfort is where the improvement comes from.

The system started overconfident. The data showed that clearly. Then we corrected too hard and it became underconfident, stating 40% confidence on predictions it was getting right 89% of the time. The feedback loop caught that too, and now it's converging toward something that actually matches reality.

That self-correcting property is the thing I'm most proud of. NEXUS doesn't need me to tune it. It watches its own performance, identifies where it's wrong, and adjusts. Not perfectly, not instantly, but consistently and in the right direction.

The 89% hit rate is real, and the predictions are resolving fast, most within days. Whether that holds across a larger sample and different market conditions is the open question. But the methodology is sound, the scoring is rigorous, and the system is designed to tell you honestly when it stops working, which is more than most things in this space can say.
