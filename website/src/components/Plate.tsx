import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PlateProps = {
  id?: string;
  n: string;
  kicker: string;
  title: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Plate({ id, n, kicker, title, caption, children, className }: PlateProps) {
  return (
    <section id={id} className={cn("scroll-mt-10 pt-24 sm:pt-32", className)}>
      <div className="flex items-center gap-3 text-[12px] text-dim">
        <span className="mono text-[11px] text-ink">{n}</span>
        <span>{kicker}</span>
        <span className="h-px flex-1 bg-hair" />
      </div>
      <h2 className="mt-5 max-w-[600px] text-[22px] leading-[1.25] font-[540] tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {caption && <p className="mt-3 max-w-[580px] text-[14.5px] leading-relaxed text-dim">{caption}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function Legend({ items }: { items: { label: ReactNode; swatch: ReactNode }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-dim">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {item.swatch}
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function Swatch({ color, hollow, round }: { color: string; hollow?: boolean; round?: boolean }) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0", round ? "rounded-full" : "rounded-mark")}
      style={hollow ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : { background: color }}
    />
  );
}
