import fs from 'fs';
import path from 'path';

interface ExportedModelSpec {
  model_type: string;
  hyperparameters: {
    bootstrap: boolean;
    ccp_alpha: number;
    class_weight: 'balanced' | 'balanced_subsample' | null;
    criterion: string;
    max_depth: number | null;
    max_features: string | number;
    max_leaf_nodes: number | null;
    max_samples: number | null;
    min_impurity_decrease: number;
    min_samples_leaf: number;
    min_samples_split: number;
    min_weight_fraction_leaf: number;
    monotonic_cst: null;
    n_estimators: number;
    n_jobs: number | null;
    oob_score: boolean;
    random_state: number;
    verbose: number;
    warm_start: boolean;
  };
  n_features_in: number;
  feature_names_in: string[];
  classes: number[];
  suggested_optimal_threshold: number;
}

interface RiskThresholdsConfig {
  risk_thresholds?: {
    low_risk_limit: number;
    critical_risk_limit: number;
  };
}

interface DataRow {
  udi: number;
  productId: string;
  type: 'L' | 'M' | 'H';
  features: [number, number, number, number, number];
  y: 0 | 1;
  twf: 0 | 1;
  hdf: 0 | 1;
  pwf: 0 | 1;
  osf: 0 | 1;
  rnf: 0 | 1;
}

interface CompactTree {
  f: number[];
  t: number[];
  l: number[];
  r: number[];
}

interface EvalMetrics {
  threshold: number;
  recall: number;
  precision: number;
  f1: number;
  accuracy: number;
  prAuc: number;
  rocAuc: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function parseAi4iCsv(csvPath: string): DataRow[] {
  const raw = fs.readFileSync(csvPath, 'utf-8').trim();
  const lines = raw.split(/\r?\n/);
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    if (cols.length < 14) {
      throw new Error(`Malformed CSV row ${i + 1}`);
    }
    const type = cols[2] as 'L' | 'M' | 'H';
    const airTemp = Number(cols[3]);
    const processTemp = Number(cols[4]);
    const rpm = Number(cols[5]);
    const torque = Number(cols[6]);
    const toolWear = Number(cols[7]);
    const y = Number(cols[8]) === 1 ? 1 : 0;

    if (
      !Number.isFinite(airTemp) ||
      !Number.isFinite(processTemp) ||
      !Number.isFinite(rpm) ||
      !Number.isFinite(torque) ||
      !Number.isFinite(toolWear)
    ) {
      throw new Error(`Non-numeric feature on row ${i + 1}`);
    }

    rows.push({
      udi: Number(cols[0]),
      productId: cols[1],
      type,
      features: [airTemp, processTemp, rpm, torque, toolWear],
      y,
      twf: Number(cols[9]) === 1 ? 1 : 0,
      hdf: Number(cols[10]) === 1 ? 1 : 0,
      pwf: Number(cols[11]) === 1 ? 1 : 0,
      osf: Number(cols[12]) === 1 ? 1 : 0,
      rnf: Number(cols[13]) === 1 ? 1 : 0,
    });
  }
  return rows;
}

function stratifiedSplit(rows: DataRow[], testRatio: number, seed: number): {
  train: DataRow[];
  test: DataRow[];
} {
  const rng = createRng(seed);
  const positives = rows.filter((r) => r.y === 1);
  const negatives = rows.filter((r) => r.y === 0);

  shuffleInPlace(positives, rng);
  shuffleInPlace(negatives, rng);

  const testPosCount = Math.round(positives.length * testRatio);
  const testNegCount = Math.round(negatives.length * testRatio);

  const test = [...positives.slice(0, testPosCount), ...negatives.slice(0, testNegCount)];
  const train = [...positives.slice(testPosCount), ...negatives.slice(testNegCount)];

  shuffleInPlace(train, rng);
  shuffleInPlace(test, rng);

  return { train, test };
}

/**
 * Exact scikit-learn CART Gini Decision Tree builder supporting class_weight='balanced',
 * max_features='sqrt', min_samples_split, min_samples_leaf, and max_depth.
 */
