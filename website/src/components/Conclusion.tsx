import { confusion, data, verdictOf } from "@/data";
import { Plate } from "./Plate";

const at = confusion(data.threshold.chosen);
const near = Math.max(
  ...data.test.filter((e) => ["missed", "false alarm"].includes(verdictOf(e, data.threshold.chosen))).map((e) => Math.abs(e.rul - data.meta.window)),
);

export function Conclusion() {
  return (
    <Plate
      id="conclusion"
      n="12"
      kicker="Conclusion"
      title={
        <>
          Yes: the sensors of one flight are <em className="serif">enough to warn</em>.
        </>
      }
      caption="A simple, readable model catches most failures before they happen, with few false alarms, and its few mistakes are near misses."
    >
      <div className="grid gap-px overflow-hidden rounded-card border border-hair bg-hair sm:grid-cols-3">
        <Big value={`${at.counts.detected} of 25`} label="engines about to fail were caught" tone="text-red" />
        <Big value={`${at.counts["false alarm"]} of 75`} label="healthy engines raised a false alarm" />
        <Big value={`≤ ${near}`} label="flights from the 30-flight line: the size of every mistake" />
      </div>

    </Plate>
  );
}

function Big({ value, label, tone = "text-ink" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="bg-white p-5">
      <div className={`mono text-[30px] leading-none ${tone}`}>{value}</div>
      <div className="mt-2 text-[12px] leading-snug text-dim">{label}</div>
    </div>
  );
}
