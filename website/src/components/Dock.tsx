import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { confusion, data } from "@/data";
import { KEPT, SECTIONS, useStore, type DockMode } from "@/state";

const CHOSEN = data.threshold.chosen;

function Label({ children }: { children: string }) {
  return <span className="mono block text-[9.5px] tracking-[0.08em] text-white/45 uppercase">{children}</span>;
}

function ThresholdControl() {
  const { threshold, setThreshold } = useStore();
  const { counts } = useMemo(() => confusion(threshold), [threshold]);
  const moved = Math.abs(threshold - CHOSEN) > 0.0005;
  const mark = `${((CHOSEN - 0.02) / 0.96) * 100}%`;

  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <div className="w-[64px] shrink-0">
        <Label>Alarm at</Label>
        <span className="mono text-[18px] leading-none text-white">{threshold.toFixed(3)}</span>
      </div>
      <div className="relative w-[120px] sm:w-[230px]">
        <span className="pointer-events-none absolute top-[2px] h-[18px] w-px bg-white/40" style={{ left: mark }} />
        <input
          type="range"
          min={0.02}
          max={0.98}
          step={0.001}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          aria-label="Alarm threshold on the model's score"
          className="dial dial-dark relative block"
        />
        <div className="mono mt-0.5 flex justify-between text-[9px] text-white/40">
          <span>more alarms</span>
          <span>fewer</span>
        </div>
      </div>
      <span className="h-8 w-px bg-white/15" />
      <div>
        <Label>Caught</Label>
        <span className="mono text-[18px] leading-none text-white">
          <span className="text-[#ff6b6f]">{counts.detected}</span>
          <span className="text-white/40">/25</span>
        </span>
      </div>
      <div>
        <Label>False alarms</Label>
        <span className="mono text-[18px] leading-none text-white">
          {counts["false alarm"]}
          <span className="text-white/40">/75</span>
        </span>
      </div>
      <button
        onClick={() => setThreshold(CHOSEN)}
        disabled={!moved}
        className="mono hidden rounded-full border border-white/20 px-2.5 py-1 text-[10px] text-white/80 transition hover:border-white/50 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:block"
      >
        reset
      </button>
    </div>
  );
}

function SensorControl() {
  const { sensor, setSensor } = useStore();
  const index = Math.max(0, KEPT.findIndex((s) => s.id === sensor));
  const s = KEPT[index];
  const step = (d: number) => setSensor(KEPT[(index + d + KEPT.length) % KEPT.length].id);
  const spark = (s.spark ?? []).filter((v): v is number => v !== null);
  const lo = Math.min(...spark);
  const hi = Math.max(...spark);
  const d = spark
    .map((v, i) => `${i ? "L" : "M"}${((i * 70) / (spark.length - 1)).toFixed(1)},${(22 - ((v - lo) / (hi - lo || 1)) * 20).toFixed(1)}`)
    .join("");

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <button onClick={() => step(-1)} aria-label="Previous sensor" className="grid size-8 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
        <Chevron dir={-1} />
      </button>
      <div className="min-w-[150px] sm:min-w-[250px]">
        <Label>{`Sensor ${index + 1} of ${KEPT.length}`}</Label>
        <div className="flex items-baseline gap-2">
          <span className="mono text-[17px] leading-none text-white">{s.symbol}</span>
          <span className="hidden truncate text-[12px] text-white/60 sm:inline">{s.name}</span>
        </div>
      </div>
      <svg viewBox="0 0 70 24" className="h-6 w-[70px]" aria-hidden>
        <path d={d} fill="none" stroke={s.rises ? "#ff6b6f" : "#6ea8ff"} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <button onClick={() => step(1)} aria-label="Next sensor" className="grid size-8 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
        <Chevron dir={1} />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: 1 | -1 }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={dir === 1 ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

function useSettledMode(mode: DockMode) {
  const [shown, setShown] = useState(mode);
  useEffect(() => {
    if (mode !== "none") {
      setShown(mode);
      return;
    }
    const t = window.setTimeout(() => setShown("none"), 380);
    return () => window.clearTimeout(t);
  }, [mode]);
  return shown;
}

export function Dock() {
  const { active } = useStore();
  const mode = useSettledMode(SECTIONS.find((s) => s.id === active)?.dock ?? "none");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-7">
      <AnimatePresence>
        {mode !== "none" && (
          <motion.div
            key="dock"
            layout
            initial={{ opacity: 0, y: 26, scale: 0.97, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE, layout: { duration: 0.5, ease: EASE } }}
            style={{ borderRadius: 999 }}
            className="pointer-events-auto relative max-w-full overflow-hidden bg-[#141414] px-5 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_2px_4px_rgba(0,0,0,0.12),0_18px_48px_-10px_rgba(0,0,0,0.45)] sm:px-7 sm:py-3.5"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={mode}
                layout="position"
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {mode === "threshold" ? <ThresholdControl /> : <SensorControl />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
