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
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)",
        }}
      />
      <div
        ref={cardRef}
        onClick={() => { if (flashcardMode === "reveal" && !revealed) setRevealed(true); }}
        style={{
          position: "relative",
          width: "max-content",
          minWidth: 280,
          maxWidth: 600,
          maxHeight: "80vh",
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          cursor: flashcardMode === "reveal" && !revealed ? "pointer" : "default",
        }}
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
            {flashcard.sourceTitle}
          </span>
          <span style={{ fontSize: 11, color: "#aaa" }}>
            {flashcard.correctCount}/{flashcard.attemptCount}
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
        <div style={{ padding: "10px 12px", lineHeight: 1.4 }}>
          {flashcard.original}
        </div>
        {(showTranslation || flashcardMode !== "reveal") && (
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid #eee",
              background: "#f9f9f9",
              lineHeight: 1.4,
            }}
          >
            {flashcard.translation}
          </div>
        )}
        {flashcardMode === "reveal" && !revealed && (
          <div
            style={{
              padding: "8px 12px",
              borderTop: "1px solid #eee",
              textAlign: "center",
              fontSize: 12,
              color: "#aaa",
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
