import { useState, useCallback } from "react";

export type LibraryBook = {
  id: string;
  filePath: string;
  title: string;
  author: string;
  coverPath?: string;
  lastLocation?: string;
  addedAt: number;
  lastReadAt: number;
};

const STORAGE_KEY = "charlingo-library";

function loadLibrary(): LibraryBook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LibraryBook[];
  } catch {}
  return [];
}

function saveLibrary(books: LibraryBook[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

export function useLibrary() {
  const [books, setBooks] = useState<LibraryBook[]>(loadLibrary);

  const addBook = useCallback(
    (meta: { filePath: string; title: string; author: string; coverPath?: string }) => {
      setBooks((prev) => {
        const existing = prev.find((b) => b.filePath === meta.filePath);
        if (existing) {
          const updated = prev.map((b) =>
            b.filePath === meta.filePath
              ? { ...b, lastReadAt: Date.now() }
              : b,
          );
          saveLibrary(updated);
          return updated;
        }
        const newBook: LibraryBook = {
          id: crypto.randomUUID(),
          filePath: meta.filePath,
          title: meta.title,
          author: meta.author,
          coverPath: meta.coverPath,
          addedAt: Date.now(),
          lastReadAt: Date.now(),
        };
        const updated = [newBook, ...prev];
        saveLibrary(updated);
        return updated;
      });
    },
    [],
  );

  const removeBook = useCallback((id: string) => {
    setBooks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const updateBookLocation = useCallback((id: string, cfi: string) => {
    setBooks((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, lastLocation: cfi, lastReadAt: Date.now() } : b,
      );
      saveLibrary(updated);
      return updated;
    });
  }, []);

  return { books, addBook, removeBook, updateBookLocation };
}
