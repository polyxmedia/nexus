// ── Training mission definitions ──

export interface MissionStep {
  id: string;
  title: string;
  description: string;
  /** Route to navigate to for this step */
  route: string;
  /** What the user needs to do (shown as instruction) */
  action: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  track: string;
  xp: number;
  steps: MissionStep[];
  /** Icon name from lucide-react */
  icon: string;
  /** Which tier is required */
  minTier: "free" | "analyst" | "operator" | "institution";
  /** Order within track */
  order: number;
}

export interface TrainingProgress {
  completedMissions: string[];
  completedSteps: Record<string, string[]>; // missionId -> stepIds
  completedPlaybooks: string[];
  xp: number;
  level: number;
  startedAt: string;
  lastActivityAt: string;
}

export const TRACKS = [
  { id: "foundations", label: "Foundations", description: "Learn the basics of the platform" },
  { id: "intelligence", label: "Intelligence", description: "Master signal detection and analysis" },
  { id: "analysis", label: "Analysis", description: "Advanced analytical techniques" },
  { id: "operations", label: "Operations", description: "Trading and operational workflows" },
] as const;

export const LEVELS = [
  { level: 1, title: "Recruit", xpRequired: 0 },
  { level: 2, title: "Analyst I", xpRequired: 150 },
  { level: 3, title: "Analyst II", xpRequired: 350 },
  { level: 4, title: "Field Agent", xpRequired: 600 },
  { level: 5, title: "Senior Analyst", xpRequired: 900 },
  { level: 6, title: "Case Officer", xpRequired: 1300 },
  { level: 7, title: "Station Chief", xpRequired: 1800 },
  { level: 8, title: "Director", xpRequired: 2500 },
] as const;

export function getLevelForXp(xp: number): { level: number; title: string; xpRequired: number; nextLevel?: { level: number; title: string; xpRequired: number } } {
  let current: { level: number; title: string; xpRequired: number } = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) current = l;
    else break;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return { ...current, nextLevel: next };
}

