import { useState, useRef } from "react";
import SettingsMenu from "./SettingsMenu";

type ToolbarProps = {
    onOpenFile: () => void;
    onGoToLibrary?: () => void;
    onGoToFlashcards?: () => void;
};

function Toolbar({ onOpenFile, onGoToLibrary, onGoToFlashcards }: ToolbarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const gearRef = useRef<HTMLButtonElement>(null);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px" }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>CharLingo</h1>
            <button onClick={onOpenFile}>
                Open File
            </button>
            <button onClick={onGoToLibrary} style={{ fontSize: 13 }}>
              Library
            </button>
            <button onClick={onGoToFlashcards} style={{ fontSize: 13 }}>
              Flashcards
            </button>
            <div style={{ flex: 1 }} />
            <button
                ref={gearRef}
                onClick={() => setMenuOpen((o) => !o)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "var(--text)",
                    padding: "4px 8px",
                    borderRadius: 4,
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
