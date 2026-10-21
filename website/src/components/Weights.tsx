import { useState } from "react";
import { data, fmt } from "@/data";
import { Plate } from "./Plate";

const W = 880;
const ROW = 27;
const TOP = 46;
const LEFT = 300;
const RIGHT = 580;

const rows = data.importance.map((e) => ({ ...e, alone: Math.abs(e.r) }));
const byAlone = [...rows].sort((a, b) => b.alone - a.alone).map((e) => e.id);
const byModel = [...rows].sort((a, b) => b.drop - a.drop).map((e) => e.id);
const maxAlone = Math.max(...rows.map((e) => e.alone));
const maxDrop = Math.max(...rows.map((e) => e.drop));
const H = TOP + rows.length * ROW + 8;
const STAR = new Set(["s9", "s14"]);

export function Weights() {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <Plate
      id="weights"
      n="06"
      kicker="Inside the model"
      title={
        <>
          Weak alone, <em className="serif">key together</em>.
        </>
      }
      caption="Left: how well each sensor alone follows wear. Right: how much the model loses when that sensor is scrambled. Nc and NRc rank last alone but first in the model: they carry information the other 12 don't."
    >
      <p className="mb-2 text-[11px] text-faint sm:hidden">Swipe across →</p>
      <figure className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] sm:min-w-0" onMouseLeave={() => setHover(null)}>
          <text x={LEFT} y={16} textAnchor="end" fontSize="11" fill="var(--muted)">
            alone: link with wear (|r|)
          </text>
          <text x={RIGHT} y={16} fontSize="11" fill="var(--muted)">
            in the model: score lost if scrambled
          </text>
          <line x1={LEFT} x2={LEFT} y1={TOP - 14} y2={H - 6} stroke="var(--hair)" />
          <line x1={RIGHT} x2={RIGHT} y1={TOP - 14} y2={H - 6} stroke="var(--hair)" />

          {rows.map((e) => {
            const yl = TOP + byAlone.indexOf(e.id) * ROW;
            const yr = TOP + byModel.indexOf(e.id) * ROW;
            const star = STAR.has(e.id);
            const on = hover === e.id;
            const dim = hover !== null && !on;
            const color = on ? "var(--ink)" : star ? "var(--red)" : "#c9c9c6";
            const barL = (e.alone / maxAlone) * 150;
            const barR = (e.drop / maxDrop) * 170;
            return (
              <g
                key={e.id}
                onMouseEnter={() => setHover(e.id)}
                opacity={dim ? 0.28 : 1}
                className="cursor-default transition-opacity duration-200"
              >
                <path
                  d={`M${LEFT + 6},${yl} C${(LEFT + RIGHT) / 2},${yl} ${(LEFT + RIGHT) / 2},${yr} ${RIGHT - 6},${yr}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={star || on ? 1.6 : 1}
                />
                <rect x={LEFT - 6 - barL} y={yl - 4} width={barL} height={8} rx={3} fill={star ? "var(--red)" : "#d4d4d4"} opacity={star ? 0.35 : 1} />
                <circle cx={LEFT} cy={yl} r={3.2} fill={color} />
                <text x={LEFT - 14 - barL} y={yl + 4} textAnchor="end" fontSize="12" fill={star || on ? "var(--ink)" : "var(--ink-2)"} fontWeight={star ? 600 : 450}>
                  {e.symbol}
                  <tspan fill="var(--faint)" fontWeight={400} dx="6">
                    {fmt(e.alone, 2)}
                  </tspan>
                </text>

                <rect x={RIGHT + 6} y={yr - 4} width={barR} height={8} rx={3} fill={star ? "var(--red)" : "#404040"} opacity={star ? 1 : 0.75} />
                <circle cx={RIGHT} cy={yr} r={3.2} fill={color} />
                <text x={RIGHT + 14 + barR} y={yr + 4} fontSize="12" fill={star || on ? "var(--ink)" : "var(--ink-2)"} fontWeight={star ? 600 : 450}>
                  {e.symbol}
                  <tspan fill="var(--faint)" fontWeight={400} dx="6">
                    −{fmt(e.drop, 3)}
                  </tspan>
                </text>
                <rect x={0} y={Math.min(yl, yr) - ROW / 2} width={W} height={0} fill="transparent" />
              </g>
            );
          })}
        </svg>
      </figure>
    </Plate>
  );
}
