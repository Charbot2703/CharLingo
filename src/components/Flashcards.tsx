import { useState, useMemo } from "react";
import type { Flashcard } from "../hooks/useFlashcards";
import FlashcardReviewPopup from "./FlashcardReviewPopup";
import FlashcardQuiz from "./FlashcardQuiz";
import { useSettings } from "../contexts/SettingsContext";

type SortMode = "newest" | "alphabetical" | "lowest-ratio";

type FlashcardsProps = {
  flashcards: Flashcard[];
  onRemoveFlashcard: (id: string) => void;
  onUpdateFlashcardStats?: (results: { id: string; correct: number; attempt: number }[]) => void;
};

const COLORS = ["#f97316", "#d97706", "#f43f5e", "#14b8a6", "#eab308", "#f87171"];

function sortCards(cards: Flashcard[], sort: SortMode): Flashcard[] {
  const copy = [...cards];
  switch (sort) {
    case "alphabetical":
      return copy.sort((a, b) => a.original.toLowerCase().localeCompare(b.original.toLowerCase()));
    case "lowest-ratio":
      return copy.sort((a, b) => {
        const ratioA = a.attemptCount > 0 ? a.correctCount / a.attemptCount : 1;
        const ratioB = b.attemptCount > 0 ? b.correctCount / b.attemptCount : 1;
        return ratioA - ratioB;
      });
    default:
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function Flashcards({ flashcards, onRemoveFlashcard, onUpdateFlashcardStats }: FlashcardsProps) {
  const { flashcardMode, fontSize } = useSettings();
  const [reviewCard, setReviewCard] = useState<Flashcard | null>(null);
  const [quizActive, setQuizActive] = useState(false);
  const [sort, setSort] = useState<SortMode>("newest");

  const sorted = useMemo(() => sortCards(flashcards, sort), [flashcards, sort]);

  if (quizActive) {
    return (
      <FlashcardQuiz
        cards={flashcards}
        fontSize={fontSize}
        onExit={() => setQuizActive(false)}
        onComplete={onUpdateFlashcardStats}
      />
    );
  }

  if (flashcards.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 48, opacity: 0.3 }}>🃏</div>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 320, lineHeight: 1.5 }}>
          No flashcards yet. Select text in a book and save it as a flashcard.
        </p>
      </div>
    );
  }

  return (
    <>
      <FlashcardReviewPopup
        flashcard={reviewCard}
        flashcardMode={flashcardMode}
        onClose={() => setReviewCard(null)}
      />
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["newest", "alphabetical", "lowest-ratio"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSort(m)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: sort === m ? "var(--accent)" : "transparent",
                  color: sort === m ? "#fff" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: sort === m ? "var(--accent)" : "var(--border)",
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.15s",
                }}
              >
                {m === "newest" ? "Newest" : m === "alphabetical" ? "A–Z" : "Needs Practice"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setQuizActive(true)}
            style={{
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            Start Quiz
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {sorted.map((card, i) => (
            <FlashcardCard
              key={card.id}
              card={card}
              color={COLORS[i % COLORS.length]}
              fontSize={fontSize}
              onClick={() => setReviewCard(card)}
              onRemove={() => onRemoveFlashcard(card.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function FlashcardCard({
  card,
  color,
  fontSize,
  onClick,
  onRemove,
}: {
  card: Flashcard;
  color: string;
  fontSize: number;
  onClick: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 0.2s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        style={{
          height: 120,
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          color: "#fff",
          fontSize: 14 * fontSize / 100,
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          userSelect: "none",
        }}
      >
        {card.original}
      </div>
      {card.attemptCount > 0 && (
        <div
          style={{
            padding: "5px 10px",
            fontSize: 11 * fontSize / 100,
            color: "var(--text-secondary)",
            textAlign: "right",
            borderTop: "1px solid var(--border)",
          }}
        >
          {card.correctCount}/{card.attemptCount}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove flashcard"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          opacity: hover ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default Flashcards;
