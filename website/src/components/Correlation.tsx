import { useState } from "react";
import { data } from "@/data";
import { Plate } from "./Plate";

const { ids, symbols, r } = data.corr;
const N = ids.length;
const CELL = 26;
const LEFT = 62;
const TOP = 62;
const SIZE = LEFT + N * CELL + 4;

function fill(v: number, diag: boolean) {
  if (diag) return "#3a3a3a";
  const a = Math.min(1, Math.abs(v) ** 1.3) * 0.92;
  return v >= 0 ? `rgba(229,72,77,${a.toFixed(3)})` : `rgba(42,120,214,${a.toFixed(3)})`;
}

export function Correlation() {
  const [hover, setHover] = useState<[number, number] | null>([0, 8]);
  const [i, j] = hover ?? [0, 8];
  const value = r[i][j];

  return (
    <Plate
      id="overlap"
      n="04"
      kicker="Correlation"
      title={
        <>
          Most sensors <em className="serif">say the same thing</em>.
        </>
      }
      caption="Correlation between the 14 kept sensors: red = they move together, blue = they move in opposite directions. Twelve form one big block, because they all measure the same wear. Nc and NRc only follow each other, so they bring something new."
    >
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[420px]" onMouseLeave={() => setHover(null)} role="img" aria-label="Correlation matrix of the 14 sensors">
          {symbols.map((s, k) => (
            <g key={s}>
              <text
                x={LEFT - 8}
                y={TOP + k * CELL + CELL / 2 + 3.5}
                textAnchor="end"
                fontSize="10"
                className="mono"
                fill={k === i || k === j ? "var(--ink)" : "#8a8a86"}
              >
                {s}
              </text>
              <text
                transform={`translate(${LEFT + k * CELL + CELL / 2 + 3.5},${TOP - 8}) rotate(-60)`}
                fontSize="10"
                className="mono"
                fill={k === i || k === j ? "var(--ink)" : "#8a8a86"}
              >
                {s}
              </text>
            </g>
          ))}
          {r.map((row, a) =>
            row.map((v, b) => (
              <rect
                key={`${a}-${b}`}
                x={LEFT + b * CELL + 1}
                y={TOP + a * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={3}
                fill={fill(v, a === b)}
                stroke={a === i && b === j ? "var(--ink)" : "none"}
                strokeWidth={1.5}
                onMouseEnter={() => setHover([a, b])}
              />
            )),
          )}
          <rect x={LEFT - 1} y={TOP - 1} width={12 * CELL + 2} height={12 * CELL + 2} rx={5} fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" />
          <rect x={LEFT + 12 * CELL - 1} y={TOP + 12 * CELL - 1} width={2 * CELL + 2} height={2 * CELL + 2} rx={5} fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="3 3" />
        </svg>

        <div className="grid gap-8">
          <div>
            <div className="mono text-[11px] text-dim">
              {symbols[i]} × {symbols[j]}
            </div>
            <div className="mono mt-1 text-[40px] leading-none" style={{ color: i === j ? "var(--ink)" : value >= 0 ? "var(--red)" : "var(--blue)" }}>
              {value >= 0 ? "+" : "−"}
              {Math.abs(value).toFixed(2)}
            </div>
            <div className="mt-2 text-[12px] text-dim">
              {i === j
                ? "a sensor with itself"
                : Math.abs(value) > 0.6
                  ? value > 0
                    ? "strongly linked: they rise and fall together"
                    : "strongly linked: when one rises, the other falls"
                  : Math.abs(value) > 0.3
                    ? "weakly linked"
                    : "almost unrelated"}
            </div>
          </div>
          <div className="grid gap-3 text-[12px] text-dim">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-5 shrink-0 rounded-mark border border-dashed border-ink" />
              <span>
                <span className="text-ink">The big block</span>: 12 sensors, all linked. Keeping all of them adds little new information.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-mark border border-dashed border-ink" />
              <span>
                <span className="text-ink">The pair</span> Nc and NRc (r = +0.96): linked to each other, barely to the rest.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-dim">
            <span className="mono">−1</span>
            <span className="h-2 w-40 rounded-full" style={{ background: "linear-gradient(90deg, rgba(42,120,214,0.92), #f3f3f1, rgba(229,72,77,0.92))" }} />
            <span className="mono">+1</span>
          </div>
        </div>
      </div>
    </Plate>
  );
}