function buildCartTree(
  X: Float64Array[],
  Y: Uint8Array,
  sampleIndices: Int32Array,
  nFeatures: number,
  maxFeatures: number,
  minSamplesSplit: number,
  minSamplesLeaf: number,
  maxDepth: number | null,
  classWeight0: number,
  classWeight1: number,
  rng: () => number,
  featureImportances: Float64Array
): CompactTree {
  const fArr: number[] = [];
  const tArr: number[] = [];
  const lArr: number[] = [];
  const rArr: number[] = [];
  const featureOrder = Array.from({ length: nFeatures }, (_, i) => i);

  function buildNode(indices: Int32Array, depth: number): number {
    const nodeIdx = fArr.length;
    fArr.push(-1);
    tArr.push(0);
    lArr.push(-1);
    rArr.push(-1);

    const n = indices.length;
    let pos = 0;
    for (let i = 0; i < n; i++) {
      pos += Y[indices[i]];
    }
    const neg = n - pos;
    const wPos = pos * classWeight1;
    const wNeg = neg * classWeight0;
    const wTotal = wPos + wNeg;
    const p1 = wTotal > 0 ? wPos / wTotal : 0;

    if (
      pos === 0 ||
      pos === n ||
      n < minSamplesSplit ||
      n < minSamplesLeaf * 2 ||
      (maxDepth !== null && depth >= maxDepth)
    ) {
      tArr[nodeIdx] = Math.round(p1 * 10000) / 10000;
      return nodeIdx;
    }

    const parentGini = 1 - p1 * p1 - (1 - p1) * (1 - p1);

    for (let i = nFeatures - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = featureOrder[i];
      featureOrder[i] = featureOrder[j];
      featureOrder[j] = tmp;
    }

    let bestFeature = -1;
    let bestThreshold = 0;
    let bestGain = 1e-12;

    for (let attempt = 0; attempt < nFeatures; attempt++) {
      if (attempt >= maxFeatures && bestFeature !== -1) break;
      const feat = featureOrder[attempt];
      const col = X[feat];

      const sorted = new Int32Array(indices);
      sorted.sort((a, b) => col[a] - col[b]);

      let leftPos = 0;
      for (let i = 0; i < n - 1; i++) {
        const idx = sorted[i];
        leftPos += Y[idx];
        const leftN = i + 1;
        const rightN = n - leftN;
        if (leftN < minSamplesLeaf || rightN < minSamplesLeaf) continue;

        const vCurr = col[idx];
        const vNext = col[sorted[i + 1]];
        if (vCurr === vNext) continue;

        const leftNeg = leftN - leftPos;
        const rightPos = pos - leftPos;
        const rightNeg = rightN - rightPos;

        const lwPos = leftPos * classWeight1;
        const lwTotal = lwPos + leftNeg * classWeight0;
        const rwPos = rightPos * classWeight1;
        const rwTotal = rwPos + rightNeg * classWeight0;

        const lp1 = lwPos / lwTotal;
        const rp1 = rwPos / rwTotal;
        const leftGini = 1 - lp1 * lp1 - (1 - lp1) * (1 - lp1);
        const rightGini = 1 - rp1 * rp1 - (1 - rp1) * (1 - rp1);
        const weightedGini = (lwTotal * leftGini + rwTotal * rightGini) / wTotal;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feat;
          bestThreshold = (vCurr + vNext) * 0.5;
        }
      }
    }

    if (bestFeature === -1) {
      tArr[nodeIdx] = Math.round(p1 * 10000) / 10000;
      return nodeIdx;
    }

    featureImportances[bestFeature] += wTotal * bestGain;

    const col = X[bestFeature];
    let leftCount = 0;
    for (let i = 0; i < n; i++) {
      if (col[indices[i]] <= bestThreshold) leftCount++;
    }

    if (leftCount < minSamplesLeaf || n - leftCount < minSamplesLeaf) {
      tArr[nodeIdx] = Math.round(p1 * 10000) / 10000;
      return nodeIdx;
    }

    const leftIdx = new Int32Array(leftCount);
    const rightIdx = new Int32Array(n - leftCount);
    let li = 0;
    let ri = 0;
    for (let i = 0; i < n; i++) {
      const idx = indices[i];
      if (col[idx] <= bestThreshold) {
        leftIdx[li++] = idx;
      } else {
        rightIdx[ri++] = idx;
      }
    }

    fArr[nodeIdx] = bestFeature;
    tArr[nodeIdx] = Math.round(bestThreshold * 10000) / 10000;
    lArr[nodeIdx] = buildNode(leftIdx, depth + 1);
    rArr[nodeIdx] = buildNode(rightIdx, depth + 1);

    return nodeIdx;
  }

  buildNode(sampleIndices, 0);
  return { f: fArr, t: tArr, l: lArr, r: rArr };
}