export const MISSIONS: Mission[] = [
  // ── Foundations ──
  {
    id: "dashboard-setup",
    title: "Command Center",
    description: "Configure your intelligence dashboard with widgets that matter to your workflow.",
    track: "foundations",
    xp: 50,
    icon: "LayoutDashboard",
    minTier: "free",
    order: 1,
    steps: [
      { id: "visit-dashboard", title: "Open the Dashboard", description: "Navigate to your main dashboard", route: "/dashboard", action: "Visit the Dashboard page" },
      { id: "open-store", title: "Browse the Widget Store", description: "Open the widget store to see available intelligence modules", route: "/dashboard", action: "Click 'Add Widget' to open the store" },
      { id: "add-widget", title: "Install a Widget", description: "Add at least one widget to your dashboard", route: "/dashboard", action: "Select and add any widget from the store" },
    ],
  },
  {
    id: "first-chat",
    title: "Meet the Analyst",
    description: "Start a conversation with the AI intelligence analyst. Ask about any geopolitical or market topic.",
    track: "foundations",
    xp: 50,
    icon: "MessageSquare",
    minTier: "free",
    order: 2,
    steps: [
      { id: "visit-chat", title: "Open Chat", description: "Navigate to the AI analyst chat", route: "/chat", action: "Go to the Chat page" },
      { id: "send-message", title: "Ask a Question", description: "Send your first message to the analyst", route: "/chat", action: "Type a question about any geopolitical or market topic and send it" },
      { id: "read-response", title: "Review the Analysis", description: "Read the analyst's response and note the tools it uses", route: "/chat", action: "Read the response and observe the tool calls the analyst makes" },
    ],
  },
  {
    id: "news-scan",
    title: "Morning Brief",
    description: "Learn to scan the news feed for developing situations across multiple sources.",
    track: "foundations",
    xp: 40,
    icon: "Newspaper",
    minTier: "free",
    order: 3,
    steps: [
      { id: "visit-news", title: "Open News Feed", description: "Navigate to the aggregated news feed", route: "/news", action: "Go to the News page" },
      { id: "filter-news", title: "Filter by Category", description: "Use category filters to narrow down relevant stories", route: "/news", action: "Select a category filter to focus your scan" },
    ],
  },
  {
    id: "settings-tour",
    title: "Secure Your Station",
    description: "Configure your account settings and understand the platform controls.",
    track: "foundations",
    xp: 30,
    icon: "Settings",
    minTier: "free",
    order: 4,
    steps: [
      { id: "visit-settings", title: "Open Settings", description: "Navigate to your settings page", route: "/settings", action: "Go to Settings" },
      { id: "review-profile", title: "Review Your Profile", description: "Check your subscription tier and account details", route: "/settings", action: "Review your account information and subscription status" },
    ],
  },

  // ── Intelligence ──
  {
    id: "signal-detection",
    title: "Signal Hunter",
    description: "Learn to read signal detections across the four primary intelligence layers.",
    track: "intelligence",
    xp: 75,
    icon: "Activity",
    minTier: "free",
    order: 1,
    steps: [
      { id: "visit-signals", title: "Open Signals", description: "Navigate to the signal detection feed", route: "/signals", action: "Go to the Signals page" },
      { id: "read-signal", title: "Read a Detection", description: "Click into a signal to read its full analysis", route: "/signals", action: "Click on any signal to view its detail page" },
      { id: "check-layers", title: "Identify the Layers", description: "Note which intelligence layers contributed to the detection", route: "/signals", action: "Identify the GEO, MKT, OSI, or systemic risk layers in the signal" },
    ],
  },
  {
    id: "first-prediction",
    title: "On the Record",
    description: "Create your first prediction and put your analysis on record for scoring.",
    track: "intelligence",
    xp: 100,
    icon: "Crosshair",
    minTier: "free",
    order: 2,
    steps: [
      { id: "visit-predictions", title: "Open Predictions", description: "Navigate to the prediction tracker", route: "/predictions", action: "Go to the Predictions page" },
      { id: "review-existing", title: "Study Existing Predictions", description: "Review how predictions are structured with claims, timeframes, and confidence", route: "/predictions", action: "Read through existing predictions and note their structure" },
      { id: "create-prediction", title: "Create a Prediction", description: "Use the AI chat to generate a prediction based on current signals", route: "/chat", action: "Ask the analyst to create a prediction about a current situation" },
    ],
  },
  {
    id: "warroom-recon",
    title: "War Room Recon",
    description: "Explore the geospatial war room with real-time aircraft tracking and OSINT overlays.",
    track: "intelligence",
    xp: 75,
    icon: "Shield",
    minTier: "free",
    order: 3,
    steps: [
      { id: "visit-warroom", title: "Enter the War Room", description: "Open the geospatial intelligence map", route: "/warroom", action: "Go to the War Room page" },
      { id: "explore-map", title: "Navigate the Map", description: "Pan and zoom to explore different regions", route: "/warroom", action: "Pan the map to a region of interest and zoom in" },
      { id: "check-layers", title: "Toggle Data Layers", description: "Enable aircraft tracking or OSINT event overlays", route: "/warroom", action: "Toggle the aircraft or OSINT layers on the map" },
    ],
  },
  {
    id: "knowledge-bank",
    title: "Intel Library",
    description: "Search the knowledge bank and understand how embedded intelligence works.",
    track: "intelligence",
    xp: 60,
    icon: "BookOpen",
    minTier: "free",
    order: 4,
    steps: [
      { id: "visit-knowledge", title: "Open Knowledge Bank", description: "Navigate to the knowledge repository", route: "/knowledge", action: "Go to the Knowledge page" },
      { id: "search-knowledge", title: "Search for Intel", description: "Use the search to find intelligence on a topic", route: "/knowledge", action: "Search for a topic and review the results" },
    ],
  },

  // ── Analysis ──
  {
    id: "game-theory",
    title: "Strategic Wargame",
    description: "Run a game theory scenario to model strategic interactions between state actors.",
    track: "analysis",
    xp: 100,
    icon: "Swords",
    minTier: "free",
    order: 1,
    steps: [
      { id: "visit-gametheory", title: "Open Game Theory", description: "Navigate to the game theory module", route: "/game-theory", action: "Go to the Game Theory page" },
      { id: "view-scenario", title: "Study a Scenario", description: "Read through an existing game theory scenario", route: "/game-theory", action: "Click into a scenario to view its payoff matrix and analysis" },
      { id: "create-scenario", title: "Create a Scenario", description: "Ask the AI analyst to model a new strategic interaction", route: "/chat", action: "Ask the analyst to run a game theory analysis on a geopolitical situation" },
    ],
  },
  {
    id: "narrative-tracking",
    title: "Narrative Mapper",
    description: "Track competing narratives and understand how they influence market sentiment.",
    track: "analysis",
    xp: 75,
    icon: "Globe",
    minTier: "free",
    order: 2,
    steps: [
      { id: "visit-narrative", title: "Open Narratives", description: "Navigate to the narrative tracker", route: "/narrative", action: "Go to the Narratives page" },
      { id: "read-narrative", title: "Analyze a Narrative", description: "Read a narrative thread and its supporting signals", route: "/narrative", action: "Click into a narrative to understand its components" },
    ],
  },
  {
    id: "prediction-accuracy",
    title: "Calibration Check",
    description: "Review your prediction accuracy and understand Brier scoring methodology.",
    track: "analysis",
    xp: 75,
    icon: "Target",
    minTier: "free",
    order: 3,
    steps: [
      { id: "visit-predictions", title: "Open Predictions", description: "Navigate back to predictions", route: "/predictions", action: "Go to the Predictions page" },
      { id: "check-scores", title: "Review Accuracy Scores", description: "Look at the Brier scores and accuracy metrics", route: "/predictions", action: "Find the accuracy metrics and Brier score breakdown" },
      { id: "understand-brier", title: "Understand Brier Scoring", description: "Read the methodology behind the scoring system", route: "/research/prediction-calibration", action: "Visit the prediction calibration research page" },
    ],
  },
  {
    id: "actor-profiling",
    title: "Know Your Actors",
    description: "Study actor profiles and understand how belief systems drive geopolitical behavior.",
    track: "analysis",
    xp: 60,
    icon: "Users",
    minTier: "free",
    order: 4,
    steps: [
      { id: "visit-actors", title: "Open Actors", description: "Navigate to the actor database", route: "/actors", action: "Go to the Actors page" },
      { id: "study-actor", title: "Study an Actor Profile", description: "Read through an actor's profile and belief framework", route: "/actors", action: "Click into an actor profile and review their analysis" },
    ],
  },

  // ── Operations ──
  {
    id: "market-data",
    title: "Market Reconnaissance",
    description: "Access real-time market data and understand macro indicators.",
    track: "operations",
    xp: 75,
    icon: "BarChart3",
    minTier: "operator",
    order: 1,
    steps: [
      { id: "visit-markets", title: "Open Markets", description: "Navigate to the markets overview", route: "/markets", action: "Go to the Markets page" },
      { id: "check-chart", title: "View a Price Chart", description: "Open a chart for any symbol", route: "/markets", action: "View a price chart and study the regime indicator" },
      { id: "check-macro", title: "Review Macro Data", description: "Check the macro economic indicators from FRED", route: "/markets", action: "Review the macro dashboard for economic signals" },
    ],
  },
  {
    id: "trading-setup",
    title: "Trading Station",
    description: "Connect your trading account and understand the execution pipeline.",
    track: "operations",
    xp: 100,
    icon: "TrendingUp",
    minTier: "operator",
    order: 2,
    steps: [
      { id: "visit-trading", title: "Open Trading", description: "Navigate to the trading module", route: "/trading", action: "Go to the Trading page" },
      { id: "connect-account", title: "Configure API Keys", description: "Set up your Trading 212 or Coinbase API keys", route: "/settings", action: "Go to Settings and add your trading API keys" },
      { id: "view-portfolio", title: "View Your Portfolio", description: "Check your portfolio positions and P&L", route: "/trading", action: "Review your current positions and portfolio value" },
    ],
  },
  {
    id: "thesis-generation",
    title: "Thesis Architect",
    description: "Generate and refine an AI-powered investment thesis based on convergent signals.",
    track: "operations",
    xp: 100,
    icon: "FileText",
    minTier: "operator",
    order: 3,
    steps: [
      { id: "visit-thesis", title: "Open Thesis", description: "Navigate to the thesis module", route: "/thesis", action: "Go to the Thesis page" },
      { id: "review-thesis", title: "Review Active Thesis", description: "Read the current AI-generated thesis", route: "/thesis", action: "Read through the active thesis and its supporting evidence" },
      { id: "generate-thesis", title: "Generate a New Thesis", description: "Ask the analyst to generate a thesis based on current conditions", route: "/chat", action: "Ask the analyst to generate a new thesis" },
    ],
  },
  {
    id: "alerts-setup",
    title: "Trip Wires",
    description: "Set up alert chains to get notified when conditions meet your criteria.",
    track: "operations",
    xp: 60,
    icon: "Bell",
    minTier: "free",
    order: 4,
    steps: [
      { id: "visit-alerts", title: "Open Alerts", description: "Navigate to the alerts configuration", route: "/alerts", action: "Go to the Alerts page" },
      { id: "create-alert", title: "Create an Alert", description: "Set up a new alert for a signal or price condition", route: "/alerts", action: "Create a new alert chain with your criteria" },
    ],
  },
];

