import raw from "./fd001.json";

export type Metric = "recall" | "precision" | "f1" | "auc" | "ap";

export type Sensor = {
  id: string;
  symbol: string;
  name: string;
  kept: boolean;
  modalShare: number;
  r?: number;
  gap?: number;
  rises?: boolean;
  spark?: (number | null)[];
};

export type TrajectoryPoint = { t: number; mean: number; lo: number; hi: number };

export type Model = {
  name: string;
  short: string;
  chosen: boolean;
  default: Record<Metric, number>;
  tuned: Record<Metric, number>;
  firstLook: Record<Metric, number>;
  params: Record<string, string | number>;
  apStd: number;
};

export type TestEngine = { unit: number; rul: number; y: 0 | 1; score: number };

export type Data = {
  meta: {
    window: number;
    trainRows: number;
    testRows: number;
    engines: number;
    positives: number;
    positiveShare: number;
    chosen: string;
    threshold: number;
    features: string[];
  };
  lifetimes: { unit: number; life: number }[];
  sensors: Sensor[];
  trajectories: Record<string, TrajectoryPoint[]>;
  baseline: { accuracy: number; recall: number; auc: number; ap: number };
  models: Model[];
  featureTest: { model: string; diff: number; better: number; folds: number }[];
  threshold: { chosen: number; default: number; curve: { t: number; recall: number; precision: number; f2: number }[] };
  test: TestEngine[];
  testMetrics: Record<Metric | "accuracy", number>;
  ci: Record<Metric, [number, number]>;
  bands: { band: string; share: number; rows: number; imminent: boolean }[];
  importance: { id: string; symbol: string; r: number; coef: number; drop: number; dropStd: number }[];
  aging: { unit: number; end: number | null; pts: [number, number][] }[];
  corr: { ids: string[]; symbols: string[]; r: number[][] };
  hist: { edges: number[]; sensors: Record<string, { healthy: number[]; imminent: number[] }> };
  testScores: Record<string, number[]>;
  generator: { max: number; rho: number; mean: number[][]; std: number[][]; chol: number[][]; check: number[]; real: number[] };
};

export const data = raw as unknown as Data;

export type Verdict = "detected" | "missed" | "false alarm" | "quiet";

export function verdictOf(engine: TestEngine, threshold: number): Verdict {
  const alarm = engine.score >= threshold;
  if (engine.y === 1) return alarm ? "detected" : "missed";
  return alarm ? "false alarm" : "quiet";
}

export function confusion(threshold: number) {
  const counts = { detected: 0, missed: 0, "false alarm": 0, quiet: 0 } as Record<Verdict, number>;
  for (const engine of data.test) counts[verdictOf(engine, threshold)] += 1;
  const tp = counts.detected;
  const recall = tp / (tp + counts.missed);
  const precision = tp + counts["false alarm"] === 0 ? 0 : tp / (tp + counts["false alarm"]);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { counts, recall, precision, f1 };
}

export const fmt = (value: number, digits = 3) => value.toFixed(digits).replace(/^0\./, ".");
export const pct = (value: number) => `${Math.round(value * 100)}%`;