function predictTreeProb(tree: CompactTree, features: number[]): number {
  let node = 0;
  while (tree.f[node] !== -1) {
    const featIdx = tree.f[node];
    node = features[featIdx] <= tree.t[node] ? tree.l[node] : tree.r[node];
  }
  return tree.t[node];
}

function predictForestProb(trees: CompactTree[], features: number[]): number {
  let sum = 0;
  for (let i = 0; i < trees.length; i++) {
    sum += predictTreeProb(trees[i], features);
  }
  return sum / trees.length;
}

function computeRankingMetrics(yTrue: number[], probs: number[]): { prAuc: number; rocAuc: number } {
  const n = yTrue.length;
  const pairs = yTrue.map((y, i) => ({ y, p: probs[i] })).sort((a, b) => b.p - a.p);
  const totalPos = yTrue.reduce((s, y) => s + y, 0);
  const totalNeg = n - totalPos;

  if (totalPos === 0 || totalNeg === 0) {
    return { prAuc: 0, rocAuc: 0.5 };
  }

  let tp = 0;
  let fp = 0;
  let prevRecall = 0;
  let prevFpr = 0;
  let prAuc = 0;
  let rocAuc = 0;

  let i = 0;
  while (i < n) {
    const currentP = pairs[i].p;
    while (i < n && pairs[i].p === currentP) {
      if (pairs[i].y === 1) tp++;
      else fp++;
      i++;
    }
    const recall = tp / totalPos;
    const precision = tp / (tp + fp);
    const fpr = fp / totalNeg;

    prAuc += (recall - prevRecall) * precision;
    rocAuc += (fpr - prevFpr) * ((recall + prevRecall) / 2);

    prevRecall = recall;
    prevFpr = fpr;
  }

  return {
    prAuc: Math.round(prAuc * 10000) / 10000,
    rocAuc: Math.round(rocAuc * 10000) / 10000,
  };
}

function evaluateProbabilities(yTrue: number[], probs: number[], threshold: number): EvalMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    const pred = probs[i] >= threshold ? 1 : 0;
    if (yTrue[i] === 1 && pred === 1) tp++;
    else if (yTrue[i] === 0 && pred === 1) fp++;
    else if (yTrue[i] === 0 && pred === 0) tn++;
    else fn++;
  }

  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const f1 = recall + precision > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / yTrue.length;
  const { prAuc, rocAuc } = computeRankingMetrics(yTrue, probs);

  return {
    threshold,
    recall: Math.round(recall * 10000) / 10000,
    precision: Math.round(precision * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
    accuracy: Math.round(accuracy * 10000) / 10000,
    prAuc,
    rocAuc,
    confusionMatrix: { tp, fp, tn, fn },
  };
}

