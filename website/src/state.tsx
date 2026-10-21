import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { data } from "@/data";

export type DockMode = "none" | "sensor" | "threshold";

export const SECTIONS: { id: string; n: string; label: string; dock: DockMode }[] = [
  { id: "top", n: "00", label: "Turbofan", dock: "none" },
  { id: "engine", n: "01", label: "Sensors", dock: "sensor" },
  { id: "label", n: "02", label: "Target", dock: "none" },
  { id: "signal", n: "03", label: "Drift", dock: "sensor" },
  { id: "overlap", n: "04", label: "Correlation", dock: "none" },
  { id: "models", n: "05", label: "Models", dock: "none" },
  { id: "weights", n: "06", label: "Key sensors", dock: "none" },
  { id: "decision", n: "07", label: "Threshold", dock: "threshold" },
  { id: "test", n: "08", label: "Test", dock: "threshold" },
  { id: "errors", n: "09", label: "Errors", dock: "threshold" },
  { id: "aging", n: "10", label: "Over time", dock: "threshold" },
  { id: "simulate", n: "11", label: "Try it", dock: "threshold" },
  { id: "conclusion", n: "12", label: "Conclusion", dock: "none" },
];

export const KEPT = data.sensors.filter((s) => s.kept).sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!));

type Store = {
  threshold: number;
  setThreshold: (v: number) => void;
  sensor: string;
  setSensor: (id: string) => void;
  active: string;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [threshold, setThreshold] = useState(data.threshold.chosen);
  const [sensor, setSensor] = useState("s11");
  const [active, setActive] = useState("top");

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id));
    const update = () => {
      const line = window.innerHeight * 0.55;
      let current = SECTIONS[0].id;
      nodes.forEach((node, i) => {
        if (node && node.getBoundingClientRect().top <= line) current = SECTIONS[i].id;
      });
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const value = useMemo(() => ({ threshold, setThreshold, sensor, setSensor, active }), [threshold, sensor, active]);
  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore() {
  const store = use(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
