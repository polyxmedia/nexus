import type { Scenario } from "./monte-carlo";

export interface PresetScenarioSet {
  id: string;
  name: string;
  description: string;
  scenarios: Scenario[];
}

export const presets: PresetScenarioSet[] = [
  {
    id: "oil-crisis",
    name: "Oil Crisis",
    description: "Strait of Hormuz closure / Middle East escalation scenarios",
    scenarios: [
      {
        name: "Hormuz Stays Closed",
        probability: 0.4,
        params: {
          dailyMeanReturn: 0.005,
          dailyVolatility: 0.04,
          fatTailSkew: 0.3,
          jumpProbability: 0.05,
          jumpMagnitude: 0.08,
        },
      },
      {
        name: "Ceasefire in 2 Weeks",
        probability: 0.25,
        params: {
          dailyMeanReturn: -0.02,
          dailyVolatility: 0.06,
          fatTailSkew: -0.5,
          jumpProbability: 0.15,
          jumpMagnitude: -0.15,
        },
      },
      {
        name: "Gradual De-escalation",
        probability: 0.35,
        params: {
          dailyMeanReturn: -0.003,
          dailyVolatility: 0.03,
          fatTailSkew: -0.1,
          jumpProbability: 0.02,
          jumpMagnitude: -0.05,
        },
      },
    ],
  },
  {
    id: "general-market",
    name: "General Market",
    description: "Standard equity market scenario distribution",
    scenarios: [
      {
        name: "Bull Continuation",
        probability: 0.35,
        params: {
          dailyMeanReturn: 0.0008,
          dailyVolatility: 0.012,
          fatTailSkew: 0.1,
          jumpProbability: 0.01,
          jumpMagnitude: 0.02,
        },
      },
      {
        name: "Correction (10-20%)",
        probability: 0.30,
        params: {
          dailyMeanReturn: -0.003,
          dailyVolatility: 0.025,
          fatTailSkew: -0.3,
          jumpProbability: 0.05,
          jumpMagnitude: -0.04,
        },
      },
      {
        name: "Crash (>20%)",
        probability: 0.15,
        params: {
          dailyMeanReturn: -0.008,
          dailyVolatility: 0.045,
          fatTailSkew: -0.7,
          jumpProbability: 0.1,
          jumpMagnitude: -0.08,
        },
      },
      {
        name: "Sideways Chop",
        probability: 0.20,
        params: {
          dailyMeanReturn: 0.0001,
          dailyVolatility: 0.015,
          fatTailSkew: 0,
          jumpProbability: 0.02,
          jumpMagnitude: 0.03,
        },
      },
    ],
  },
  {
    id: "crypto-vol",
    name: "Crypto Volatility",
    description: "High-volatility crypto asset scenarios",
    scenarios: [
      {
        name: "Parabolic Run",
        probability: 0.25,
        params: {
          dailyMeanReturn: 0.015,
          dailyVolatility: 0.06,
          fatTailSkew: 0.5,
          jumpProbability: 0.08,
          jumpMagnitude: 0.15,
        },
      },
      {
        name: "Blow-off Top & Crash",
        probability: 0.20,
        params: {
          dailyMeanReturn: -0.01,
          dailyVolatility: 0.08,
          fatTailSkew: -0.6,
          jumpProbability: 0.12,
          jumpMagnitude: -0.2,
        },
      },
      {
        name: "Steady Accumulation",
        probability: 0.35,
        params: {
          dailyMeanReturn: 0.003,
          dailyVolatility: 0.035,
          fatTailSkew: 0.1,
          jumpProbability: 0.03,
          jumpMagnitude: 0.05,
        },
      },
      {
        name: "Bear Market",
        probability: 0.20,
        params: {
          dailyMeanReturn: -0.005,
          dailyVolatility: 0.05,
          fatTailSkew: -0.4,
          jumpProbability: 0.06,
          jumpMagnitude: -0.1,
        },
      },
    ],
  },
  {
    id: "geopolitical-shock",
    name: "Geopolitical Shock",
    description: "Black swan / geopolitical event impact scenarios",
    scenarios: [
      {
        name: "Contained Shock",
        probability: 0.45,
        params: {
          dailyMeanReturn: -0.002,
          dailyVolatility: 0.03,
          fatTailSkew: -0.2,
          jumpProbability: 0.03,
          jumpMagnitude: -0.05,
          meanReversionSpeed: 0.05,
        },
      },
      {
        name: "Escalation Spiral",
        probability: 0.25,
        params: {
          dailyMeanReturn: -0.006,
          dailyVolatility: 0.05,
          fatTailSkew: -0.5,
          jumpProbability: 0.08,
          jumpMagnitude: -0.1,
        },
      },
      {
        name: "Resolution Rally",
        probability: 0.30,
        params: {
          dailyMeanReturn: 0.004,
          dailyVolatility: 0.025,
          fatTailSkew: 0.3,
          jumpProbability: 0.05,
          jumpMagnitude: 0.08,
        },
      },
    ],
  },
];