function trainAndEvaluateLogisticRegression(train: DataRow[], test: DataRow[]): EvalMetrics {
  const nFeat = 5;
  const nTrain = train.length;
  const means = new Float64Array(nFeat);
  const stds = new Float64Array(nFeat);

  for (let f = 0; f < nFeat; f++) {
    let sum = 0;
    for (let i = 0; i < nTrain; i++) sum += train[i].features[f];
    means[f] = sum / nTrain;
    let sq = 0;
    for (let i = 0; i < nTrain; i++) {
      const d = train[i].features[f] - means[f];
      sq += d * d;
    }
    stds[f] = Math.sqrt(sq / nTrain) || 1;
  }

  const nPos = train.filter((r) => r.y === 1).length;
  const nNeg = nTrain - nPos;
  const wPos = nTrain / (2 * nPos);
  const wNeg = nTrain / (2 * nNeg);

  const weights = new Float64Array(nFeat);
  let bias = 0;
  const lr = 0.08;
  const l2 = 0.001;
  const epochs = 500;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Float64Array(nFeat);
    let gradB = 0;
    let totalWeight = 0;

    for (let i = 0; i < nTrain; i++) {
      const row = train[i];
      let z = bias;
      for (let f = 0; f < nFeat; f++) {
        z += weights[f] * ((row.features[f] - means[f]) / stds[f]);
      }
      const p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
      const sw = row.y === 1 ? wPos : wNeg;
      const err = (p - row.y) * sw;
      gradB += err;
      for (let f = 0; f < nFeat; f++) {
        gradW[f] += err * ((row.features[f] - means[f]) / stds[f]);
      }
      totalWeight += sw;
    }

    bias -= lr * (gradB / totalWeight);
    for (let f = 0; f < nFeat; f++) {
      weights[f] -= lr * (gradW[f] / totalWeight + l2 * weights[f]);
    }
  }

  const testY = test.map((r) => r.y);
  const testProbs = test.map((row) => {
    let z = bias;
    for (let f = 0; f < nFeat; f++) {
      z += weights[f] * ((row.features[f] - means[f]) / stds[f]);
    }
    return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  });

  return evaluateProbabilities(testY, testProbs, 0.5);
}

