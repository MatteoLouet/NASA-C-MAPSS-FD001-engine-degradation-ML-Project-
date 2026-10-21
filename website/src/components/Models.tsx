import { useState } from "react";
import { data, fmt, pct, type Metric } from "@/data";
import { cn } from "@/lib/utils";
import { Plate } from "./Plate";

const models = data.models;
const best = Math.max(...models.map((m) => m.tuned.ap));
const tie = models.filter((m) => m.tuned.ap >= best - 0.01).length;
const svm = models.find((m) => m.name === "SVM (RBF)")!;
const dropped = data.featureTest.reduce((sum, t) => sum + t.better, 0);
const droppedFolds = data.featureTest.reduce((sum, t) => sum + t.folds, 0);

const VW = 880;
const ROW = 38;
const TOP = 34;
const LEFT = 150;
const RIGHT = 800;
const LO = 0.85;
const HI = 0.97;
const VH = TOP + models.length * ROW + 26;
const sx = (v: number) => LEFT + ((Math.max(LO, v) - LO) / (HI - LO)) * (RIGHT - LEFT);

const COLUMNS: { key: Metric; label: string; hint: string }[] = [
  { key: "recall", label: "Recall", hint: "failures caught" },
  { key: "precision", label: "Precision", hint: "alarms that were real" },
  { key: "f1", label: "F1", hint: "balance of both" },
  { key: "auc", label: "AUC", hint: "ranking quality" },
  { key: "ap", label: "AP", hint: "our main score" },
];

