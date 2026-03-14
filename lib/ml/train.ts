import "server-only";
import { db, schema } from "@/lib/db";
import { buildTrainingDataset, type FeatureVector } from "./feature-store";

import { type TreeNode, predictTree } from "./tree";

// ── Decision Tree Implementation ──

interface TrainConfig {
  name: string;
  target: "direction";
  features: string[];
  nTrees?: number;
  maxDepth?: number;
  learningRate?: number;
  trainSplit?: number;
  startDate: string;
  endDate: string;
}

interface TrainResult {
  modelId: number;
  accuracy: number;
  precision: number;
  recall: number;
  featureImportance: Record<string, number>;
  trainSamples: number;
  testSamples: number;
}

interface DataPoint {
  features: number[];
  label: number; // 0 or 1
}

function giniImpurity(labels: number[]): number {
  if (labels.length === 0) return 0;
  const p1 = labels.filter(l => l === 1).length / labels.length;
  const p0 = 1 - p1;
  return 1 - (p1 * p1 + p0 * p0);
}

function findBestSplit(
  data: DataPoint[],
  featureIndex: number,
): { threshold: number; gain: number } {
  if (data.length < 2) return { threshold: 0, gain: 0 };

  const labels = data.map(d => d.label);
  const parentGini = giniImpurity(labels);

  // Get unique values for this feature, use quartiles as candidates
  const values = data.map(d => d.features[featureIndex]).sort((a, b) => a - b);
  const candidates = [
    values[Math.floor(values.length * 0.25)],
    values[Math.floor(values.length * 0.5)],
    values[Math.floor(values.length * 0.75)],
  ];

  let bestThreshold = 0;
  let bestGain = 0;

  for (const threshold of candidates) {
    const leftLabels = data.filter(d => d.features[featureIndex] <= threshold).map(d => d.label);
    const rightLabels = data.filter(d => d.features[featureIndex] > threshold).map(d => d.label);

    if (leftLabels.length === 0 || rightLabels.length === 0) continue;

    const leftWeight = leftLabels.length / data.length;
    const rightWeight = rightLabels.length / data.length;
    const gain = parentGini - (leftWeight * giniImpurity(leftLabels) + rightWeight * giniImpurity(rightLabels));

    if (gain > bestGain) {
      bestGain = gain;
      bestThreshold = threshold;
    }
  }

  return { threshold: bestThreshold, gain: bestGain };
}

function buildTree(
  data: DataPoint[],
  featureNames: string[],
  maxDepth: number,
  currentDepth: number,
  featureImportance: Record<string, number>,
): TreeNode {
  // Base cases
  if (currentDepth >= maxDepth || data.length < 4) {
    const avg = data.reduce((s, d) => s + d.label, 0) / data.length;
    return { value: avg };
  }

  const labels = data.map(d => d.label);
  if (labels.every(l => l === labels[0])) {
    return { value: labels[0] };
  }

  // Find best split across all features
  let bestFeatureIdx = 0;
  let bestThreshold = 0;
  let bestGain = 0;

  for (let i = 0; i < featureNames.length; i++) {
    const { threshold, gain } = findBestSplit(data, i);
    if (gain > bestGain) {
      bestGain = gain;
      bestThreshold = threshold;
      bestFeatureIdx = i;
    }
  }

  if (bestGain <= 0) {
    const avg = data.reduce((s, d) => s + d.label, 0) / data.length;
    return { value: avg };
  }

  // Track feature importance
  const featureName = featureNames[bestFeatureIdx];
  featureImportance[featureName] = (featureImportance[featureName] || 0) + bestGain * data.length;

  const leftData = data.filter(d => d.features[bestFeatureIdx] <= bestThreshold);
  const rightData = data.filter(d => d.features[bestFeatureIdx] > bestThreshold);

  return {
    feature: featureName,
    threshold: bestThreshold,
    left: buildTree(leftData, featureNames, maxDepth, currentDepth + 1, featureImportance),
    right: buildTree(rightData, featureNames, maxDepth, currentDepth + 1, featureImportance),
  };
}

function predictEnsemble(
  trees: TreeNode[],
  learningRate: number,
  features: Record<string, number>,
  initialPrediction: number,
): number {
  let prediction = initialPrediction;
  for (const tree of trees) {
    prediction += learningRate * predictTree(tree, features);
  }
  // Sigmoid to convert to probability
  return 1 / (1 + Math.exp(-prediction));
}

