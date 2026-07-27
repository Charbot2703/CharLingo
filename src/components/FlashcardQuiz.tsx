import { useState, useRef, useEffect, useCallback } from "react";
import type { Flashcard } from "../hooks/useFlashcards";

type CardResult = { id: string; correct: number; attempt: number };

type FlashcardQuizProps = {
  cards: Flashcard[];
  fontSize: number;
  onExit: () => void;
  onComplete?: (results: CardResult[]) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^\w\s]/g, "");
}

function FlashcardQuiz({ cards, fontSize, onExit, onComplete }: FlashcardQuizProps) {
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"prompt" | "correct" | "incorrect">("prompt");
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retriesRef = useRef(new Map<string, number>());
  const cardResultsRef = useRef(new Map<string, { correct: number; attempt: number }>());

  const recordAttempt = useCallback((id: string, isCorrect: boolean) => {
    const prev = cardResultsRef.current.get(id) ?? { correct: 0, attempt: 0 };
    cardResultsRef.current.set(id, { correct: prev.correct + (isCorrect ? 1 : 0), attempt: prev.attempt + 1 });
  }, []);

  const current = queue[index];

  const flushResults = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (!onComplete) return;
    const results = [...cardResultsRef.current.entries()].map(([id, r]) => ({ id, ...r }));
    onComplete(results);
  }, [onComplete]);

  const handleExit = useCallback(() => {
    flushResults();
    onExit();
  }, [flushResults, onExit]);

  const advance = useCallback(() => {
    setQueue((q) => {
      const next = q.slice(1);
      if (next.length === 0) {
        setIndex(0);
      }
      return next;
    });
    setIndex(0);
    setInput("");
    setStatus("prompt");
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (status !== "correct") return;
    timerRef.current = setTimeout(advance, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [status, advance]);

  const handleSubmit = () => {
    if (status !== "prompt") return;
    const normalizedInput = normalize(input);
    const normalizedAnswer = normalize(current.translation);
    if (normalizedInput === normalizedAnswer) {
      setStatus("correct");
      setCorrectCount((c) => c + 1);
      recordAttempt(current.id, true);
    } else {
      retriesRef.current.set(current.id, (retriesRef.current.get(current.id) ?? 0) + 1);
      recordAttempt(current.id, false);
      setQueue((q) => [...q, current]);
      setStatus("incorrect");
    }
    setAttemptCount((c) => c + 1);
  };

  const handleNext = () => {
    advance();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && status === "prompt") {
      handleSubmit();
    } else if (e.key === "Enter" && status === "incorrect") {
      handleNext();
    }
  };

  const completedRef = useRef(false);
  useEffect(() => {
    if (queue.length === 0 && !completedRef.current) {
      flushResults();
    }
  }, [queue.length, flushResults]);

  if (queue.length === 0) {
    const retries = [...retriesRef.current.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: 24,
          overflow: "auto",
          color: "var(--text)",
        }}
      >
        <div style={{ fontSize: 24 * fontSize / 100, fontWeight: 700, marginTop: 16 }}>Review Complete!</div>
        <div style={{ fontSize: 16 * fontSize / 100 }}>
          {correctCount} / {cards.length} correct ({attemptCount} attempts)
        </div>
        {retries.length > 0 && (
          <div style={{ width: "100%", maxWidth: 500 }}>
            <div style={{ fontSize: 14 * fontSize / 100, fontWeight: 600, marginBottom: 8, color: "#f87171" }}>
              Cards that need practice ({retries.length}):
            </div>
            {retries.map(([id, count]) => {
              const c = cardMap.get(id);
              if (!c) return null;
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    marginBottom: 4,
                    borderRadius: 6,
                    background: "var(--bg, #fff)",
                    border: "1px solid var(--border, #eee)",
                    fontSize: 13 * fontSize / 100,
                    gap: 8,
                  }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.original}
                  </span>
                  <span style={{ color: "#f87171", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {count} {count === 1 ? "retry" : "retries"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={handleExit} style={{ padding: "8px 20px", fontSize: 14 * fontSize / 100, cursor: "pointer", marginBottom: 16 }}>
          Back to Flashcards
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13 * fontSize / 100, color: "var(--text)" }}>
          Cards remaining: {queue.length}
        </div>
        <div style={{ fontSize: 13 * fontSize / 100, color: "var(--text)" }}>
          Correct: {correctCount} / {attemptCount}
        </div>
        <button onClick={handleExit} style={{ fontSize: 12 * fontSize / 100, cursor: "pointer" }}>
          Exit Review
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            borderRadius: 8,
            background: "#c084fc",
            color: "#fff",
            padding: "32px 24px",
            fontSize: 18 * fontSize / 100,
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          {current.original}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status !== "prompt"}
          placeholder="Type the English translation..."
          autoFocus
          style={{
            width: "100%",
            maxWidth: 500,
            padding: "10px 14px",
            fontSize: 15 * fontSize / 100,
            border: "1px solid var(--border, #ddd)",
            borderRadius: 6,
            outline: "none",
            boxSizing: "border-box",
            color: "var(--text, #333)",
            background: "var(--bg, #fff)",
          }}
        />

        {status === "prompt" && (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            style={{
              padding: "8px 24px",
              fontSize: 14 * fontSize / 100,
              fontWeight: 600,
              cursor: "pointer",
              background: "#34d399",
              color: "#fff",
              border: "none",
              borderRadius: 6,
            }}
          >
            Submit
          </button>
        )}

        {status === "correct" && (
          <div
            style={{
              fontSize: 15 * fontSize / 100,
              fontWeight: 600,
              color: "#34d399",
            }}
          >
            ✓ Correct
          </div>
        )}

        {status === "incorrect" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15 * fontSize / 100, fontWeight: 600, color: "#f87171" }}>
              ✗ Incorrect
            </div>
            <div style={{ fontSize: 14 * fontSize / 100, color: "var(--text)" }}>
              The answer was: <strong>{current.translation}</strong>
            </div>
            <button
              onClick={handleNext}
              style={{
                padding: "8px 24px",
                fontSize: 14 * fontSize / 100,
                fontWeight: 600,
                cursor: "pointer",
                background: "#60a5fa",
                color: "#fff",
                border: "none",
                borderRadius: 6,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardQuiz;