function Dumbbell() {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full min-w-[620px] sm:min-w-0" onMouseLeave={() => setHover(null)} role="img" aria-label="Average precision of 7 models, default and tuned">
      <rect x={sx(best - 0.01)} y={TOP - 18} width={sx(best) - sx(best - 0.01)} height={models.length * ROW + 10} rx={3} fill="var(--blue)" opacity="0.07" />
      <text x={sx(best - 0.005)} y={TOP - 22} textAnchor="middle" fontSize="10.5" fill="var(--blue)">
        within 0.01 of the best = a tie
      </text>
      {[0.86, 0.88, 0.9, 0.92, 0.94, 0.96].map((v) => (
        <g key={v}>
          <line x1={sx(v)} x2={sx(v)} y1={TOP - 8} y2={VH - 22} stroke="var(--hair)" strokeDasharray="2 4" />
          <text x={sx(v)} y={VH - 6} textAnchor="middle" fontSize="10" fill="#888" className="mono">
            {fmt(v, 2)}
          </text>
        </g>
      ))}
      {models.map((m, i) => {
        const y = TOP + i * ROW;
        const on = hover === m.name;
        const ink = m.chosen ? "var(--blue)" : "var(--ink-2)";
        const gain = m.tuned.ap - m.default.ap;
        return (
          <g key={m.name} onMouseEnter={() => setHover(m.name)} opacity={hover && !on ? 0.35 : 1} className="transition-opacity">
            <rect x={0} y={y - ROW / 2} width={VW} height={ROW} fill="transparent" />
            <text x={LEFT - 18} y={y + 4} textAnchor="end" fontSize="12.5" fill={m.chosen ? "var(--blue)" : "var(--ink)"} fontWeight={m.chosen ? 600 : 450}>
              {m.name}
            </text>
            <line x1={sx(m.tuned.ap - m.apStd)} x2={sx(m.tuned.ap + m.apStd)} y1={y} y2={y} stroke={ink} strokeWidth="1" opacity="0.35" />
            {[m.tuned.ap - m.apStd, m.tuned.ap + m.apStd].map((v) => (
              <line key={v} x1={sx(v)} x2={sx(v)} y1={y - 4} y2={y + 4} stroke={ink} strokeWidth="1" opacity="0.35" />
            ))}
            {gain > 0.004 && (
              <line x1={sx(m.default.ap) + 5} x2={sx(m.tuned.ap) - 7} y1={y} y2={y} stroke="var(--ink-2)" strokeWidth="1.4" markerEnd="url(#arrow)" />
            )}
            <circle cx={sx(m.default.ap)} cy={y} r="4.5" fill="var(--paper)" stroke="#9a9a96" strokeWidth="1.3" />
            <circle cx={sx(m.tuned.ap)} cy={y} r="6" fill={ink} stroke="var(--paper)" strokeWidth="2" />
            <text x={RIGHT + 18} y={y + 4} fontSize="11.5" fill={ink} className="mono" fontWeight={m.chosen ? 600 : 400}>
              {fmt(m.tuned.ap)}
            </text>
            {gain > 0.004 && (
              <text x={(sx(m.default.ap) + sx(m.tuned.ap)) / 2} y={y - 9} textAnchor="middle" fontSize="10" fill="var(--muted)" className="mono">
                +{fmt(gain)} tuned
              </text>
            )}
          </g>
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,1 L7,4 L0,7" fill="none" stroke="var(--ink-2)" strokeWidth="1.3" />
        </marker>
      </defs>
    </svg>
  );
}

function Table() {
  const range = Object.fromEntries(
    COLUMNS.map((c) => {
      const vals = models.map((m) => m.tuned[c.key]);
      return [c.key, [Math.min(...vals), Math.max(...vals)]];
    }),
  ) as Record<Metric, [number, number]>;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-separate border-spacing-[3px] text-[12px]">
        <thead>
          <tr>
            <th className="w-[150px]" />
            {COLUMNS.map((c) => (
              <th key={c.key} className="px-2 pb-2 text-left align-bottom font-[450]">
                <div className="text-ink">{c.label}</div>
                <div className="text-[10.5px] text-dim">{c.hint}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.name}>
              <td className={cn("pr-3 text-right", m.chosen ? "font-[600] text-blue" : "text-ink")}>{m.name}</td>
              {COLUMNS.map((c) => {
                const [lo, hi] = range[c.key];
                const t = hi === lo ? 1 : (m.tuned[c.key] - lo) / (hi - lo);
                return (
                  <td
                    key={c.key}
                    className="mono rounded-cell px-2 py-1.5 text-[11.5px]"
                    style={{
                      background: m.chosen ? `rgba(42,120,214,${0.08 + t * 0.22})` : `rgba(23,23,23,${0.03 + t * 0.14})`,
                      color: m.chosen ? "var(--blue)" : "var(--ink)",
                    }}
                  >
                    {fmt(m.tuned[c.key])}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Models() {
  return (
    <Plate
      id="models"
      n="05"
      kicker="Models"
      title={
        <>
          7 models tried, <em className="serif">{tie} tie</em>.
        </>
      }
      caption="Score = average precision (1 is perfect) on engines left out of training. Each engine stays on one side of the split. Six models end within 0.01 of each other, which is the normal noise between splits, so we keep the simplest: logistic regression."
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-dim">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full border-[1.3px] border-[#9a9a96]" /> default settings
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-ink-2" /> after tuning (grid search)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-4 bg-ink-2/40" /> spread between splits
        </span>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <Dumbbell />
      </div>

      <h3 className="mt-14 text-[14px] font-[540] text-ink">All scores after tuning</h3>
      <p className="mt-1 mb-4 max-w-[580px] text-[12px] text-dim">
        Darker = better in that column. Recall and precision depend on each model’s default threshold; we set our own in step 07.
      </p>
      <Table />

      <div className="mt-10 grid gap-px overflow-hidden rounded-card border border-hair bg-hair sm:grid-cols-3">
        <Fact value={pct(data.baseline.accuracy)} note="accuracy of a model that always says “healthy” and catches no failure. Accuracy is misleading here." />
        <Fact value={`+${fmt(svm.tuned.ap - svm.default.ap, 3)}`} note="what tuning added to the SVM. Most other models moved by less than .003." />
        <Fact value={`${dropped} of ${droppedFolds}`} note="tests where removing sensors Nc and NRc helped. So all 14 sensors are kept." />
      </div>
    </Plate>
  );
}

function Fact({ value, note }: { value: string; note: string }) {
  return (
    <div className="bg-white p-4">
      <div className="mono text-[22px] text-ink">{value}</div>
      <div className="mt-1 text-[12px] leading-snug text-dim">{note}</div>
    </div>
  );
}