function main() {
  const rootDir = process.cwd();
  const csvPath = path.join(rootDir, 'public/assets/aistudio/ai4i2020_dc6630cd.csv');
  const modelSpecPath = path.join(rootDir, 'public/assets/aistudio/optimized_random_forest_model_108125a0.json');
  const riskConfigPath = path.join(rootDir, 'public/assets/aistudio/optimized_random_forest_config_77d2c33f.json');
  const outPath = path.join(rootDir, 'server/trained_random_forest.json');

  const modelSpec = JSON.parse(fs.readFileSync(modelSpecPath, 'utf-8')) as ExportedModelSpec;
  const riskCfg = JSON.parse(fs.readFileSync(riskConfigPath, 'utf-8')) as RiskThresholdsConfig;

  const optimizedThreshold = modelSpec.suggested_optimal_threshold ?? 0.26;
  const lowRiskLimit = riskCfg.risk_thresholds?.low_risk_limit ?? 0.15;
  const criticalRiskLimit = riskCfg.risk_thresholds?.critical_risk_limit ?? optimizedThreshold;

  const rows = parseAi4iCsv(csvPath);
  const totalFailures = rows.filter((r) => r.y === 1).length;
  const modeCounts = {
    TWF: rows.filter((r) => r.twf === 1).length,
    HDF: rows.filter((r) => r.hdf === 1).length,
    PWF: rows.filter((r) => r.pwf === 1).length,
    OSF: rows.filter((r) => r.osf === 1).length,
    RNF: rows.filter((r) => r.rnf === 1).length,
  };
  const typeCounts = {
    L: rows.filter((r) => r.type === 'L').length,
    M: rows.filter((r) => r.type === 'M').length,
    H: rows.filter((r) => r.type === 'H').length,
  };

  const seed = modelSpec.hyperparameters.random_state;
  const { train, test } = stratifiedSplit(rows, 0.2, seed);

  const nTrain = train.length;
  const nFeatures = modelSpec.n_features_in;
  const X: Float64Array[] = Array.from({ length: nFeatures }, () => new Float64Array(nTrain));
  const Y = new Uint8Array(nTrain);
  let trainPos = 0;
  for (let i = 0; i < nTrain; i++) {
    for (let f = 0; f < nFeatures; f++) {
      X[f][i] = train[i].features[f];
    }
    Y[i] = train[i].y;
    trainPos += train[i].y;
  }
  const trainNeg = nTrain - trainPos;

  // Exact scikit-learn class_weight='balanced': n_samples / (n_classes * np.bincount(y))
  const useBalanced = modelSpec.hyperparameters.class_weight === 'balanced';
  const classWeight0 = useBalanced ? nTrain / (2 * trainNeg) : 1.0;
  const classWeight1 = useBalanced ? nTrain / (2 * trainPos) : 1.0;

  console.log(
    `Training ${modelSpec.model_type} from optimized_random_forest_model_108125a0.json | class_weight=${modelSpec.hyperparameters.class_weight} (w0=${classWeight0.toFixed(4)}, w1=${classWeight1.toFixed(4)})`
  );

  const rng = createRng(seed + 101);
  const nEstimators = modelSpec.hyperparameters.n_estimators;
  const minSamplesSplit = modelSpec.hyperparameters.min_samples_split;
  const minSamplesLeaf = modelSpec.hyperparameters.min_samples_leaf;
  const maxDepth = modelSpec.hyperparameters.max_depth;
  const maxFeatures =
    modelSpec.hyperparameters.max_features === 'sqrt'
      ? Math.max(1, Math.floor(Math.sqrt(nFeatures)))
      : nFeatures;

  const t0 = Date.now();
  const trees: CompactTree[] = [];
  const rawImportances = new Float64Array(nFeatures);

  for (let t = 0; t < nEstimators; t++) {
    const bootIdx = new Int32Array(nTrain);
    if (modelSpec.hyperparameters.bootstrap) {
      for (let i = 0; i < nTrain; i++) {
        bootIdx[i] = Math.floor(rng() * nTrain);
      }
    } else {
      for (let i = 0; i < nTrain; i++) bootIdx[i] = i;
    }

    const tree = buildCartTree(
      X,
      Y,
      bootIdx,
      nFeatures,
      maxFeatures,
      minSamplesSplit,
      minSamplesLeaf,
      maxDepth,
      classWeight0,
      classWeight1,
      rng,
      rawImportances
    );
    trees.push(tree);
  }
  const trainDurationMs = Date.now() - t0;

  const totalImp = rawImportances.reduce((s, v) => s + v, 0) || 1;
  const featureLabels = [
    'Air Temperature [K]',
    'Process Temperature [K]',
    'Rotational Speed [rpm]',
    'Torque [Nm]',
    'Tool Wear [min]',
  ];
  const featureImportances = modelSpec.feature_names_in.map((key, idx) => ({
    key,
    label: featureLabels[idx] ?? key,
    importance: Math.round((rawImportances[idx] / totalImp) * 10000) / 10000,
  }));

  const testY = test.map((r) => r.y);
  const rfTestProbs = test.map((r) => predictForestProb(trees, r.features));
  const rfOptimizedEval = evaluateProbabilities(testY, rfTestProbs, optimizedThreshold);
  const rfDefaultEval = evaluateProbabilities(testY, rfTestProbs, 0.5);

  // Single balanced Decision Tree baseline on exact same split
  const dtAllIdx = Int32Array.from({ length: nTrain }, (_, i) => i);
  const dtImp = new Float64Array(nFeatures);
  const singleTree = buildCartTree(
    X,
    Y,
    dtAllIdx,
    nFeatures,
    nFeatures,
    minSamplesSplit,
    minSamplesLeaf,
    null,
    classWeight0,
    classWeight1,
    createRng(seed + 7),
    dtImp
  );
  const dtProbs = test.map((r) => predictTreeProb(singleTree, r.features));
  const dtEval = evaluateProbabilities(testY, dtProbs, 0.5);

  const lrEval = trainAndEvaluateLogisticRegression(train, test);
  const majorityEval = evaluateProbabilities(
    testY,
    testY.map(() => 0),
    0.5
  );

  console.log('\n--- Held-Out Test Set (2,000 rows, 68 failures) Evaluation (class_weight="balanced") ---');
  console.log('Random Forest (τ=0.26):', JSON.stringify(rfOptimizedEval));
  console.log('Random Forest (τ=0.50):', JSON.stringify(rfDefaultEval));
  console.log('Decision Tree (τ=0.50):', JSON.stringify(dtEval));
  console.log('Logistic Reg  (τ=0.50):', JSON.stringify(lrEval));
  console.log('Feature Importances:', featureImportances);
  console.log(`Training completed in ${trainDurationMs} ms.`);

  const sanityCases = [
    { name: 'AI4I Row 1 (Normal)', f: [298.1, 308.6, 1551, 42.8, 0] },
    { name: 'AI4I High Torque + Wear (OSF)', f: [298.9, 309.1, 1280, 66.5, 212] },
    { name: 'AI4I Heat Dissipation (HDF)', f: [302.5, 310.4, 1310, 48.0, 95] },
    { name: 'AI4I High Power Spike (PWF)', f: [298.4, 308.8, 2200, 48.5, 110] },
  ];
  for (const sc of sanityCases) {
    const p = predictForestProb(trees, sc.f);
    console.log(
      `Sanity [${sc.name}]: P(failure)=${(p * 100).toFixed(1)}% -> ${p >= optimizedThreshold ? 'FAILURE' : 'NO FAILURE'}`
    );
  }

  const totalNodes = trees.reduce((s, tr) => s + tr.f.length, 0);

  const artifact = {
    schemaVersion: '1.1.0',
    trainedAt: new Date().toISOString(),
    trainingDurationMs: trainDurationMs,
    sourceModelSpecFile: 'optimized_random_forest_model_108125a0.json',
    sourceDataset: {
      fileName: 'ai4i2020_dc6630cd.csv',
      totalRows: rows.length,
      totalFailures,
      failureRatePercent: Math.round((totalFailures / rows.length) * 10000) / 100,
      missingValues: 0,
      trainRows: train.length,
      trainFailures: trainPos,
      testRows: test.length,
      testFailures: test.filter((r) => r.y === 1).length,
      failureModeCounts: modeCounts,
      productTypeCounts: typeCounts,
    },
    config: {
      model_type: modelSpec.model_type,
      hyperparameters: {
        n_estimators: modelSpec.hyperparameters.n_estimators,
        max_depth: modelSpec.hyperparameters.max_depth,
        min_samples_split: modelSpec.hyperparameters.min_samples_split,
        min_samples_leaf: modelSpec.hyperparameters.min_samples_leaf,
        class_weight: modelSpec.hyperparameters.class_weight,
        criterion: modelSpec.hyperparameters.criterion,
        max_features: String(modelSpec.hyperparameters.max_features),
        bootstrap: modelSpec.hyperparameters.bootstrap,
        random_state: modelSpec.hyperparameters.random_state,
      },
      features: modelSpec.feature_names_in,
      optimized_threshold: optimizedThreshold,
      risk_thresholds: {
        low_risk_limit: lowRiskLimit,
        critical_risk_limit: criticalRiskLimit,
      },
    },
    modelSummary: {
      totalTrees: trees.length,
      totalNodes,
      avgNodesPerTree: Math.round((totalNodes / trees.length) * 10) / 10,
      maxFeaturesPerSplit: maxFeatures,
      splitCriterion: modelSpec.hyperparameters.criterion,
      bootstrap: modelSpec.hyperparameters.bootstrap,
      classWeight: modelSpec.hyperparameters.class_weight ?? 'none',
    },
    featureImportances,
    evaluation: {
      activeThreshold: optimizedThreshold,
      heldOutTest: rfOptimizedEval,
      atDefaultThreshold: rfDefaultEval,
      benchmarks: [
        {
          id: 'rf-optimized',
          name: `Random Forest Balanced (Optimized τ = ${optimizedThreshold.toFixed(2)})`,
          role: 'Selected Active Model',
          isSelected: true,
          ...rfOptimizedEval,
        },
        {
          id: 'rf-default',
          name: 'Random Forest Balanced (Default τ = 0.50)',
          role: 'Untuned Cutoff Comparison',
          isSelected: false,
          ...rfDefaultEval,
        },
        {
          id: 'decision-tree',
          name: 'Single Decision Tree (Balanced CART)',
          role: 'Interpretable Non-Linear Baseline',
          isSelected: false,
          ...dtEval,
        },
        {
          id: 'logistic-regression',
          name: 'Logistic Regression (Class-Weighted)',
          role: 'Linear Baseline',
          isSelected: false,
          ...lrEval,
        },
        {
          id: 'majority-baseline',
          name: 'Always No-Failure Baseline',
          role: 'Imbalance Sanity Check',
          isSelected: false,
          ...majorityEval,
        },
      ],
    },
    trees,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact));
  const stats = fs.statSync(outPath);
  console.log(`\nExported balanced Random Forest artifact to ${outPath} (${(stats.size / 1024).toFixed(1)} KB).`);
}

main();
