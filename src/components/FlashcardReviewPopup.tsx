import { useEffect, useRef, useState } from "react";
import type { Flashcard } from "../hooks/useFlashcards";

type FlashcardReviewPopupProps = {
  flashcard: Flashcard | null;
  flashcardMode: "reveal" | "both";
  onClose: () => void;
};

function FlashcardReviewPopup({ flashcard, flashcardMode, onClose }: FlashcardReviewPopupProps) {
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flashcard) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => window.addEventListener("mousedown", handler), 0);
    return () => window.removeEventListener("mousedown", handler);
  }, [flashcard, onClose]);

  useEffect(() => {
    setRevealed(false);
  }, [flashcard]);

  if (!flashcard) return null;

  const showTranslation = flashcardMode === "both" || revealed;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "var(--overlay)",
        }}
      />
      <div
        ref={cardRef}
        onClick={() => { if (flashcardMode === "reveal" && !revealed) setRevealed(true); }}
        style={{
          position: "relative",
          width: "max-content",
          minWidth: 300,
          maxWidth: 600,
          maxHeight: "80vh",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          cursor: flashcardMode === "reveal" && !revealed ? "pointer" : "default",
        }}
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
          <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-secondary)" }}>
            {flashcard.sourceTitle}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {flashcard.correctCount}/{flashcard.attemptCount}
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
        <div style={{ padding: "14px 14px", lineHeight: 1.5, color: "var(--text-h)" }}>
          {flashcard.original}
        </div>
        {(showTranslation || flashcardMode !== "reveal") && (
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              lineHeight: 1.5,
              color: "var(--text)",
            }}
          >
            {flashcard.translation}
          </div>
        )}
        {flashcardMode === "reveal" && !revealed && (
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid var(--border)",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            Tap to reveal translation
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardReviewPopup;