// ── Training Pipeline ──

function prepareData(
  vectors: FeatureVector[],
  featureNames: string[],
): DataPoint[] {
  return vectors.map((v, i) => {
    const features = featureNames.map(f => v.features[f] || 0);
    // Label: was the next period's prediction accuracy above 0.5?
    const nextVector = vectors[i + 1];
    const label = nextVector && (nextVector.features.prediction_accuracy_30d || 0) > 0.5 ? 1 : 0;
    return { features, label };
  }).slice(0, -1); // Remove last (no next period)
}

export async function trainModel(config: TrainConfig): Promise<TrainResult> {
  const {
    name,
    features: featureNames,
    nTrees = 50,
    maxDepth = 4,
    learningRate = 0.1,
    trainSplit = 0.8,
    startDate,
    endDate,
  } = config;

  // Build dataset
  const vectors = await buildTrainingDataset(startDate, endDate);

  if (vectors.length < 10) {
    throw new Error("Insufficient data for training. Need at least 10 data points.");
  }

  const data = prepareData(vectors, featureNames);
  const splitIdx = Math.floor(data.length * trainSplit);
  const trainData = data.slice(0, splitIdx);
  const testData = data.slice(splitIdx);

  if (trainData.length < 5 || testData.length < 2) {
    throw new Error("Insufficient data after split.");
  }

  // Initial prediction (log-odds of base rate)
  const baseRate = trainData.filter(d => d.label === 1).length / trainData.length;
  const initialPrediction = Math.log(baseRate / (1 - baseRate + 1e-10));

  // Train gradient boosted trees
  const trees: TreeNode[] = [];
  const featureImportance: Record<string, number> = {};
  let residuals = trainData.map(d => d.label - baseRate);

  for (let t = 0; t < nTrees; t++) {
    // Create residual data points
    const residualData: DataPoint[] = trainData.map((d, i) => ({
      features: d.features,
      label: residuals[i] > 0 ? 1 : 0, // Simplified: classify residual direction
    }));

    const tree = buildTree(residualData, featureNames, maxDepth, 0, featureImportance);
    trees.push(tree);

    // Update residuals
    residuals = trainData.map((d, i) => {
      const featureMap: Record<string, number> = {};
      featureNames.forEach((f, fi) => featureMap[f] = d.features[fi]);
      const pred = predictEnsemble(trees, learningRate, featureMap, initialPrediction);
      return d.label - pred;
    });
  }

  // Evaluate on test set
  let correct = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const d of testData) {
    const featureMap: Record<string, number> = {};
    featureNames.forEach((f, fi) => featureMap[f] = d.features[fi]);
    const pred = predictEnsemble(trees, learningRate, featureMap, initialPrediction);
    const predicted = pred > 0.5 ? 1 : 0;

    if (predicted === d.label) correct++;
    if (predicted === 1 && d.label === 1) truePositives++;
    if (predicted === 1 && d.label === 0) falsePositives++;
    if (predicted === 0 && d.label === 1) falseNegatives++;
  }

  const accuracy = correct / testData.length;
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

  // Normalize feature importance
  const totalImportance = Object.values(featureImportance).reduce((s, v) => s + v, 0);
  const normalizedImportance: Record<string, number> = {};
  for (const [f, v] of Object.entries(featureImportance)) {
    normalizedImportance[f] = totalImportance > 0 ? Math.round((v / totalImportance) * 1000) / 1000 : 0;
  }

  // Store model
  const artifact = JSON.stringify({ trees, initialPrediction, learningRate, featureNames });

  const [model] = await db.insert(schema.mlModels).values({
    name,
    modelType: "gradient_boost",
    target: config.target,
    featuresUsed: JSON.stringify(featureNames),
    hyperparams: JSON.stringify({ nTrees, maxDepth, learningRate }),
    artifact,
    trainingDate: new Date().toISOString(),
    trainingWindow: `${startDate}:${endDate}`,
    sampleCount: data.length,
    metrics: JSON.stringify({ accuracy, precision, recall, featureImportance: normalizedImportance }),
    status: "active",
  }).returning();

  return {
    modelId: model.id,
    accuracy: Math.round(accuracy * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    featureImportance: normalizedImportance,
    trainSamples: trainData.length,
    testSamples: testData.length,
  };
}
