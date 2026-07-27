import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "system" | "light" | "dark";
type FlashcardMode = "reveal" | "both";

type Settings = {
  theme: Theme;
  fontSize: number;
  flashcardMode: FlashcardMode;
};

type SettingsContextValue = Settings & {
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setFlashcardMode: (mode: FlashcardMode) => void;
};

const STORAGE_KEY = "charlingo-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch {}
  return { theme: "system", fontSize: 100, flashcardMode: "both" };
}

function saveSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function applyTheme(theme: Theme) {
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    applyTheme(settings.theme);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings.theme]);

  const setTheme = (theme: Theme) => setSettings((s) => ({ ...s, theme }));
  const setFontSize = (fontSize: number) => setSettings((s) => ({ ...s, fontSize }));
  const setFlashcardMode = (flashcardMode: FlashcardMode) => setSettings((s) => ({ ...s, flashcardMode }));

  return (
    <SettingsContext.Provider value={{ ...settings, setTheme, setFontSize, setFlashcardMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
