import { useEffect, useRef } from "react";
import { useSettings } from "../contexts/SettingsContext";

type SettingsMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
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
        top: anchorRect ? anchorRect.bottom + 4 : 0,
        right: anchorRect ? window.innerWidth - anchorRect.right : "auto",
        zIndex: 2000,
        background: "var(--bg, #fff)",
        border: "1px solid var(--border, #ddd)",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        padding: 16,
        minWidth: 220,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontSize: 14,
        color: "var(--text, #333)",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "var(--text, #888)" }}>
          Theme
        </div>
        {(["system", "light", "dark"] as const).map((t) => (
          <label
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="theme"
              checked={theme === t}
              onChange={() => setTheme(t)}
            />
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </label>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "var(--text, #888)" }}>
          Font Size: {fontSize}%
        </div>
        <input
          type="range"
          min={75}
          max={200}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: "var(--text, #888)" }}>
          Flashcard Mode
        </div>
        {([["both", "Show Both"], ["reveal", "Tap to Reveal"]] as const).map(([value, label]) => (
          <label
            key={value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="flashcardMode"
              checked={flashcardMode === value}
              onChange={() => setFlashcardMode(value)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default SettingsMenu;
