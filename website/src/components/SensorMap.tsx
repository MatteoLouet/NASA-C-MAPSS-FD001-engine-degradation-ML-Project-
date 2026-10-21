import { useState } from "react";
import { data, type Sensor } from "@/data";
import { useStore } from "@/state";
import { cn } from "@/lib/utils";
import { Legend, Plate, Swatch } from "./Plate";

type P = [number, number];

const W = 880;
const CY = 248;
const H = 462;
const up = (r: number) => CY - r;
const down = (r: number) => CY + r;

function curve(points: P[], move = true) {
  let d = move ? `M${points[0][0]},${points[0][1].toFixed(1)}` : `L${points[0][0]},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1].toFixed(1)}`;
  }
  return d;
}

const lines = (points: P[], move = true) =>
  points.map(([x, y], i) => `${i === 0 && move ? "M" : "L"}${x},${y.toFixed(1)}`).join(" ");

function at(line: P[], x: number) {
  for (let i = 1; i < line.length; i++) {
    const [x0, r0] = line[i - 1];
    const [x1, r1] = line[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return line[line.length - 1][1];
}

const map = (line: P[], f: (r: number) => number): P[] => line.map(([x, r]) => [x, f(r)]);

const NAC_OUT: P[] = [[38, 184], [56, 195], [104, 202], [180, 204], [270, 199], [360, 188], [432, 174], [482, 158]];
const NAC_IN: P[] = [[50, 176], [72, 170.5], [104, 169.5], [146, 174], [205, 177], [262, 174], [340, 166], [420, 157], [470, 150]];
const COWL: P[] = [[206, 100], [228, 109], [266, 116.5], [320, 120], [452, 120], [540, 116], [612, 108], [662, 98], [702, 87]];
const GP_OUT: P[] = [[210, 96], [268, 92], [286, 87], [306, 79], [446, 59], [454, 63], [464, 76], [476, 82], [512, 82], [520, 74], [526, 64], [560, 66], [576, 70], [662, 92], [702, 86]];
const GP_HUB: P[] = [[210, 58], [268, 62], [286, 57], [306, 47], [446, 50], [456, 45], [466, 39], [512, 39], [520, 44], [526, 48], [560, 48], [576, 47], [662, 44]];
const PLUG: P[] = [[662, 44], [700, 36], [740, 24], [775, 11], [802, 0]];

const STAGES = {
  booster: [218, 236, 254],
  hpc: [314, 329, 344, 359, 374, 389, 404, 419, 434],
  hpt: [530, 548],
  lpt: [586, 602, 618, 634, 650],
};

const MODULES: { label: string; x: number; r: number; fault?: boolean }[] = [
  { label: "Fan", x: 176, r: 120 },
  { label: "Booster", x: 236, r: 77 },
  { label: "Bypass", x: 322, r: 146 },
  { label: "HPC", x: 374, r: 63, fault: true },
  { label: "Burner", x: 492, r: 62 },
  { label: "HPT", x: 541, r: 57 },
  { label: "LPT", x: 618, r: 62 },
  { label: "Exhaust", x: 750, r: 21 },
];

const PLACE: Record<string, [number, number, string]> = {
  s1: [112, 130, "Fan"], s5: [112, 98, "Fan"], s18: [104, 13, "Fan"], s19: [128, 24, "Fan"],
  s8: [204, 9.5, "Fan"], s13: [234, 9.5, "Fan"],
  s6: [300, 148, "Bypass"], s15: [392, 144, "Bypass"],
  s2: [283, 74, "Booster"],
  s17: [400, 98, "HPC"], s3: [436, 55, "HPC"], s11: [453, 73, "HPC"], s7: [452, 37, "HPC"],
  s9: [360, 25, "HPC"], s14: [404, 25, "HPC"],
  s12: [464, 104, "Burner"], s16: [494, 61, "Burner"],
  s20: [540, 98, "HPT"], s21: [594, 97, "LPT"], s4: [668, 66, "LPT"],
  s10: [734, 54, "Exhaust"],
};

const colorOf = (s: Sensor) => (!s.kept ? "var(--faint)" : s.rises ? "var(--red)" : "var(--blue)");
const radiusOf = (s: Sensor) => (s.kept ? 2.8 + 5.6 * Math.abs(s.r ?? 0) : 3);

function Blade({ x, w, rotor, skew = 1.6 }: { x: number; w: number; rotor: boolean; skew?: number }) {
  const t = up(at(GP_OUT, x + w / 2) - 0.9);
  const b = up(at(GP_HUB, x + w / 2) + 0.9);
  const s = rotor ? skew : -skew * 0.7;
  return (
    <path
      d={`M${x},${b} L${x + s},${t} Q${x + s + w / 2},${t - 0.8} ${x + s + w},${t} L${x + w},${b} Q${x + w / 2},${b + 0.8} ${x},${b} Z`}
      fill={rotor ? "var(--ink-2)" : "var(--sheet)"}
      stroke={rotor ? "none" : "#bdbdba"}
      strokeWidth={0.7}
      opacity={rotor ? 0.86 : 1}
    />
  );
}

function Disk({ x, to }: { x: number; to: number }) {
  const hub = at(GP_HUB, x + 2);
  return (
    <path
      d={`M${x + 0.6},${up(hub)} L${x + 1.3},${up(to)} M${x + 3.4},${up(hub)} L${x + 2.7},${up(to)}`}
      stroke="#d6d6d2"
      strokeWidth={0.8}
    />
  );
}

function Spark({ sensor }: { sensor: Sensor }) {
  const values = (sensor.spark ?? []).filter((v): v is number => v !== null);
  if (!values.length) {
    return (
      <svg viewBox="0 0 132 36" className="h-9 w-[132px]">
        <line x1="2" x2="130" y1="18" y2="18" stroke="var(--faint)" strokeDasharray="2 3" />
      </svg>
    );
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => 2 + (i * 128) / (values.length - 1);
  const y = (v: number) => 32 - ((v - lo) / (hi - lo || 1)) * 28;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const warn = x(values.length - 1 - 6);
  return (
    <svg viewBox="0 0 132 36" className="h-9 w-[132px]" aria-hidden>
      <rect x={warn} y="0" width={130 - warn} height="36" fill="var(--red-wash)" />
      <path d={d} fill="none" stroke={colorOf(sensor)} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.2" fill={colorOf(sensor)} />
    </svg>
  );
}

const nacUpper = [
  curve(map(NAC_IN, up)),
  `L482,${up(158)}`,
  curve(map([...NAC_OUT].reverse(), up), false).replace(/^L[^ ]+ /, ""),
  `C31,${up(181)} 37,${up(174)} 50,${up(176)} Z`,
].join(" ");

const nacLower = [
  `M34,${CY}`,
  `C31,${down(70)} 32,${down(160)} 38,${down(184)}`,
  curve(map(NAC_OUT, down), false).replace(/^L[^ ]+ /, ""),
  `L482,${CY} Z`,
].join(" ");

const cowlLower = [`M452,${CY}`, curve(map(COWL.filter(([x]) => x >= 452), down), false), `L702,${CY} Z`].join(" ");
const plugLower = `M702,${CY} L702,${down(34)} C740,${down(24)} 776,${down(11)} 802,${CY} Z`;
const casing = [curve(map(COWL, up)), lines(map([...GP_OUT].reverse(), up), false), "Z"].join(" ");
const gas = [lines(map(GP_OUT, up)), lines(map([...GP_HUB].reverse(), up), false), "Z"].join(" ");
const plug = curve(map(PLUG, up));

function EngineArt({ module }: { module: string }) {
  return (
    <g>
      <defs>
        <pattern id="cut" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="var(--sheet)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="#d3d3cf" strokeWidth="0.7" />
        </pattern>
        <pattern id="fault" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="4" height="4" fill="rgba(229,72,77,0.06)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--red)" strokeWidth="0.7" opacity="0.4" />
        </pattern>
        <linearGradient id="skin" x1="0" y1={CY} x2="0" y2={down(204)} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4f4f2" />
          <stop offset="0.16" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f3f3f1" />
          <stop offset="0.82" stopColor="#e2e2de" />
          <stop offset="1" stopColor="#cfcfca" />
        </linearGradient>
        <linearGradient id="lip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9d9d4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="core-skin" x1="0" y1={CY} x2="0" y2={down(120)} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e6e6e3" />
          <stop offset="0.2" stopColor="#f7f7f5" />
          <stop offset="0.6" stopColor="#e9e9e5" />
          <stop offset="1" stopColor="#c9c9c4" />
        </linearGradient>
        <marker id="flow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8" fill="none" stroke="var(--faint)" strokeWidth="1.2" />
        </marker>
      </defs>

      <path d={cowlLower} fill="url(#core-skin)" stroke="var(--ink)" strokeWidth="0.9" />
      <path d={plugLower} fill="url(#core-skin)" stroke="var(--ink)" strokeWidth="0.9" />
      {[560, 640].map((x) => (
        <line key={x} x1={x} x2={x} y1={CY} y2={down(at(COWL, x)) - 0.6} stroke="#cfcfcb" strokeWidth="0.8" />
      ))}
      <path d={nacLower} fill="url(#skin)" stroke="var(--ink)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d={`M34,${CY} C31,${down(70)} 32,${down(160)} 38,${down(184)} L62,${down(196)} L62,${CY} Z`} fill="url(#lip)" opacity="0.8" />
      {[[112, 0.9], [286, 0.9], [292, 0.6], [424, 0.9]].map(([x, o]) => (
        <line key={x} x1={x} x2={x} y1={CY} y2={down(at(NAC_OUT, x)) - 0.6} stroke="#cdcdc8" strokeWidth="0.8" opacity={o} />
      ))}

      <line x1="24" x2={W - 30} y1={CY} y2={CY} stroke="var(--faint)" strokeWidth="0.7" strokeDasharray="14 4 2 4" />

      <path d={gas} fill="#f2f2f0" />
      <polygon points={`306,${up(79)} 446,${up(59)} 446,${up(50)} 306,${up(47)}`} fill="url(#fault)" />
      <path d={casing} fill="var(--sheet)" stroke="var(--ink)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d={lines(map(GP_HUB, up))} fill="none" stroke="var(--ink)" strokeWidth="0.9" strokeLinejoin="round" />

      <rect x="170" y={up(13)} width="498" height="7" fill="#eeeeeb" stroke="#c6c6c2" strokeWidth="0.6" />
      <rect x="306" y={up(28)} width="252" height="6" fill="#eeeeeb" stroke="#c6c6c2" strokeWidth="0.6" />
      {[[198, 16], [302, 16], [560, 31], [664, 16]].map(([x, r]) => (
        <circle key={x} cx={x} cy={up(r)} r="2.6" fill="var(--sheet)" stroke="#b9b9b6" strokeWidth="0.7" />
      ))}

      {[...STAGES.booster, ...STAGES.lpt].map((x) => (
        <Disk key={`l${x}`} x={x} to={13} />
      ))}
      {[...STAGES.hpc, ...STAGES.hpt].map((x) => (
        <Disk key={`h${x}`} x={x} to={28} />
      ))}

      {STAGES.booster.map((x) => (
        <g key={x}>
          <Blade x={x} w={4.6} rotor />
          <Blade x={x + 8} w={3.2} rotor={false} />
        </g>
      ))}
      {STAGES.hpc.map((x) => (
        <g key={x}>
          <Blade x={x} w={4} rotor skew={1.2} />
          <Blade x={x + 7} w={2.8} rotor={false} skew={1.2} />
        </g>
      ))}
      {[...STAGES.hpt, ...STAGES.lpt].map((x) => (
        <g key={x}>
          <Blade x={x - 7} w={3.4} rotor={false} />
          <Blade x={x} w={5} rotor />
        </g>
      ))}

      <path
        d={`M470,${up(52)} Q470,${up(75)} 490,${up(76)} L514,${up(71)} L514,${up(48)} L490,${up(44)} Q470,${up(44)} 470,${up(52)} Z`}
        fill="var(--sheet)"
        stroke="var(--ink)"
        strokeWidth="0.8"
      />
      <path d={`M480,${up(55)} L510,${up(53)} M480,${up(66)} L510,${up(65)}`} stroke="#e2e2df" strokeWidth="0.8" />
      <path d={`M464,${up(119)} L464,${up(62)}`} stroke="var(--ink-2)" strokeWidth="1" />
      <circle cx="466" cy={up(60)} r="2.4" fill="var(--ink)" />
      {[[400, 66, 120], [540, 67, 116], [594, 74, 110]].map(([x, a, b]) => (
        <line key={x} x1={x} x2={x} y1={up(a)} y2={up(b)} stroke="var(--ink-2)" strokeWidth="0.9" strokeDasharray="2 2" />
      ))}

      <path d={`${plug} L662,${CY} Z`} fill="#efefec" />
      <path d={plug} fill="none" stroke="var(--ink)" strokeWidth="0.9" />

      <path
        d={`M246,${up(115.5)} L254,${up(115.5)} L264,${up(174.5)} L256,${up(174.5)} Z`}
        fill="var(--sheet)"
        stroke="#b9b9b6"
        strokeWidth="0.7"
      />

      <path d={nacUpper} fill="url(#cut)" stroke="var(--ink)" strokeWidth="0.9" strokeLinejoin="round" />

      <path d={`M70,${CY} C84,${up(28)} 118,${up(44)} 152,${up(47)} L152,${CY} Z`} fill="var(--sheet)" stroke="var(--ink)" strokeWidth="0.9" />
      <path
        d={`M150,${up(47)} C170,${up(48)} 190,${up(50)} 210,${up(58)} L210,${up(13)} L150,${up(13)} Z`}
        fill="var(--sheet)"
      />
      <path d={`M150,${up(47)} C170,${up(48)} 190,${up(50)} 210,${up(58)}`} fill="none" stroke="var(--ink)" strokeWidth="0.9" />
      <path d={`M168,${up(47.5)} L170,${up(13)} M180,${up(48.5)} L178,${up(13)}`} stroke="#d6d6d2" strokeWidth="0.8" />
      <path
        d={`M150,${up(46)} C144,${up(84)} 141,${up(128)} 150,${up(175)} C164,${up(177)} 184,${up(177.5)} 202,${up(176)} C200,${up(128)} 194,${up(86)} 184,${up(46)} C172,${up(44.5)} 160,${up(44.5)} 150,${up(46)} Z`}
        fill="var(--sheet)"
        stroke="var(--ink)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d={`M160,${up(47)} C155,${up(90)} 154,${up(132)} 162,${up(176)} M174,${up(47)} C171,${up(90)} 172,${up(132)} 180,${up(177)} M150,${up(120)} C166,${up(118)} 184,${up(119)} 198,${up(122)}`}
        fill="none"
        stroke="#e2e2de"
        strokeWidth="0.8"
      />

      <path d={`M6,${up(120)} H32`} stroke="var(--faint)" strokeWidth="0.9" markerEnd="url(#flow)" />
      <path d={`M490,${up(136)} H528`} stroke="var(--faint)" strokeWidth="0.9" markerEnd="url(#flow)" />
      <path d={`M772,${up(66)} H814`} stroke="var(--faint)" strokeWidth="0.9" markerEnd="url(#flow)" />

      {MODULES.map((m) => {
        const lit = m.label === module;
        return (
          <g key={m.label}>
            <line
              x1={m.x}
              x2={m.x}
              y1={30}
              y2={up(m.r)}
              stroke={m.fault ? "var(--red)" : lit ? "var(--ink-2)" : "#c6c6c2"}
              strokeWidth="0.7"
              strokeDasharray="1 2.5"
            />
            <circle cx={m.x} cy={up(m.r)} r="1.6" fill={m.fault ? "var(--red)" : "var(--ink-2)"} />
            <text
              x={m.x}
              y={20}
              textAnchor="middle"
              fontSize="12"
              fontWeight={lit ? 600 : 450}
              fill={m.fault ? "var(--red)" : lit ? "var(--ink)" : "var(--muted)"}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function SensorMap() {
  const { sensor: selected, setSensor } = useStore();
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? selected;
  const sensor = data.sensors.find((s) => s.id === active)!;
  const module = PLACE[active][2];
  const ordered = [...data.sensors].sort((a, b) => radiusOf(b) - radiusOf(a));

  const pick = (s: Sensor) => {
    if (s.kept) {
      setSensor(s.id);
      setHover(null);
    } else setHover(s.id);
  };

  return (
    <Plate
      id="engine"
      n="01"
      kicker="Sensors"
      title={
        <>
          21 sensors, <em className="serif">14 worth keeping</em>.
        </>
      }
      caption="7 sensors show the same value on every flight, so they are dropped (hollow). Red sensors rise as the engine wears, blue ones fall. A bigger dot means a stronger link with wear."
    >
      <p className="mb-2 text-[11px] text-faint sm:hidden">Swipe across the engine →</p>
      <figure className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[680px] sm:min-w-0"
          role="img"
          aria-label="Turbofan profile, upper half cut away, with the 21 sensor positions"
        >
          <EngineArt module={module} />
          {ordered.map((s) => {
            const [cx, r] = PLACE[s.id];
            const cy = up(r);
            const size = radiusOf(s);
            const on = s.id === active;
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`${s.id} ${s.symbol}: ${s.name}`}
                onMouseEnter={() => pick(s)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => pick(s)}
                onClick={() => pick(s)}
                className="cursor-pointer outline-none"
              >
                <circle cx={cx} cy={cy} r={Math.max(size + 5, 10)} fill="transparent" />
                {on && <circle cx={cx} cy={cy} r={size + 4} fill="none" stroke="var(--ink)" strokeWidth="0.9" />}
                {s.kept ? (
                  <circle cx={cx} cy={cy} r={size} fill={colorOf(s)} stroke="var(--paper)" strokeWidth="1.8" />
                ) : (
                  <circle cx={cx} cy={cy} r={size} fill="var(--paper)" stroke="#a6a6a3" strokeWidth="1.1" />
                )}
                {on && (
                  <text
                    x={cx + size + 8}
                    y={cy + 4}
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--ink)"
                    stroke="var(--paper)"
                    strokeWidth="3"
                    style={{ paintOrder: "stroke" }}
                  >
                    {s.symbol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </figure>

      <div className="mt-6 flex flex-col gap-6 border-t border-hair pt-6 sm:flex-row sm:items-start sm:justify-between">
        <Legend
          items={[
            { swatch: <Swatch color="var(--red)" round />, label: "rises before failure" },
            { swatch: <Swatch color="var(--blue)" round />, label: "falls before failure" },
            { swatch: <Swatch color="var(--faint)" round hollow />, label: "constant, dropped" },
          ]}
        />
        <div className="flex min-w-[280px] items-center gap-4" aria-live="polite">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="num font-[550] text-ink">{sensor.id}</span>
              <span className="text-dim">{sensor.symbol}</span>
            </div>
            <div className="truncate text-[12px] text-dim">{sensor.name}</div>
            <div className={cn("num mt-1 text-[12px]", sensor.kept ? "text-ink" : "text-faint")}>
              {sensor.kept
                ? `link with wear: r = ${sensor.r!.toFixed(2)}`
                : `same value on ${Math.round(sensor.modalShare * 100)}% of flights: dropped`}
            </div>
          </div>
          <Spark sensor={sensor} />
        </div>
      </div>
    </Plate>
  );
}
