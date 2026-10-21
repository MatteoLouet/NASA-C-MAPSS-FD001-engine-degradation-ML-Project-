import { useMemo, useState } from "react";
import { confusion, data, fmt, verdictOf, type TestEngine, type Verdict } from "@/data";
import { Plate } from "./Plate";
import { useStore } from "@/state";

const engines = [...data.test].sort((a, b) => a.rul - b.rul || a.unit - b.unit);
const CHOSEN = data.threshold.chosen;

const STYLE: Record<Verdict, { fill: string; stroke: string; label: string }> = {
  detected: { fill: "var(--red)", stroke: "var(--red)", label: "failure caught" },
  missed: { fill: "var(--paper)", stroke: "var(--red)", label: "failure missed" },
  "false alarm": { fill: "var(--ink-2)", stroke: "var(--ink-2)", label: "false alarm" },
  quiet: { fill: "var(--paper)", stroke: "#cfcfcf", label: "healthy, quiet" },
};

function Glyph({ verdict, size = 26 }: { verdict: Verdict; size?: number }) {
  const s = STYLE[verdict];
  const filled = verdict === "detected" || verdict === "false alarm";
  const inner = filled ? "rgba(255,255,255,0.75)" : s.stroke;
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} aria-hidden className="block">
      <circle cx="13" cy="13" r="11" fill={s.fill} stroke={s.stroke} strokeWidth="1.4" />
      <circle cx="13" cy="13" r="6.2" fill="none" stroke={inner} strokeWidth="0.8" opacity={filled ? 1 : 0.7} />
      <g stroke={inner} strokeWidth="0.8" opacity={filled ? 1 : 0.7}>
        <path d="M13 6.8v12.4M6.8 13h12.4M8.6 8.6l8.8 8.8M17.4 8.6l-8.8 8.8" />
      </g>
      <circle cx="13" cy="13" r="2" fill={inner} />
    </svg>
  );
}

export function TestGrid() {
  const { threshold } = useStore();
  const [hover, setHover] = useState<TestEngine | null>(null);
  const result = useMemo(() => confusion(threshold), [threshold]);
  const { counts } = result;
  const positives = counts.detected + counts.missed;
  const negatives = counts["false alarm"] + counts.quiet;
  const atChosen = Math.abs(threshold - CHOSEN) < 0.0005;

  return (
    <Plate
      id="test"
      n="08"
      kicker="Test"
      title={
        <>
          Result on <em className="serif">100 new engines</em>.
        </>
      }
      caption="Each circle is a test engine the model never saw, judged on its last recorded flight. 25 of them were really about to fail."
    >
      <div className="grid gap-10 md:grid-cols-[auto_1fr] md:gap-14">
        <div>
          <div
            className="grid w-max grid-cols-10 gap-[5px] sm:gap-[7px]"
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label={`${counts.detected} failures caught, ${counts.missed} missed, ${counts["false alarm"]} false alarms, ${counts.quiet} healthy engines kept quiet`}
          >
            {engines.map((e) => (
              <button
                key={e.unit}
                onMouseEnter={() => setHover(e)}
                onFocus={() => setHover(e)}
                className="rounded-full transition-transform duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
                aria-label={`Engine ${e.unit}`}
              >
                <span className="block sm:hidden">
                  <Glyph verdict={verdictOf(e, threshold)} size={24} />
                </span>
                <span className="hidden sm:block">
                  <Glyph verdict={verdictOf(e, threshold)} size={28} />
                </span>
              </button>
            ))}
          </div>
          <div className="num mt-4 h-5 text-[12px] text-dim">
            {hover ? (
              <>
                Engine {hover.unit} · <span className="text-ink">{hover.rul}</span> flights left · score{" "}
                <span className="text-ink">{hover.score.toFixed(3)}</span> ·{" "}
                <span className={hover.y ? "text-red" : "text-ink"}>{STYLE[verdictOf(hover, threshold)].label}</span>
              </>
            ) : (
              <>Sorted by flights left. The first {positives} were really about to fail.</>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mono text-[42px] leading-none text-ink">
                <span className="text-red">{counts.detected}</span>
                <span className="text-faint">/{positives}</span>
              </div>
              <div className="mt-2 text-[12px] text-dim">failures caught</div>
            </div>
            <div>
              <div className="mono text-[42px] leading-none text-ink">
                {counts["false alarm"]}
                <span className="text-faint">/{negatives}</span>
              </div>
              <div className="mt-2 text-[12px] text-dim">false alarms on healthy engines</div>
            </div>
          </div>
          <Matrix counts={counts} />
        </div>
      </div>

      <div className="mt-14 grid items-center gap-10 md:grid-cols-[300px_1fr]">
        <Roc threshold={threshold} />
        <div>
          <h3 className="text-[14px] font-[540] text-ink">Scores on the 100 test engines</h3>
          <p className="mt-1 mb-5 max-w-[420px] text-[12px] text-dim">
            Grey range: where the score could land with another set of 100 engines (95% bootstrap). Only 25 engines were failing, so
            one engine moves recall by 4 points.
          </p>
          <dl className="grid gap-2.5 text-[12px]">
            <Stat color="var(--red)" label="Recall" hint="failures caught" value={result.recall} ci={atChosen ? data.ci.recall : undefined} />
            <Stat color="var(--ink-2)" label="Precision" hint="real alarms" value={result.precision} ci={atChosen ? data.ci.precision : undefined} />
            <Stat label="F1" hint="balance of both" value={result.f1} ci={atChosen ? data.ci.f1 : undefined} />
            <Stat label="AUC" hint="ranking quality" value={data.testMetrics.auc} ci={data.ci.auc} />
          </dl>
          {!atChosen && <p className="mt-4 text-[11px] text-faint">Ranges are shown at the chosen threshold, 0.592, only.</p>}
        </div>
      </div>
    </Plate>
  );
}

function Stat({ label, hint, value, color, ci }: { label: string; hint: string; value: number; color?: string; ci?: [number, number] }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <dt className="flex w-[82px] items-center gap-2 whitespace-nowrap sm:w-[170px]">
        <span className="size-1.5 rounded-full" style={{ background: color ?? "var(--faint)" }} />
        <span className="text-ink">{label}</span>
        <span className="hidden text-[11px] text-dim sm:inline">{hint}</span>
      </dt>
      <dd className="mono w-12 text-[14px] text-ink">{fmt(value)}</dd>
      <dd className="relative h-[6px] w-[90px] shrink-0 rounded-full bg-track sm:w-[150px]">
        {ci && (
          <span
            className="absolute inset-y-0 rounded-full bg-faint/60"
            style={{ left: `${ci[0] * 100}%`, width: `${(ci[1] - ci[0]) * 100}%` }}
          />
        )}
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" style={{ left: `${value * 100}%` }} />
      </dd>
      {ci && (
        <dd className="mono text-[10.5px] text-faint">
          {fmt(ci[0], 2)}–{ci[1] >= 0.9995 ? "1" : fmt(ci[1], 2)}
        </dd>
      )}
    </div>
  );
}

function Matrix({ counts }: { counts: Record<Verdict, number> }) {
  const cell = (v: Verdict, tone: string, text: string) => (
    <div className={`flex items-baseline justify-between rounded-tile px-3 py-2.5 ${tone}`}>
      <span className="mono text-[22px] leading-none">{counts[v]}</span>
      <span className="text-[11px] opacity-80">{text}</span>
    </div>
  );
  return (
    <div>
      <div className="mb-3 text-[12px] text-ink">Confusion matrix</div>
      <div className="grid grid-cols-[84px_1fr_1fr] gap-1.5 text-[11px]">
        <span />
        <span className="px-1 text-dim">alarm</span>
        <span className="px-1 text-dim">no alarm</span>
        <span className="self-center text-right text-dim">about to fail</span>
        {cell("detected", "bg-red text-white", "caught")}
        {cell("missed", "bg-white text-red shadow-[inset_0_0_0_1.5px_var(--red)]", "missed")}
        <span className="self-center text-right text-dim">healthy</span>
        {cell("false alarm", "bg-ink-2 text-white", "false alarm")}
        {cell("quiet", "bg-white text-ink shadow-[inset_0_0_0_1px_var(--hair)]", "quiet")}
      </div>
    </div>
  );
}

const truth = data.test.map((e) => e.y);
const P = truth.filter((y) => y === 1).length;
const N = truth.length - P;

function rocPoints(scores: number[]) {
  const order = scores.map((s, i) => [s, truth[i]] as const).sort((a, b) => b[0] - a[0]);
  const pts: [number, number][] = [[0, 0]];
  let tp = 0;
  let fp = 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i][1] === 1) tp += 1;
    else fp += 1;
    if (i === order.length - 1 || order[i + 1][0] !== order[i][0]) pts.push([fp / N, tp / P]);
  }
  return pts;
}

