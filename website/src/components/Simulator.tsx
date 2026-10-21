import { useEffect, useMemo, useRef, useState } from "react";
import { data } from "@/data";
import { cn } from "@/lib/utils";
import { FEATURES, MODEL, generate, mulberry32, predict, type Flight } from "@/model";
import { useStore } from "@/state";
import { Plate } from "./Plate";

const W = data.meta.window;
const START = 200;
const INFO = Object.fromEntries(data.sensors.map((s) => [s.id, s]));
const UNIT: Record<string, string> = {
  s2: "°R", s3: "°R", s4: "°R", s7: "psia", s11: "psia", s8: "rpm", s9: "rpm", s13: "rpm", s14: "rpm",
  s12: "pps/psi", s15: "", s17: "", s20: "lbm/s", s21: "lbm/s",
};
const DIGITS = MODEL.scale.map((s) => (s < 0.05 ? 4 : s < 0.5 ? 2 : s < 5 ? 1 : 0));

type LogPoint = { rul: number; score: number };

function Reading({ i, flight, push, max }: { i: number; flight: Flight; push: number; max: number }) {
  const id = FEATURES[i];
  const z = (flight.x[i] - MODEL.mean[i]) / MODEL.scale[i];
  const pos = (v: number) => `${((Math.max(-3, Math.min(4, v)) + 3) / 7) * 100}%`;
  const color = push > 0 ? "var(--red)" : "var(--blue)";
  const share = (Math.min(Math.abs(push), max) / max) * 50;
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_96px_minmax(0,0.9fr)] items-center gap-3 py-[6px] sm:gap-5">
      <span className="mono text-[11px] text-ink">{INFO[id].symbol}</span>
      <span className="relative h-[6px] rounded-full bg-track">
        <span className="absolute inset-y-0 rounded-full bg-[#dcdcd8]" style={{ left: pos(-1), width: `${(2 / 7) * 100}%` }} />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)] transition-[left] duration-150"
          style={{ left: pos(z), background: color }}
        />
      </span>
      <span className="mono text-right text-[11px] text-ink">
        {flight.x[i].toFixed(DIGITS[i])}
        <span className="ml-1 inline-block w-[34px] text-left text-[9.5px] text-faint">{UNIT[id]}</span>
      </span>
      <span className="relative h-[8px]">
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-hair" />
        <span
          className="absolute inset-y-0 rounded-mark transition-all duration-150"
          style={{ background: color, left: push > 0 ? "50%" : `${50 - share}%`, width: `${share}%` }}
        />
      </span>
    </div>
  );
}

