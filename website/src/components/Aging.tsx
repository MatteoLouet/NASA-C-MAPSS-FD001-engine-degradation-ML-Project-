import { useMemo, useRef, useState } from "react";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import { data } from "@/data";
import { topLabel } from "@/lib/labels";
import { useStore } from "@/state";
import { Legend, Plate, Swatch } from "./Plate";

const WIN = data.meta.window;
const MAX = 150;
const VW = 880;
const VH = 330;
const PAD = { l: 34, r: 12, t: 12, b: 28 };
const sx = (rul: number) => PAD.l + ((MAX - rul) / MAX) * (VW - PAD.l - PAD.r);
const sy = (score: number) => PAD.t + (1 - score) * (VH - PAD.t - PAD.b);

const engines = data.aging
  .filter((e) => e.pts.length > 1)
  .map((e) => {
    const byRul = new Map(e.pts.map(([r, s]) => [r, s]));
    const path = e.pts.map(([r, s], i) => `${i ? "L" : "M"}${sx(r).toFixed(1)},${sy(s).toFixed(1)}`).join("");
    const final = data.test.find((t) => t.unit === e.unit)!;
    return { ...e, byRul, path, imminent: final.y === 1 };
  });

const DEFAULT = engines
  .filter((e) => e.imminent && e.pts.length >= 120)
  .sort((a, b) => (a.end ?? 99) - (b.end ?? 99))[0]?.unit ?? engines[0].unit;

const BANDS: [string, number, number][] = [
  ["0–10", 0, 10], ["11–20", 11, 20], ["21–30", 21, 30], ["31–40", 31, 40],
  ["41–50", 41, 50], ["51–75", 51, 75], ["76–100", 76, 100], [">100", 101, 150],
];

const bandConfig = {
  imminent: { label: "Alarm is right", colors: { light: ["#e5484d"] } },
  healthy: { label: "Alarm is early", colors: { light: ["#2a78d6"] } },
} satisfies ChartConfig;

function firstRing(e: (typeof engines)[number], threshold: number) {
  for (const [r, s] of e.pts) if (s >= threshold) return r;
  return null;
}

type BandRow = { band: string; imminent: number | null; healthy: number | null; rows: number };

function BandTip({ active, payload }: { active?: boolean; payload?: { payload: BandRow }[] }) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;
  const share = b.imminent ?? b.healthy ?? 0;
  return (
    <div className="rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">{b.band} flights left</div>
      <div className="num text-dim">
        alarm on <span className="text-ink">{(share * 100).toFixed(1)}%</span> of {b.rows.toLocaleString("en-US")} flights
      </div>
    </div>
  );
}

