import { useCallback, useEffect, useState } from "react";

export type SectionKey =
  | "waveform"
  | "plotter"
  | "bands"
  | "spectrum"
  | "ai"
  | "artifacts"
  | "experiment"
  | "status";

export type DashboardPrefs = {
  serialPort: string;
  autoConnect: boolean;
  hardwareMode: boolean;
  waveMode: "raw" | "filtered";
  chartHeight: number;
  demoMode: string;
  sidebarOpen: boolean;
  sections: Record<SectionKey, boolean>;
};

const STORAGE_KEY = "neuro-dashboard-prefs";

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  waveform: true,
  plotter: true,
  bands: true,
  spectrum: true,
  ai: true,
  artifacts: true,
  experiment: true,
  status: true,
};

const DEFAULT: DashboardPrefs = {
  serialPort: import.meta.env.VITE_SERIAL_PORT || "COM5",
  autoConnect: true,
  hardwareMode: true,
  waveMode: "filtered",
  chartHeight: 300,
  demoMode: "alpha",
  sidebarOpen: true,
  sections: { ...DEFAULT_SECTIONS },
};

function loadPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT, sections: { ...DEFAULT_SECTIONS } };
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    return {
      ...DEFAULT,
      ...parsed,
      sections: { ...DEFAULT_SECTIONS, ...parsed.sections },
    };
  } catch {
    return { ...DEFAULT, sections: { ...DEFAULT_SECTIONS } };
  }
}

export function useDashboardPrefs() {
  const [prefs, setPrefsState] = useState<DashboardPrefs>(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<DashboardPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleSection = useCallback((key: SectionKey) => {
    setPrefsState((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: !prev.sections[key] },
    }));
  }, []);

  const resetSections = useCallback(() => {
    setPrefsState((prev) => ({ ...prev, sections: { ...DEFAULT_SECTIONS } }));
  }, []);

  return { prefs, setPrefs, toggleSection, resetSections };
}
