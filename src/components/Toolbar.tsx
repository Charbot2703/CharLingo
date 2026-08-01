import { useState, useRef } from "react";
import SettingsMenu from "./SettingsMenu";

type ToolbarProps = {
    onOpenFile: () => void;
    onGoToLibrary?: () => void;
    onGoToFlashcards?: () => void;
    onExport?: () => void;
    onImport?: () => void;
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
  flexShrink: 0,
  whiteSpace: "nowrap",
};

function Toolbar({ onOpenFile, onGoToLibrary, onGoToFlashcards, onExport, onImport }: ToolbarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const gearRef = useRef<HTMLButtonElement>(null);

    return (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            flexShrink: 0,
          }}
        >
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt="CharLingo"
              style={{
                height: 32,
                marginRight: 8,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              <button onClick={onOpenFile} style={btnStyle}>
                Open File
              </button>
              <button onClick={onGoToLibrary} style={btnStyle}>
                Library
              </button>
              <button onClick={onGoToFlashcards} style={btnStyle}>
                Flashcards
              </button>
              {onExport && (
                <button onClick={onExport} style={btnStyle}>
                  Export
                </button>
              )}
              {onImport && (
                <button onClick={onImport} style={btnStyle}>
                  Import
                </button>
              )}
            </div>
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
                    flexShrink: 0,
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
