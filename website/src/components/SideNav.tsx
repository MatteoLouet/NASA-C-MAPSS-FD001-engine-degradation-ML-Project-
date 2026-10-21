import { SECTIONS, useStore } from "@/state";
import { cn } from "@/lib/utils";

export const REPO = "https://github.com/Daniil-Hirchyts/NASA-C-MAPSS-FD001-engine-degradation-ML";

export function SideNav() {
  const { active } = useStore();

  return (
    <>
      <a
        href="#top"
        className="fixed top-6 left-6 z-30 hidden text-[12px] font-[550] text-ink lg:block"
      >
        Turbofan <span className="text-faint">·</span> <span className="font-[450] text-dim">FD001</span>
      </a>

      <nav
        aria-label="Sections"
        className="group/nav fixed top-1/2 left-6 z-30 hidden -translate-y-1/2 lg:block"
      >
        <ul className="grid gap-[9px]">
          {SECTIONS.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id}>
                <a href={`#${s.id}`} className="group flex h-4 items-center gap-3" aria-current={on ? "true" : undefined}>
                  <span
                    className={cn(
                      "h-px transition-all duration-300 ease-out",
                      on ? "w-7 bg-ink" : "w-3 bg-faint group-hover:w-5 group-hover:bg-ink-2",
                    )}
                  />
                  <span
                    className={cn(
                      "num text-[11px] whitespace-nowrap transition-all duration-300",
                      on ? "text-ink" : "text-faint group-hover:text-ink-2",
                      "xl:opacity-100",
                      on ? "opacity-100" : "opacity-0 group-hover/nav:opacity-100",
                    )}
                  >
                    <span className="mr-2 text-faint">{s.n}</span>
                    {s.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <a
        href={REPO}
        aria-label="Source on GitHub"
        className="fixed bottom-6 left-6 z-30 hidden text-faint transition-colors hover:text-ink lg:block"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </>
  );
}