const CURVES = Object.entries(data.testScores).map(([name, scores]) => ({ name, chosen: name === data.meta.chosen, pts: rocPoints(scores) }));

function Roc({ threshold }: { threshold: number }) {
  const { counts } = confusion(threshold);
  const S = 300;
  const pad = 40;
  const sx = (v: number) => pad + v * (S - pad - 8);
  const sy = (v: number) => S - pad - v * (S - pad - 8);
  const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join("");
  const fx = counts["false alarm"] / N;
  const fy = counts.detected / P;
  return (
    <div>
      <div className="text-[12px] text-ink">ROC curve</div>
      <div className="mt-0.5 text-[11px] text-dim">all thresholds at once · the red dot is the current one</div>
      <svg viewBox={`0 0 ${S} ${S}`} className="mt-2 w-full max-w-[300px]" role="img" aria-label="ROC curves of the 7 models on the test engines">
        <rect x={sx(0)} y={sy(1)} width={sx(1) - sx(0)} height={sy(0) - sy(1)} fill="none" stroke="var(--hair)" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--faint)" strokeDasharray="3 3" strokeWidth="0.8" />
        {CURVES.filter((c) => !c.chosen).map((c) => (
          <path key={c.name} d={path(c.pts)} fill="none" stroke="#cfcfcb" strokeWidth="1" />
        ))}
        {CURVES.filter((c) => c.chosen).map((c) => (
          <path key={c.name} d={path(c.pts)} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
        ))}
        <circle cx={sx(fx)} cy={sy(fy)} r="5.5" fill="var(--red)" stroke="var(--paper)" strokeWidth="2" />
        <text x={sx(fx) + 9} y={sy(fy) + 14} fontSize="10" className="mono" fill="var(--ink)">
          {counts.detected}/25 · {counts["false alarm"]} FA
        </text>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <text x={sx(v)} y={S - pad + 14} textAnchor="middle" fontSize="9" className="mono" fill="#888">
              {v}
            </text>
            <text x={pad - 6} y={sy(v) + 3} textAnchor="end" fontSize="9" className="mono" fill="#888">
              {v}
            </text>
          </g>
        ))}
        <text x={(sx(0) + sx(1)) / 2} y={S - 2} textAnchor="middle" fontSize="10" fill="var(--muted)">
          false alarm rate
        </text>
        <text transform={`translate(10,${(sy(0) + sy(1)) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="var(--muted)">
          failures caught
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-blue" /> logistic regression · AUC {fmt(data.testMetrics.auc)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-4 bg-[#cfcfcb]" /> the 6 others
        </span>
      </div>
    </div>
  );
}
