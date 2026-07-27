import { useState, useCallback } from "react";

export type Flashcard = {
  id: string;
  original: string;
  translation: string;
  sourceTitle: string;
  createdAt: number;
  correctCount: number;
  attemptCount: number;
};

const STORAGE_KEY = "charlingo-flashcards";

function loadFlashcards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Flashcard[];
      return parsed.map((c) => ({ ...c, correctCount: c.correctCount ?? 0, attemptCount: c.attemptCount ?? 0 }));
    }
  } catch {}
  return [];
}

function saveFlashcards(cards: Flashcard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function useFlashcards() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(loadFlashcards);

  const addFlashcard = useCallback(
    (original: string, translation: string, sourceTitle: string) => {
      setFlashcards((prev) => {
        if (prev.some((c) => c.original === original)) return prev;
        const card: Flashcard = {
          id: crypto.randomUUID(),
          original,
          translation,
          sourceTitle,
          createdAt: Date.now(),
          correctCount: 0,
          attemptCount: 0,
        };
        const updated = [card, ...prev];
        saveFlashcards(updated);
        return updated;
      });
    },
    [],
  );

  const updateFlashcardStats = useCallback(
    (results: { id: string; correct: number; attempt: number }[]) => {
      setFlashcards((prev) => {
        const stats = new Map(results.map((r) => [r.id, r]));
        const updated = prev.map((c) => {
          const s = stats.get(c.id);
          if (!s) return c;
          return { ...c, correctCount: c.correctCount + s.correct, attemptCount: c.attemptCount + s.attempt };
        });
        saveFlashcards(updated);
        return updated;
      });
    },
    [],
  );

  const removeFlashcard = useCallback((id: string) => {
    setFlashcards((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveFlashcards(updated);
      return updated;
    });
  }, []);

  return { flashcards, addFlashcard, updateFlashcardStats, removeFlashcard };
}
