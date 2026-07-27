import { useEffect, useRef } from "react";

type TranslationPopupProps = {
  original: string;
  translation: string | null;
  translating: boolean;
  viewerWidth?: number;
  fontSize: number;
  onClose: () => void;
  onSaveFlashcard?: (original: string, translation: string) => void;
};

function TranslationPopup({
  original,
  translation,
  translating,
  viewerWidth,
  fontSize,
  onClose,
  onSaveFlashcard,
}: TranslationPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!original) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => window.addEventListener("mousedown", handler), 0);
    return () => window.removeEventListener("mousedown", handler);
  }, [original, onClose]);

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
        minWidth: 200,
        maxWidth: viewerWidth ?? 600,
        maxHeight: "80vh",
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        fontSize: fontSize + "%",
      }}
      ref={cardRef}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #eee",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12, color: "#888" }}>
          Original
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            color: "#888",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          padding: "10px 12px",
          lineHeight: 1.4,
        }}
      >
        {original}
      </div>
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #eee",
          background: "#f9f9f9",
          minHeight: 32,
          display: "flex",
          alignItems: "center",
          lineHeight: 1.4,
        }}
      >
        {translating ? (
          <span style={{ color: "#999" }}>Translating…</span>
        ) : translation ? (
          translation
        ) : (
          <span style={{ color: "#ccc" }}>Translation</span>
        )}
      </div>
      {onSaveFlashcard && translation && (
        <button
          onClick={() => onSaveFlashcard(original, translation)}
          style={{
            margin: "8px 12px",
            padding: "6px 14px",
            background: "#34d399",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Save as Flashcard
        </button>
      )}
    </div>
  );
}

export default TranslationPopup;
