import { useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";

type SettingsMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 10,
  fontSize: 11,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

function SettingsMenu({ open, onClose, anchorEl }: SettingsMenuProps) {
  const { theme, fontSize, flashcardMode, setTheme, setFontSize, setFlashcardMode } = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onViewerInteraction = () => onClose();
    setTimeout(() => {
      window.addEventListener("mousedown", onOutsideClick);
      window.addEventListener("viewer-interaction", onViewerInteraction);
    }, 0);
    return () => {
      window.removeEventListener("mousedown", onOutsideClick);
      window.removeEventListener("viewer-interaction", onViewerInteraction);
    };
  }, [open, onClose]);

  if (!open) return null;

  const anchorRect = anchorEl?.getBoundingClientRect();

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: anchorRect ? anchorRect.bottom + 6 : 0,
        right: anchorRect ? window.innerWidth - anchorRect.right : "auto",
        zIndex: 2000,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
        padding: 20,
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontSize: 13,
        color: "var(--text)",
      }}
    >
      <div>
        <div style={labelStyle}>Theme</div>
        {(["system", "light", "dark"] as const).map((t) => (
          <label
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="radio"
              name="theme"
              checked={theme === t}
              onChange={() => setTheme(t)}
              style={{ accentColor: "var(--accent)" }}
            />
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </label>
        ))}
      </div>
      <div>
        <div style={labelStyle}>Font Size: {fontSize}%</div>
        <input
          type="range"
          min={75}
          max={200}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />
      </div>
      <div>
        <div style={labelStyle}>Flashcard Mode</div>
        {([["both", "Show Both"], ["reveal", "Tap to Reveal"]] as const).map(([value, label]) => (
          <label
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="radio"
              name="flashcardMode"
              checked={flashcardMode === value}
              onChange={() => setFlashcardMode(value)}
              style={{ accentColor: "var(--accent)" }}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default SettingsMenu;