export function getMissionsByTrack(trackId: string): Mission[] {
  return MISSIONS.filter((m) => m.track === trackId).sort((a, b) => a.order - b.order);
}

export function getTotalXp(): number {
  return MISSIONS.reduce((sum, m) => sum + m.xp, 0);
}

export function getTrackProgress(trackId: string, completed: string[]): number {
  const trackMissions = MISSIONS.filter((m) => m.track === trackId);
  if (trackMissions.length === 0) return 0;
  const done = trackMissions.filter((m) => completed.includes(m.id)).length;
  return Math.round((done / trackMissions.length) * 100);
}

// ── Playbooks: end-to-end workflows showing how tools work together ──

export interface PlaybookStep {
  tool: string;
  icon: string;
  route: string;
  action: string;
  output: string;
}

export interface Playbook {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  accent: "cyan" | "amber" | "emerald" | "rose";
  steps: PlaybookStep[];
  xp: number;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: "morning-brief",
    title: "Morning Intelligence Brief",
    subtitle: "Daily situational awareness routine",
    description: "The daily workflow every analyst should run to stay on top of developing situations. Start with the news scan, check signal detections, review your dashboard, then ask the AI analyst to synthesize everything into a morning brief.",
    duration: "15-20 min",
    difficulty: "beginner",
    accent: "cyan",
    xp: 75,
    steps: [
      { tool: "News Feed", icon: "Newspaper", route: "/news", action: "Scan the aggregated news feed across all sources. Look for clustering: multiple outlets covering the same event signals importance.", output: "Mental map of developing stories and regional hotspots" },
      { tool: "Signals", icon: "Activity", route: "/signals", action: "Check the signal detection feed. Filter by intensity 4-5 to see high-priority detections. Note which layers are firing: GEO, MKT, OSI, or systemic risk.", output: "List of active high-intensity signals and their contributing layers" },
      { tool: "Dashboard", icon: "LayoutDashboard", route: "/dashboard", action: "Review your dashboard widgets: threat level, market regime, VIX, and active thesis. These give you the macro picture at a glance.", output: "Snapshot of current threat environment and market conditions" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst: 'Give me a morning intelligence brief covering the top 3 developing situations, their signal convergence, and any predictions that need attention.' The analyst will pull from signals, news, predictions, and knowledge bank.", output: "Synthesized brief connecting news, signals, and predictions into actionable intelligence" },
      { tool: "Predictions", icon: "Crosshair", route: "/predictions", action: "Check any predictions approaching their deadline. Review if new information has changed the probability. Ask the analyst to resolve any that have reached their outcome.", output: "Updated prediction tracker with resolved outcomes and accuracy scores" },
    ],
  },
  {
    id: "threat-assessment",
    title: "Threat Assessment Pipeline",
    subtitle: "From signal detection to prediction",
    description: "When a new threat emerges, this is the full analytical pipeline. You take a signal detection, validate it against OSINT in the war room, model the strategic dynamics with game theory, search for historical parallels, and log a formal prediction.",
    duration: "30-45 min",
    difficulty: "intermediate",
    accent: "rose",
    xp: 100,
    steps: [
      { tool: "Signals", icon: "Activity", route: "/signals", action: "Identify the triggering signal. Read its full analysis: which layers contributed, what sectors are affected, and what the historical precedent says.", output: "Signal profile with layer breakdown and affected market sectors" },
      { tool: "War Room", icon: "Shield", route: "/warroom", action: "Open the war room and navigate to the relevant region. Enable OSINT overlays to see GDELT event data clustering. Check aircraft tracking for military movements if relevant.", output: "Geospatial confirmation of signal through OSINT and movement data" },
      { tool: "Knowledge Bank", icon: "BookOpen", route: "/knowledge", action: "Search the knowledge bank for related intelligence. The embedding search finds semantically similar past analyses, not just keyword matches.", output: "Historical context and prior analyses on similar situations" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst to run a game theory analysis on the situation. Specify the key actors and their options. The analyst will generate a payoff matrix and identify Nash equilibria.", output: "Game theory scenario with strategic options, payoff matrix, and equilibrium analysis" },
      { tool: "Game Theory", icon: "Swords", route: "/game-theory", action: "Review the generated scenario on the game theory page. Check the escalation trajectories and wartime threshold indicators.", output: "Saved scenario with escalation paths and threshold alerts" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst to create a formal prediction based on the analysis. Specify the claim, timeframe, and confidence level. The prediction gets regime-tagged and reference-priced automatically.", output: "Logged prediction with regime tag, reference prices, and Brier-ready structure" },
      { tool: "Predictions", icon: "Crosshair", route: "/predictions", action: "Verify the prediction appears in the tracker. Note the regime tag and pre-event status. Set a reminder to check it before the deadline.", output: "Tracked prediction ready for resolution and scoring" },
    ],
  },
  {
    id: "trade-thesis",
    title: "Signal-to-Trade Pipeline",
    subtitle: "From intelligence to execution",
    description: "The complete pipeline from intelligence signals through thesis generation to trade execution. This is how the platform converts geopolitical and market intelligence into actionable trading decisions with full audit trail.",
    duration: "45-60 min",
    difficulty: "advanced",
    accent: "emerald",
    xp: 125,
    steps: [
      { tool: "Signals", icon: "Activity", route: "/signals", action: "Identify convergent signals: multiple layers firing on the same theme. GEO + MKT convergence is strongest. Note the affected market sectors listed in the signal.", output: "Convergent signal with multi-layer confirmation and sector mapping" },
      { tool: "Markets", icon: "BarChart3", route: "/markets", action: "Check current prices and regime for the affected sectors. Review the macro dashboard for supporting or contradicting economic data. Note the current market regime (risk-on/off).", output: "Market context: current prices, regime classification, macro backdrop" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst to generate a thesis: 'Based on current signal convergence and market conditions, generate a thesis with trade recommendations, confidence level, and risk factors.'", output: "AI-generated thesis with directional view, confidence, and risk assessment" },
      { tool: "Thesis", icon: "FileText", route: "/thesis", action: "Review the generated thesis on the thesis page. Check the confidence level, supporting signals, and risk factors. The thesis updates as new signals come in.", output: "Reviewed thesis with clear directional view and risk parameters" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst to create a prediction tied to the thesis. This puts the thesis on record for scoring and creates accountability.", output: "Formal prediction linked to the thesis for accuracy tracking" },
      { tool: "Trading", icon: "TrendingUp", route: "/trading", action: "If you have a connected trading account, review the thesis recommendations against your portfolio. Execute trades through the Trading 212 or Coinbase integration.", output: "Executed trades with full audit trail back to the originating signals" },
      { tool: "Dashboard", icon: "LayoutDashboard", route: "/dashboard", action: "Add the relevant price chart to your dashboard to monitor the position. The portfolio widget tracks P&L in real time.", output: "Live monitoring of the trade with P&L tracking on your dashboard" },
    ],
  },
  {
    id: "deep-research",
    title: "Deep Research Workflow",
    subtitle: "Structured analysis of complex situations",
    description: "When you need to go deep on a topic, this workflow chains the knowledge bank, actor profiles, narrative tracking, and historical parallels into a structured analytical product. Use this for complex, multi-actor situations that need rigorous analysis.",
    duration: "30-45 min",
    difficulty: "intermediate",
    accent: "amber",
    xp: 100,
    steps: [
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Start with a broad question to scope the research: 'What do we know about [topic]? Search the knowledge bank and identify gaps.' The analyst will search embeddings and flag what's missing.", output: "Research scope with known intelligence and identified collection gaps" },
      { tool: "Knowledge Bank", icon: "BookOpen", route: "/knowledge", action: "Browse the knowledge bank results directly. Read the full entries for the most relevant hits. Note the embedding similarity scores to understand relevance.", output: "Curated set of relevant intelligence from the knowledge bank" },
      { tool: "Actors", icon: "Users", route: "/actors", action: "Identify the key actors in the situation. Read their profiles to understand belief systems, motivations, and historical behavior patterns.", output: "Actor profiles with belief frameworks and behavioral patterns" },
      { tool: "Narratives", icon: "Globe", route: "/narrative", action: "Check the narrative tracker for competing narratives around the topic. Understand which narratives are gaining or losing influence.", output: "Narrative landscape showing competing interpretations and their momentum" },
      { tool: "Parallels", icon: "History", route: "/parallels", action: "Search for historical parallels. The platform finds structurally similar past situations to inform your analysis of how this could develop.", output: "Historical precedents with structural similarity analysis" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst to synthesize everything: 'Based on the knowledge bank results, actor profiles, active narratives, and historical parallels, write a structured analytical assessment of [topic] with confidence levels and key uncertainties.'", output: "Structured analytical product with sourced assessments and uncertainty mapping" },
      { tool: "Knowledge Bank", icon: "BookOpen", route: "/knowledge", action: "Save the final assessment to the knowledge bank so it's available for future queries. The embedding will make it findable by semantic search.", output: "Persisted analysis that enriches future intelligence queries" },
    ],
  },
  {
    id: "calibration-review",
    title: "Prediction Calibration Review",
    subtitle: "Audit your analytical accuracy",
    description: "Regular calibration review to understand your prediction accuracy, identify systematic biases, and improve your forecasting. This is how you get better at intelligence analysis over time.",
    duration: "20-30 min",
    difficulty: "intermediate",
    accent: "amber",
    xp: 75,
    steps: [
      { tool: "Predictions", icon: "Crosshair", route: "/predictions", action: "Open the prediction tracker and review your overall Brier score. Look at accuracy by category (market vs geopolitical) and by regime (peacetime vs transitional vs wartime).", output: "Baseline accuracy metrics broken down by category and regime" },
      { tool: "Leaderboard", icon: "Trophy", route: "/leaderboard", action: "Check the leaderboard to see how your accuracy compares to the platform benchmarks and other users.", output: "Relative accuracy ranking and benchmark comparison" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Ask the analyst: 'Analyze my prediction history. Where am I overconfident? Where am I underconfident? Are there categories where I consistently miss?' The analyst will run statistical analysis on your prediction record.", output: "Calibration analysis with bias identification and accuracy patterns" },
      { tool: "Research", icon: "BookOpen", route: "/research/prediction-calibration", action: "Review the prediction calibration methodology page. Understand how Brier scoring works, what the direction vs level split measures, and how regime tagging affects scoring.", output: "Deep understanding of the scoring methodology and how to improve" },
      { tool: "AI Chat", icon: "MessageSquare", route: "/chat", action: "Based on the calibration review, ask the analyst to suggest specific improvements: 'Given my calibration analysis, what should I do differently? Should I adjust my confidence levels? Focus on different categories?'", output: "Actionable recommendations for improving prediction accuracy" },
    ],
  },
];

export const DEFAULT_PROGRESS: TrainingProgress = {
  completedMissions: [],
  completedSteps: {},
  completedPlaybooks: [],
  xp: 0,
  level: 1,
  startedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
};
