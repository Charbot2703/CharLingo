import { useEffect, useRef } from "react";

type TranslationPopupProps = {
  original: string;
  translation: string | null;
  translating: boolean;
  viewerWidth?: number;
  fontSize: number;
  onClose: () => void;
  onOutsideClick?: () => void;
  onSaveFlashcard?: (original: string, translation: string) => void;
};

function TranslationPopup({
  original,
  translation,
  translating,
  viewerWidth,
  fontSize,
  onClose,
  onOutsideClick,
  onSaveFlashcard,
}: TranslationPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!original) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onOutsideClick?.();
      }
    };
    setTimeout(() => window.addEventListener("mousedown", handler), 0);
    return () => window.removeEventListener("mousedown", handler);
  }, [original, onOutsideClick]);

  if (!original) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        width: "max-content",
        minWidth: 260,
        maxWidth: viewerWidth ?? 600,
        maxHeight: "80vh",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontSize: fontSize + "%",
      }}
      ref={cardRef}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Original
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "var(--text-secondary)",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          padding: "12px 14px",
          lineHeight: 1.5,
          color: "var(--text-h)",
        }}
      >
        {original}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          lineHeight: 1.5,
          fontSize: "0.9em",
          color: "var(--text)",
        }}
      >
        {translating ? (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9em" }}>Translating…</span>
        ) : translation ? (
          translation
        ) : (
          <span style={{ color: "var(--border)" }}>Translation</span>
        )}
      </div>
      {onSaveFlashcard && translation && (
        <div style={{ padding: "8px 12px 12px" }}>
          <button
            onClick={() => onSaveFlashcard(original, translation)}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            + Save as Flashcard
          </button>
        </div>
      )}
    </div>
  );
}

export default TranslationPopup;
