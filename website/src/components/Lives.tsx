import { ReferenceLine } from "recharts";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { data, pct } from "@/data";
import { Legend, Plate, Swatch } from "./Plate";

const W = data.meta.window;
const rows = data.lifetimes.map((e) => ({ unit: `#${e.unit}`, healthy: e.life - W, warning: W, life: e.life }));
const lives = data.lifetimes.map((e) => e.life);
const sorted = [...lives].sort((a, b) => a - b);
const median = Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2);

const config = {
  healthy: { label: "Healthy (y = 0)", colors: { light: ["#d4d4d4"] } },
  warning: { label: `Last ${W} cycles (y = 1)`, colors: { light: ["#e5484d"] } },
} satisfies ChartConfig;

type Row = (typeof rows)[number];

function LifeTip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">Engine {row.unit}</div>
      <div className="num text-dim">{row.life} flights until it broke</div>
    </div>
  );
}

export function Lives() {
  return (
    <Plate
      id="label"
      n="02"
      kicker="Label"
      title={
        <>
          What the model <em className="serif">has to predict</em>.
        </>
      }
      caption={`Each bar is one engine, from its first flight until it broke. Its last ${W} flights are labelled “about to fail” (red), all the others “healthy”.`}
    >
      <div className="h-[260px] w-full sm:h-[300px]">
        <EvilBarChart
          data={rows}
          config={config}
          stackType="stacked"
          barRadius={1}
          barCategoryGap={1}
          animationType="left-to-right"
          className="aspect-auto h-full w-full"
          chartProps={{ margin: { top: 16, right: 4, bottom: 0, left: 4 } }}
        >
          <EvilBarChart.XAxis dataKey="unit" hide />
          <EvilBarChart.YAxis
            ticks={[0, 100, 200, 300]}
            domain={[0, 370]}
            width={36}
            tickFormatter={(v: number) => String(v)}
          />
          <EvilBarChart.Grid vertical={false} horizontal strokeDasharray="2 4" stroke="var(--hair)" />
          <ChartTooltip cursor={false} content={<LifeTip />} />
          <ReferenceLine
            y={median}
            stroke="var(--ink-2)"
            strokeDasharray="3 3"
            strokeWidth={0.8}
            label={{ value: `median ${median}`, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }}
          />
          <EvilBarChart.Bar dataKey="healthy" />
          <EvilBarChart.Bar dataKey="warning" />
        </EvilBarChart>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <Legend
          items={[
            { swatch: <Swatch color="#d4d4d4" />, label: "healthy" },
            { swatch: <Swatch color="var(--red)" />, label: `last ${W} flights: about to fail` },
          ]}
        />
        <div className="num flex gap-6 text-[12px] text-dim">
          <span>
            <span className="text-ink">{Math.min(...lives)}</span> to <span className="text-ink">{Math.max(...lives)}</span> flights per engine
          </span>
          <span>
            only <span className="text-red">{pct(data.meta.positiveShare)}</span> of flights are red
          </span>
        </div>
      </div>
    </Plate>
  );
}
