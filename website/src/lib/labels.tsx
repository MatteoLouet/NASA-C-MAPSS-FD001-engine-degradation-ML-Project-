import { fmt, pct } from "@/data";

type LabelProps = { x?: number | string; y?: number | string; width?: number | string; height?: number | string; index?: number };
type Rows = Record<string, unknown>[];

const n = (v: number | string | undefined) => Number(v ?? 0);

export function endLabel(rows: Rows, key: string, color: string, weight = 450) {
  return function EndLabel(props: LabelProps) {
    const value = rows[props.index ?? -1]?.[key];
    if (typeof value !== "number" || value <= 0) return <g />;
    return (
      <text
        x={n(props.x) + n(props.width) + 6}
        y={n(props.y) + (n(props.height) - 3) / 2}
        dy="0.35em"
        fontSize={11}
        fontWeight={weight}
        fill={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {fmt(value)}
      </text>
    );
  };
}

export function topLabel(rows: Rows, key: string, color: string) {
  return function TopLabel(props: LabelProps) {
    const value = rows[props.index ?? -1]?.[key];
    if (typeof value !== "number" || value <= 0) return <g />;
    return (
      <text
        x={n(props.x) + n(props.width) / 2}
        y={n(props.y) - 7}
        textAnchor="middle"
        fontSize={11}
        fill={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value < 0.01 ? "<1%" : value < 0.1 ? `${(value * 100).toFixed(1)}%` : pct(value)}
      </text>
    );
  };
}
