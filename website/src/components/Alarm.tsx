import { ReferenceLine } from "recharts";
import { EvilLineChart } from "@/components/evilcharts/charts/recharts-line-chart";
import { ChartTooltip } from "@/components/evilcharts/ui/recharts-tooltip";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { data, fmt } from "@/data";
import { Legend, Plate, Swatch } from "./Plate";
import { useStore } from "@/state";

const config = {
  recall: { label: "Recall", colors: { light: ["#e5484d"] } },
  precision: { label: "Precision", colors: { light: ["#2a78d6"] } },
  f2: { label: "F2", colors: { light: ["#4a3aa7"] } },
} satisfies ChartConfig;

type Row = (typeof data.threshold.curve)[number];

function CurveTip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="num grid min-w-32 gap-1 rounded-tile border border-hair bg-white px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-ink">threshold {row.t.toFixed(2)}</div>
      {(["recall", "precision", "f2"] as const).map((k) => (
        <div key={k} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-dim">
            <Swatch color={config[k].colors.light[0]} />
            {config[k].label}
          </span>
          <span className="text-ink">{fmt(row[k])}</span>
        </div>
      ))}
    </div>
  );
}

export function Alarm() {
  const { threshold } = useStore();
  return (
    <Plate
      id="decision"
      n="07"
      kicker="Decision"
      title={
        <>
          When to <em className="serif">raise the alarm</em>.
        </>
      }
      caption="The model gives each flight a score from 0 to 1. Above the threshold, it raises an alarm. A lower threshold catches more failures but gives more false alarms. We picked 0.592 (on training engines only), where a missed failure counts twice as much as a false alarm."
    >
      <div className="h-[260px] w-full sm:h-[300px]">
        <EvilLineChart
          data={data.threshold.curve}
          config={config}
          curveType="monotone"
          animationType="left-to-right"
          className="aspect-auto h-full w-full"
          chartProps={{ margin: { top: 8, right: 8, bottom: 0, left: 0 } }}
        >
          <EvilLineChart.Grid strokeDasharray="2 4" stroke="var(--hair)" />
          <EvilLineChart.XAxis dataKey="t" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v: number) => (v === 0 ? "0" : v === 1 ? "1" : fmt(v, 2))} />
          <EvilLineChart.YAxis width={34} domain={[0.3, 1]} ticks={[0.4, 0.6, 0.8, 1]} tickFormatter={(v: number) => (v === 1 ? "1" : fmt(v, 1))} />
          <ChartTooltip cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }} content={<CurveTip />} />
          <ReferenceLine x={data.threshold.chosen} stroke="var(--faint)" strokeWidth={0.8} strokeDasharray="3 3" />
          <ReferenceLine x={threshold} stroke="var(--ink)" strokeWidth={1} />
          <EvilLineChart.Line dataKey="recall" strokeVariant="solid" strokeWidth={2} />
          <EvilLineChart.Line dataKey="precision" strokeVariant="solid" strokeWidth={2} />
          <EvilLineChart.Line dataKey="f2" strokeVariant="solid" strokeWidth={2} />
        </EvilLineChart>
      </div>
      <div className="mt-4">
        <Legend
          items={[
            { swatch: <Swatch color="var(--red)" />, label: "recall: failures caught" },
            { swatch: <Swatch color="var(--blue)" />, label: "precision: alarms that were real" },
            { swatch: <Swatch color="var(--violet)" />, label: "F2: the balance we maximise" },
          ]}
        />
      </div>
    </Plate>
  );
}
