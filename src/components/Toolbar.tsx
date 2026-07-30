import { useState, useRef } from "react";
import SettingsMenu from "./SettingsMenu";

type ToolbarProps = {
    onOpenFile: () => void;
    onGoToLibrary?: () => void;
    onGoToFlashcards?: () => void;
};

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text)",
  cursor: "pointer",
  transition: "all 0.15s",
};

function Toolbar({ onOpenFile, onGoToLibrary, onGoToFlashcards }: ToolbarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const gearRef = useRef<HTMLButtonElement>(null);

    return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "var(--accent)",
                marginRight: 8,
                letterSpacing: "-0.3px",
              }}
            >
              CharLingo
            </span>
            <button onClick={onOpenFile} style={btnStyle}>
              Open File
            </button>
            <button onClick={onGoToLibrary} style={btnStyle}>
              Library
            </button>
            <button onClick={onGoToFlashcards} style={btnStyle}>
              Flashcards
            </button>
            <div style={{ flex: 1 }} />
            <button
                ref={gearRef}
                onClick={() => setMenuOpen((o) => !o)}
                style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "var(--text-secondary)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    transition: "color 0.15s",
                }}
            >
                ⚙
            </button>
            <SettingsMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                anchorEl={gearRef.current}
            />
        </div>
    );
}

export default Toolbar;
