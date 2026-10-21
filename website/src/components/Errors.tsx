import { CartesianGrid, ReferenceArea, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import { data, verdictOf, type TestEngine } from "@/data";
import { useStore } from "@/state";
import { Legend, Plate, Swatch } from "./Plate";

const W = data.meta.window;

const scatterConfig = {
  imminent: { label: "Truly imminent", colors: { light: ["#e5484d"] } },
  healthy: { label: "Truly healthy", colors: { light: ["#2a78d6"] } },
} satisfies ChartConfig;

type Point = TestEngine & { wrong: boolean; alarm: boolean };

function Dot(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  const color = payload.y ? "var(--red)" : "var(--blue)";
  return (
    <g>
      {payload.wrong && <circle cx={cx} cy={cy} r={10} fill="none" stroke="var(--ink)" strokeWidth={0.9} />}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={payload.alarm ? color : "var(--paper)"}
        stroke={color}
        strokeWidth={1.5}
        fillOpacity={payload.wrong ? 1 : 0.85}
      />
      {payload.wrong && (
        <text x={cx + 13} y={cy + 4} fontSize={10} fill="var(--ink-2)" className="num">
          {payload.rul}
        </text>
      )}
    </g>
  );
}

function PointTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const verdict = verdictOf(p, data.threshold.chosen);
  return (
    <div className="rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">Engine {p.unit}</div>
      <div className="num text-dim">
        {p.rul} flights left · score <span className="text-ink">{p.score.toFixed(3)}</span>
      </div>
      <div className={p.y ? "text-red" : "text-dim"}>{verdict}</div>
    </div>
  );
}

export function Errors() {
  const { threshold } = useStore();
  const points: Point[] = data.test.map((e) => {
    const verdict = verdictOf(e, threshold);
    return { ...e, alarm: e.score >= threshold, wrong: verdict === "missed" || verdict === "false alarm" };
  });
  const wrong = points.filter((p) => p.wrong);
  const far = wrong.length ? Math.max(...wrong.map((p) => Math.abs(p.rul - W))) : 0;
  const early = points.filter((p) => p.wrong && p.y === 0).map((p) => p.rul - W);
  const earlyText = early.length ? `The ${early.length} false alarms came ${Math.min(...early)}–${Math.max(...early)} flights early.` : "";

  return (
    <Plate
      id="errors"
      n="09"
      kicker="Errors"
      title={
        <>
          The mistakes are <em className="serif">near misses</em>.
        </>
      }
      caption={`Model score vs. how many flights each engine really had left. All ${wrong.length} mistakes are within ${far} flights of the ${W}-flight line. ${earlyText}`}
    >
      <div className="mb-2 text-[12px] text-dim">model score</div>
      <div className="h-[300px] w-full sm:h-[340px]">
        <ChartContainer config={scatterConfig} className="aspect-auto h-full w-full">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--hair)" />
            <ReferenceArea x1={0} x2={W} fill="var(--red)" fillOpacity={0.05} />
            <XAxis
              type="number"
              dataKey="rul"
              domain={[0, 150]}
              ticks={[0, W, 50, 100, 150]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              type="number"
              dataKey="score"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => (v === 0 ? "0" : v === 1 ? "1" : String(v).replace(/^0/, ""))}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <ReferenceLine x={W} stroke="var(--red)" strokeDasharray="3 3" strokeWidth={0.8} />
            <ReferenceLine
              y={threshold}
              stroke="var(--ink)"
              strokeWidth={0.8}
              label={{ value: `alarm ≥ ${threshold.toFixed(3)}`, position: "insideTopRight", fill: "var(--ink-2)", fontSize: 11 }}
            />
            <ChartTooltip cursor={false} content={<PointTip />} />
            <Scatter data={points} shape={<Dot />} isAnimationActive={false} />
          </ScatterChart>
        </ChartContainer>
      </div>
      <div className="mt-2 text-right text-[12px] text-dim">flights really left →</div>
      <div className="mt-4">
        <Legend
          items={[
            { swatch: <Swatch color="var(--red)" round />, label: "really about to fail" },
            { swatch: <Swatch color="var(--blue)" round />, label: "really healthy" },
            { swatch: <Swatch color="var(--ink-2)" round hollow />, label: "filled = alarm · ring = mistake" },
          ]}
        />
      </div>

    </Plate>
  );
}
