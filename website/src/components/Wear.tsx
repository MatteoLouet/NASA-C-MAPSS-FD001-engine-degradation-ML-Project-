import { useMemo } from "react";
import { Area, ReferenceArea, ReferenceLine } from "recharts";
import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { data, type Sensor } from "@/data";
import { cn } from "@/lib/utils";
import { KEPT, useStore } from "@/state";
import { Legend, Plate, Swatch } from "./Plate";

const W = data.meta.window;

type Row = { t: number; mean: number; band: [number, number] };

function WearTip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">{row.t === 0 ? "the flight it broke" : `${-row.t} flights before failure`}</div>
      <div className="mono text-dim">
        average <span className="text-ink">{row.mean.toFixed(2)}</span>
        <span className="text-faint"> · </span>
        {row.band[0].toFixed(1)} to {row.band[1].toFixed(1)}
      </div>
    </div>
  );
}

function Mini({ sensor, on, onPick }: { sensor: Sensor; on: boolean; onPick: () => void }) {
  const values = (sensor.spark ?? []).filter((v): v is number => v !== null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (i * 100) / (values.length - 1);
  const y = (v: number) => 26 - ((v - lo) / (hi - lo || 1)) * 22;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const color = sensor.rises ? "var(--red)" : "var(--blue)";
  return (
    <button
      onClick={onPick}
      onMouseEnter={onPick}
      aria-pressed={on}
      aria-label={`${sensor.symbol}: ${sensor.name}`}
      className={cn(
        "group relative flex flex-col gap-1 rounded-tile px-2.5 pt-2 pb-1.5 text-left transition-all duration-200",
        on ? "bg-white shadow-[0_0_0_1px_var(--ink),0_6px_16px_-8px_rgba(0,0,0,0.3)]" : "hover:bg-white hover:shadow-[0_0_0_1px_var(--hair)]",
      )}
    >
      <span className={cn("mono text-[10.5px] transition-colors", on ? "text-ink" : "text-dim group-hover:text-ink")}>{sensor.symbol}</span>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
        <rect x={x(values.length - 7)} y="0" width={100 - x(values.length - 7)} height="30" fill="var(--red-wash)" />
        <path d={d} fill="none" stroke={on ? color : "#9a9a96"} strokeWidth={on ? 1.8 : 1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Split({ id }: { id: string }) {
  const hist = data.hist.sensors[id];
  const edges = data.hist.edges;
  const sensor = KEPT.find((s) => s.id === id)!;
  const max = Math.max(...hist.healthy, ...hist.imminent);
  const VW = 220;
  const VH = 150;
  const x = (i: number) => 10 + (i / (edges.length - 1)) * (VW - 20);
  const y = (v: number) => VH - 18 - (v / max) * (VH - 30);
  const area = (vals: number[]) =>
    `M10,${VH - 18} ` +
    vals.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)} L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ") +
    ` L${VW - 10},${VH - 18} Z`;
  const zero = x(edges.indexOf(0));
  const color = sensor.rises ? "var(--red)" : "var(--blue)";
  return (
    <div>
      <div className="text-[12px] text-ink">Healthy vs. about to fail</div>
      <div className="mt-0.5 text-[11px] text-dim">all {sensor.symbol} readings, split in two groups</div>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="mt-3 w-full" aria-label={`Distribution of ${sensor.symbol} for healthy and failing flights`}>
        <path d={area(hist.healthy)} fill="#bdbdba" fillOpacity="0.55" />
        <path d={area(hist.imminent)} fill={color} fillOpacity="0.55" />
        <line x1="0" x2={VW} y1={VH - 18} y2={VH - 18} stroke="var(--faint)" strokeWidth="0.8" />
        <line x1={zero} x2={zero} y1={8} y2={VH - 18} stroke="var(--hair)" strokeDasharray="2 3" />
        {[-4, -2, 0, 2, 4].map((v) => (
          <text key={v} x={x(edges.indexOf(v))} y={VH - 4} textAnchor="middle" fontSize="9" fill="#888" className="mono">
            {v > 0 ? `+${v}` : v}
          </text>
        ))}
      </svg>
      <div className="mt-2">
        <Legend
          items={[
            { swatch: <Swatch color="#bdbdba" />, label: "healthy" },
            { swatch: <Swatch color={color} />, label: "last 30 flights" },
          ]}
        />
      </div>
      <p className="mt-3 text-[11px] leading-snug text-dim">
        The two groups are <span className="mono text-ink">{Math.abs(sensor.gap!).toFixed(1)}</span> standard deviations apart, but
        they overlap: one sensor alone is not enough.
      </p>
    </div>
  );
}

export function Wear() {
  const { sensor: id, setSensor } = useStore();
  const sensor = KEPT.find((s) => s.id === id) ?? KEPT[0];
  const color = sensor.rises ? "#e5484d" : "#2a78d6";

  const rows = useMemo<Row[]>(
    () => data.trajectories[sensor.id].map((p) => ({ t: p.t, mean: p.mean, band: [p.lo, p.hi] })),
    [sensor.id],
  );

  const domain = useMemo<[number, number]>(() => {
    const lo = Math.min(...rows.map((r) => r.band[0]));
    const hi = Math.max(...rows.map((r) => r.band[1]));
    return [Math.floor(lo), Math.ceil(hi)];
  }, [rows]);

  const config = useMemo(
    () =>
      ({
        mean: { label: "Average of 100 engines", colors: { light: [color] } },
        band: { label: "Most engines (10th–90th percentile)", colors: { light: [color] } },
      }) satisfies ChartConfig,
    [color],
  );

  return (
    <Plate
      id="signal"
      n="03"
      kicker="Drift"
      title={
        <>
          Sensors <em className="serif">drift</em> before failure.
        </>
      }
      caption="All 100 engines lined up on the flight they broke. The readings stay flat for most of the life, then move away fast in the last 50 flights. Pick a sensor below."
    >
      <div className="-mx-2.5 grid grid-cols-4 gap-1 sm:grid-cols-7" role="group" aria-label="Choose a sensor">
        {KEPT.map((s) => (
          <Mini key={s.id} sensor={s} on={s.id === sensor.id} onPick={() => setSensor(s.id)} />
        ))}
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="flex items-baseline justify-between gap-4 text-[12px]">
            <span className="text-ink">
              {sensor.symbol} <span className="text-dim">· {sensor.name}</span>
            </span>
            <span className="mono text-[11px] text-dim">standardised value</span>
          </div>
          <div className="mt-3 h-[260px] w-full sm:h-[300px]">
            <EvilAreaChart
              key={sensor.id}
              data={rows}
              config={config}
              curveType="monotone"
              animationType="left-to-right"
              className="aspect-auto h-full w-full"
              chartProps={{ margin: { top: 8, right: 8, bottom: 0, left: 0 } }}
            >
              <EvilAreaChart.Grid strokeDasharray="2 4" stroke="var(--hair)" />
              <ReferenceArea x1={-W} x2={0} fill="var(--red)" fillOpacity={0.06} ifOverflow="visible" />
              <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={0.8} />
              <EvilAreaChart.XAxis
                dataKey="t"
                type="number"
                domain={[-200, 0]}
                ticks={[-200, -150, -100, -50, -W, 0]}
                tickFormatter={(v: number) => (v === 0 ? "broke" : String(-v))}
              />
              <EvilAreaChart.YAxis width={34} domain={domain} allowDecimals={false} tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))} />
              <ChartTooltip cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }} content={<WearTip />} />
              <Area dataKey="band" type="monotone" stroke="none" fill={color} fillOpacity={0.13} isAnimationActive={false} activeDot={false} />
              <EvilAreaChart.Area dataKey="mean" variant="gradient" strokeVariant="solid" strokeWidth={2} areaProps={{ dataKey: "mean", baseValue: 0 }} />
            </EvilAreaChart>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-3 text-[12px] text-dim">
            <span>flights before failure</span>
            <span className="text-red">last {W} flights = “about to fail”</span>
          </div>
        </div>
        <Split id={sensor.id} />
      </div>
    </Plate>
  );
}