export function Aging() {
  const { threshold } = useStore();
  const [unit, setUnit] = useState(DEFAULT);
  const svg = useRef<SVGSVGElement>(null);
  const focus = engines.find((e) => e.unit === unit)!;
  const ring = firstRing(focus, threshold);

  const bands = useMemo<BandRow[]>(
    () =>
      BANDS.map(([label, lo, hi], i) => {
        let on = 0;
        let n = 0;
        for (const e of engines)
          for (const [r, s] of e.pts)
            if (r >= lo && r <= hi) {
              n += 1;
              if (s >= threshold) on += 1;
            }
        const share = n ? on / n : 0;
        return { band: label, imminent: i < 3 ? share : null, healthy: i < 3 ? null : share, rows: n };
      }),
    [threshold],
  );

  const lead = useMemo(() => {
    const rings = engines
      .filter((e) => e.imminent && e.pts[0][0] > 60)
      .map((e) => firstRing(e, threshold))
      .filter((r): r is number => r !== null)
      .sort((a, b) => a - b);
    return rings.length ? rings[Math.floor(rings.length / 2)] : null;
  }, [threshold]);

  const onMove = (ev: React.MouseEvent<SVGSVGElement>) => {
    const box = svg.current!.getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * VW;
    const y = ((ev.clientY - box.top) / box.height) * VH;
    const rul = Math.round(MAX - ((x - PAD.l) / (VW - PAD.l - PAD.r)) * MAX);
    const score = 1 - (y - PAD.t) / (VH - PAD.t - PAD.b);
    let best: number | null = null;
    let gap = 0.06;
    for (const e of engines) {
      const s = e.byRul.get(rul);
      if (s === undefined) continue;
      const g = Math.abs(s - score);
      if (g < gap) {
        gap = g;
        best = e.unit;
      }
    }
    if (best !== null) setUnit(best);
  };

  return (
    <Plate
      id="aging"
      n="10"
      kicker="In service"
      title={
        <>
          The score <em className="serif">climbs as the engine wears</em>.
        </>
      }
      caption="Each line is one test engine, flight by flight. The score stays near 0 for most of its life and crosses the alarm line near the end. Hover a line to follow one engine."
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
        <span className="text-dim">model score</span>
        <span className="num text-ink">
          Engine {focus.unit}
          <span className="text-dim">
            {" "}
            · record stops {focus.end} flights before failure ·{" "}
            {ring === null ? (
              "alarm never rings"
            ) : (
              <>
                first alarm with <span className="text-ink">{ring}</span> flights left
              </>
            )}
          </span>
        </span>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <svg
        ref={svg}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full min-w-[620px] sm:min-w-0"
        onMouseMove={onMove}
        role="img"
        aria-label="Score of each test engine against its true cycles left"
      >
        <rect x={sx(WIN)} y={PAD.t} width={sx(0) - sx(WIN)} height={VH - PAD.t - PAD.b} fill="var(--red)" opacity="0.05" />
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={VW - PAD.r} y1={sy(v)} y2={sy(v)} stroke="var(--hair)" strokeDasharray="2 4" />
            <text x={PAD.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#666" className="num">
              {v === 0 ? "0" : v === 1 ? "1" : String(v).replace(/^0/, "")}
            </text>
          </g>
        ))}
        {[150, 100, 50, WIN, 0].map((r) => (
          <text key={r} x={sx(r)} y={VH - 8} textAnchor="middle" fontSize="11" fill="#666" className="num">
            {r === 0 ? "fail" : r}
          </text>
        ))}
        <line x1={sx(WIN)} x2={sx(WIN)} y1={PAD.t} y2={VH - PAD.b} stroke="var(--red)" strokeDasharray="3 3" strokeWidth="0.8" />

        <g fill="none" strokeLinejoin="round">
          {engines.map((e) => (
            <path key={e.unit} d={e.path} stroke={e.imminent ? "#f2bcbe" : "#dcdcd9"} strokeWidth="0.7" opacity="0.85" />
          ))}
        </g>

        <line x1={PAD.l} x2={VW - PAD.r} y1={sy(threshold)} y2={sy(threshold)} stroke="var(--ink)" strokeWidth="0.9" />
        <text x={PAD.l + 6} y={sy(threshold) - 6} fontSize="11" fill="var(--ink-2)" className="num">
          alarm ≥ {threshold.toFixed(3)}
        </text>

        <path d={focus.path} fill="none" stroke="var(--paper)" strokeWidth="5" strokeLinejoin="round" />
        <path d={focus.path} fill="none" stroke={focus.imminent ? "var(--red)" : "var(--blue)"} strokeWidth="2" strokeLinejoin="round" />
        {ring !== null && (
          <g>
            <circle cx={sx(ring)} cy={sy(focus.byRul.get(ring)!)} r="5.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.2" />
            <circle cx={sx(ring)} cy={sy(focus.byRul.get(ring)!)} r="2.2" fill="var(--ink)" />
          </g>
        )}
        {focus.end !== null && (
          <circle cx={sx(focus.end)} cy={sy(focus.byRul.get(focus.end)!)} r="3" fill={focus.imminent ? "var(--red)" : "var(--blue)"} />
        )}
      </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <Legend
          items={[
            { swatch: <Swatch color="#f0b3b5" />, label: "engines that were about to fail" },
            { swatch: <Swatch color="#d6d6d3" />, label: "healthy engines" },
          ]}
        />
        <span className="text-[12px] text-dim">flights left before failure →</span>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] md:items-end">
        <div>
          <div className="mono text-[44px] leading-none text-ink">
            {lead ?? "–"}
            <span className="ml-1 text-[14px] tracking-normal text-dim">flights</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-dim">
            of warning (median): how early the first alarm comes for engines about to fail
          </p>
        </div>
        <div>
          <p className="mb-4 text-[12px] text-dim">How often the alarm is on, by flights left before failure</p>
          <div className="h-[200px] w-full">
            <EvilBarChart
              data={bands}
              config={bandConfig}
              stackType="stacked"
              barRadius={3}
              barCategoryGap={8}
              animationType="none"
              className="aspect-auto h-full w-full"
              chartProps={{ margin: { top: 20, right: 0, bottom: 0, left: 0 } }}
            >
              <EvilBarChart.XAxis dataKey="band" tick={{ fontSize: 10 }} interval={0} />
              <EvilBarChart.YAxis hide domain={[0, 1]} />
              <ChartTooltip cursor={false} content={<BandTip />} />
              <EvilBarChart.Bar dataKey="imminent" barProps={{ label: topLabel(bands, "imminent", "var(--ink-2)") }} />
              <EvilBarChart.Bar dataKey="healthy" barProps={{ label: topLabel(bands, "healthy", "var(--ink-2)") }} />
            </EvilBarChart>
          </div>
        </div>
      </div>
    </Plate>
  );
}
