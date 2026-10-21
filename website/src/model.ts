import card from "../../models/fd001_logistic_regression.json";
import { data } from "@/data";

export type ModelCard = {
  model: string;
  features: string[];
  threshold: number;
  window: number;
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
};

export const MODEL = card as ModelCard;
const { features, mean, scale, coef, intercept } = MODEL;
const gen = data.generator;

export const FEATURES = features;

export type Prediction = { score: number; logit: number; z: number[]; push: number[] };

export function predict(x: number[]): Prediction {
  const z = x.map((v, i) => (v - mean[i]) / scale[i]);
  const push = z.map((v, i) => v * coef[i]);
  const logit = intercept + push.reduce((a, b) => a + b, 0);
  return { score: 1 / (1 + Math.exp(-logit)), logit, z, push };
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export type Flight = { rul: number; x: number[]; noise: number[] };

export function generate(rul: number, rand: () => number, previous?: number[]): Flight {
  const r = Math.max(0, Math.min(gen.max, Math.round(rul)));
  const fresh = gen.chol.map(() => normal(rand));
  const correlated = gen.chol.map((row) => row.reduce((sum, l, j) => sum + l * fresh[j], 0));
  const noise = previous
    ? correlated.map((e, i) => gen.rho * previous[i] + Math.sqrt(1 - gen.rho * gen.rho) * e)
    : correlated;
  const x = noise.map((e, i) => gen.mean[r][i] + gen.std[r][i] * e);
  return { rul: r, x, noise };
}

export const GEN_MAX = gen.max;