function Log({ log, threshold, first, steady }: { log: LogPoint[]; threshold: number; first: number | null; steady: number | null }) {
  const VW = 880;
  const VH = 190;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const sx = (r: number) => pad.l + ((START - r) / START) * (VW - pad.l - pad.r);
  const sy = (s: number) => pad.t + (1 - s) * (VH - pad.t - pad.b);
  const path = log.map((p, i) => `${i ? "L" : "M"}${sx(p.rul).toFixed(1)},${sy(p.score).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="img" aria-label="Score of the generated flights">
      <rect x={sx(W)} y={pad.t} width={sx(0) - sx(W)} height={VH - pad.t - pad.b} fill="var(--red)" opacity="0.05" />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={VW - pad.r} y1={sy(v)} y2={sy(v)} stroke="var(--hair)" strokeDasharray="2 4" />
          <text x={pad.l - 8} y={sy(v) + 3} textAnchor="end" fontSize="9.5" className="mono" fill="#888">
            {v === 0.5 ? ".5" : v}
          </text>
        </g>
      ))}
      {[200, 150, 100, 50, W, 0].map((r) => (
        <text key={r} x={sx(r)} y={VH - 6} textAnchor={r === 0 ? "end" : "middle"} fontSize="9.5" className="mono" fill="#888">
          {r === 0 ? "broke" : r}
        </text>
      ))}
      <line x1={pad.l} x2={VW - pad.r} y1={sy(threshold)} y2={sy(threshold)} stroke="var(--ink)" strokeWidth="0.9" />
      <path d={path} fill="none" stroke="#bdbdba" strokeWidth="1" strokeLinejoin="round" />
      {log.map((p, i) => (
        <circle key={i} cx={sx(p.rul)} cy={sy(p.score)} r={i === log.length - 1 ? 4.5 : 2.4} fill={p.score >= threshold ? "var(--red)" : "var(--ink-2)"} stroke="var(--paper)" strokeWidth={i === log.length - 1 ? 2 : 0.8} />
      ))}
      {steady !== null && steady !== first && (
        <g>
          <line x1={sx(steady)} x2={sx(steady)} y1={pad.t} y2={VH - pad.b} stroke="var(--ink)" strokeDasharray="3 3" strokeWidth="0.9" />
          <text x={sx(steady) - 6} y={pad.t + 26} textAnchor="end" fontSize="10.5" fill="var(--ink)">
            alarm on for good: {steady}
          </text>
        </g>
      )}
      {first !== null && (
        <g>
          <line x1={sx(first)} x2={sx(first)} y1={pad.t} y2={VH - pad.b} stroke="var(--red)" strokeDasharray="3 3" strokeWidth="0.9" />
          <text x={sx(first) - 6} y={pad.t + 12} textAnchor="end" fontSize="10.5" fill="var(--red)">
            first alarm: {first} flights before failure
          </text>
        </g>
      )}
    </svg>
  );
}

export function Simulator() {
  const { threshold } = useStore();
  const [rul, setRul] = useState(120);
  const [flight, setFlight] = useState<Flight>(() => generate(120, mulberry32(7)));
  const [log, setLog] = useState<LogPoint[]>(() => [{ rul: 120, score: predict(generate(120, mulberry32(7)).x).score }]);

  const [flying, setFlying] = useState(false);
  const [done, setDone] = useState(false);
  const rand = useRef(mulberry32(Date.now() % 2 ** 31));
  const timer = useRef<number | null>(null);

  const result = useMemo(() => predict(flight.x), [flight]);
  const order = useMemo(() => FEATURES.map((_, i) => i).sort((a, b) => Math.abs(MODEL.coef[b]) - Math.abs(MODEL.coef[a])), []);
  const maxPush = 4;
  const alarm = result.score >= threshold;
  const truth = flight.rul <= W;
  const right = alarm === truth;
  const first = useMemo(() => {
    if (!done && !flying) return null;
    const hit = log.find((p) => p.score >= threshold);
    return hit ? hit.rul : null;
  }, [log, threshold, done, flying]);
  const steady = useMemo(() => {
    if (!done) return null;
    let k = log.length;
    while (k > 0 && log[k - 1].score >= threshold) k -= 1;
    return k < log.length ? log[k].rul : null;
  }, [log, threshold, done]);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setFlying(false);
  };

  useEffect(() => stop, []);

  const once = (at = rul) => {
    stop();
    setDone(false);
    const f = generate(at, rand.current);
    setFlight(f);
    setLog((l) => [...l.filter((p) => p.rul !== f.rul), { rul: f.rul, score: predict(f.x).score }].sort((a, b) => b.rul - a.rul));
  };

  const fly = () => {
    if (flying) return stop();
    setDone(false);
    setFlying(true);
    let r = START;
    let f = generate(r, rand.current);
    setFlight(f);
    setRul(r);
    setLog([{ rul: r, score: predict(f.x).score }]);
    timer.current = window.setInterval(() => {
      r -= 1;
      if (r < 0) {
        stop();
        setDone(true);
        return;
      }
      f = generate(r, rand.current, f.noise);
      const point = { rul: r, score: predict(f.x).score };
      setFlight(f);
      setRul(r);
      setLog((l) => [...l, point]);
    }, 55);
  };

  return (
    <Plate
      id="simulate"
      n="11"
      kicker="Try it"
      title={
        <>
          Run the model on <em className="serif">a new flight</em>.
        </>
      }
      caption="A generator creates realistic readings for an engine at any stage of wear, from the averages, spread and correlations of the 100 training engines. The model trained and saved by the notebook scores them, live in your browser."
    >
      <div className="flex flex-col gap-5 rounded-card border border-hair bg-white p-4 sm:flex-row sm:items-center sm:gap-7 sm:p-5">
        <div className="flex-1">
          <div className="flex items-baseline justify-between text-[12px]">
            <label htmlFor="sim-rul" className="text-dim">
              Engine wear: flights left before failure
            </label>
            <span className="mono text-[16px] text-ink">{rul}</span>
          </div>
          <input
            id="sim-rul"
            type="range"
            min={0}
            max={START}
            step={1}
            value={rul}
            disabled={flying}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRul(v);
              once(v);
            }}
            className="dial mt-2 block disabled:opacity-60"
            style={{ direction: "rtl" }}
          />
          <div className="mono mt-1 flex justify-between text-[9.5px] text-faint">
            <span>new · {START}</span>
            <span className="text-red/80">last {W} = about to fail</span>
            <span>0 · broke</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => once()}
            disabled={flying}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-hair bg-paper px-4 text-[12.5px] text-ink transition hover:border-ink disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
              <circle cx="5.7" cy="5.7" r="0.9" fill="currentColor" />
              <circle cx="10.3" cy="10.3" r="0.9" fill="currentColor" />
              <circle cx="8" cy="8" r="0.9" fill="currentColor" />
            </svg>
            Generate a flight
          </button>
          <button
            onClick={fly}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px] text-white transition",
              flying ? "bg-red" : "bg-ink hover:bg-ink-2",
            )}
          >
            {flying ? (
              <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                <rect x="3" y="3" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                <path d="M4 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L4.9 2.3a.6.6 0 0 0-.9.5z" />
              </svg>
            )}
            {flying ? "Stop" : "Fly an engine to failure"}
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,1fr)_250px]">
        <div>
          <div className="mb-2 grid grid-cols-[48px_minmax(0,1fr)_96px_minmax(0,0.9fr)] items-end gap-3 text-[11px] text-dim sm:gap-5">
            <span className="text-ink">Sensor</span>
            <span>reading vs. usual range (grey)</span>
            <span className="text-right">value</span>
            <span className="flex justify-between">
              <span>← healthy</span>
              <span>fail →</span>
            </span>
          </div>
          <div className="divide-y divide-hair/70 border-y border-hair">
            {order.map((i) => (
              <Reading key={FEATURES[i]} i={i} flight={flight} push={result.push[i]} max={maxPush} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-dim">
            Right bar: how much each reading pushes the score. Red pushes toward “about to fail”, blue toward “healthy”.
          </p>
        </div>

        <div className="flex flex-col gap-7">
          <div>
            <div className="text-[12px] text-dim">Model score</div>
            <div className={cn("mono mt-1 text-[48px] leading-none", alarm ? "text-red" : "text-ink")}>{result.score.toFixed(3)}</div>
            <div className="relative mt-4 h-[6px] rounded-full bg-track">
              <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150" style={{ width: `${result.score * 100}%`, background: alarm ? "var(--red)" : "var(--ink-2)" }} />
              <span className="absolute -top-1.5 h-[18px] w-px bg-ink" style={{ left: `${threshold * 100}%` }} />
            </div>
            <div className="mono mt-1.5 flex justify-between text-[9.5px] text-faint">
              <span>0</span>
              <span>alarm at {threshold.toFixed(3)}</span>
              <span>1</span>
            </div>
          </div>

          <div className="grid gap-2">
            <div
              className={cn(
                "flex items-center justify-between rounded-tile px-3.5 py-2.5 text-[13px]",
                alarm ? "bg-red text-white" : "bg-white text-ink shadow-[inset_0_0_0_1px_var(--hair)]",
              )}
            >
              <span className="font-[550]">{alarm ? "Alarm: about to fail" : "Healthy"}</span>
              <span className="text-[11px] opacity-75">model</span>
            </div>
            <div className="flex items-center justify-between rounded-tile px-3.5 py-2.5 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--hair)]">
              <span>
                {flight.rul} flights left: {truth ? <span className="text-red">about to fail</span> : "healthy"}
              </span>
              <span className="text-[11px] text-dim">truth</span>
            </div>
            <div className={cn("text-[12px]", right ? "text-dim" : "text-red")}>
              {right ? "✓ The model is right." : alarm ? "✗ False alarm: the engine still has time." : "✗ Missed: the engine is about to fail."}
            </div>
          </div>

        </div>
      </div>

      <div className="mt-12">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
          <span className="text-ink">Flight log</span>
          <span className="text-dim">
            {done && first !== null
              ? `Engine broke. First alarm ${first} flights before failure${steady !== null ? `, alarm on for good from ${steady}` : ""}.`
              : done
                ? "Engine broke without any alarm."
                : flying
                  ? `Flying… ${rul} flights left`
                  : "Each generated flight lands here."}
          </span>
        </div>
        <Log log={log} threshold={threshold} first={first} steady={steady} />
      </div>
      <p className="mt-4 text-[11px] text-faint">
        Model: models/fd001_logistic_regression.json, saved by the notebook (section 20.1). Generator: average wear curve of each sensor + correlated noise with the real spread; in a full run,
        each flight keeps {Math.round(data.generator.rho * 100)}% of the previous flight’s noise, as real engines do.
      </p>
    </Plate>
  );
}
