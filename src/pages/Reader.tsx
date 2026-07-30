import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, remove, BaseDirectory } from "@tauri-apps/plugin-fs";
import { useState, useCallback, useRef, useEffect } from 'react';
import ePub from 'epubjs';
import EpubViewer, { type EpubViewerHandle } from "../components/EpubViewer";
import Toolbar from "../components/Toolbar";
import TranslationPopup from "../components/TranslationPopup";
import Library from "../components/Library";
import Flashcards from "../components/Flashcards";
import { useTranslation } from "../hooks/useTranslation";
import { useLibrary } from "../hooks/useLibrary";
import { useFlashcards } from "../hooks/useFlashcards";
import { useSettings } from "../contexts/SettingsContext";

function basename(path: string) {
  const parts = path.replace(/[/\\]$/, "").split(/[/\\]/);
  return parts[parts.length - 1].replace(/\.epub$/i, "");
}

function isAbsolutePath(p: string) {
  return p.startsWith("/") || /^[A-Z]:\\/i.test(p);
}

async function extractCover(book: any, id: string): Promise<string | undefined> {
  try {
    const coverResource = book.resources?.find(
      (r: any) => r.properties?.includes?.("cover-image")
    );
    if (!coverResource?.href) return;

    const ext = coverResource.source?.split(".").pop() || "jpg";
    const name = `covers/${id}.${ext}`;
    const resp = await fetch(coverResource.href);
    const blob = await resp.blob();
    const buf = await blob.arrayBuffer();
    await writeFile(name, new Uint8Array(buf), { baseDir: BaseDirectory.AppData });
    return name;
  } catch {
    return;
  }
}

function Reader() {
    const { fontSize } = useSettings();
    const { books, addBook, removeBook, updateBookLocation } = useLibrary();
    const { flashcards, addFlashcard, updateFlashcardStats, removeFlashcard } = useFlashcards();
    const viewerRef = useRef<EpubViewerHandle>(null);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [view, setView] = useState<"reader" | "library" | "flashcards">("library");
    const [popup, setPopup] = useState<{
      original: string;
      translation: string | null;
      x: number;
      y: number;
      viewerWidth?: number;
    } | null>(null);

    const currentBook = books.find((b) => b.filePath === filePath);
    const initialLocation = currentBook?.lastLocation;

    const handleLocationChange = useCallback(
      (cfi: string) => {
        if (currentBook) {
          updateBookLocation(currentBook.id, cfi);
        }
      },
      [currentBook, updateBookLocation],
    );

    const [isDark, setIsDark] = useState(() =>
      document.documentElement.getAttribute("data-theme") === "dark"
    );

    useEffect(() => {
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    }, []);

    const { translate, translating } = useTranslation();

    async function openFile() {
        const file = await open({
            filters: [
                {
                    name: "EPUB",
                    extensions: ["epub"]
                }
            ]
        });

        if (typeof file !== "string") return;

        const bytes = await readFile(file);

        let title: string;
        let author: string;
        let book: any;
        try {
          book = await ePub(bytes, {});
          const meta = book.metadata;
          title = meta.title || basename(file);
          author = meta.creator || meta.publisher || "Unknown Author";
        } catch {
          title = basename(file);
          author = "Unknown Author";
        }

        // Reuse existing library entry if book with same title exists
        const existing = books.find((b) => b.title === title);
        if (existing) {
          addBook({ filePath: existing.filePath, title: existing.title, author: existing.author, coverPath: existing.coverPath });
          setFilePath(existing.filePath);
          setView("reader");
          setPopup(null);
          return;
        }

        // Copy to app data so it's readable in future sessions
        const id = crypto.randomUUID();
        const storageName = `${id}.epub`;
        await writeFile(storageName, bytes, { baseDir: BaseDirectory.AppData });

        const storedCoverPath = book ? await extractCover(book, id) : undefined;

        addBook({ filePath: storageName, title, author, coverPath: storedCoverPath });
        setFilePath(storageName);
        setView("reader");
        setPopup(null);
    }

    const handleOpenBook = useCallback(async (book: import("../hooks/useLibrary").LibraryBook) => {
      let path = book.filePath;
      let coverPath = book.coverPath;

      if (isAbsolutePath(path)) {
        try {
          const bytes = await readFile(path);
          const id = crypto.randomUUID();
          const storageName = `${id}.epub`;
          await writeFile(storageName, bytes, { baseDir: BaseDirectory.AppData });
          path = storageName;
        } catch {
          return;
        }
      }

      addBook({ filePath: path, title: book.title, author: book.author, coverPath });
      setFilePath(path);
      setView("reader");
      setPopup(null);
    }, [addBook]);

    const handleGoToLibrary = useCallback(() => {
      setPopup(null);
      setView("library");
    }, []);

    const handleGoToFlashcards = useCallback(() => {
      setPopup(null);
      setView("flashcards");
    }, []);

    const handleTextSelected = useCallback(
      async (text: string, x: number, y: number, viewerWidth?: number) => {
        setPopup({ original: text, translation: null, x, y, viewerWidth });
        const result = await translate(text);
        setPopup((prev) =>
          prev?.original === text
            ? { ...prev, translation: result }
            : prev,
        );
      },
      [translate],
    );

    const handleClosePopup = useCallback(() => {
      viewerRef.current?.clearHighlight();
      setPopup(null);
    }, []);

    const handleSaveFlashcard = useCallback(
      (original: string, translation: string) => {
        const title = books.find((b) => b.filePath === filePath)?.title ?? "Unknown";
        addFlashcard(original, translation, title);
        viewerRef.current?.clearHighlight();
        setPopup(null);
      },
      [books, filePath, addFlashcard],
    );

    const handleRemoveBook = useCallback(async (bookId: string) => {
      const book = books.find((b) => b.id === bookId);
      if (book) {
        try {
          await remove(book.filePath, { baseDir: BaseDirectory.AppData });
          if (book.coverPath) {
            await remove(book.coverPath, { baseDir: BaseDirectory.AppData });
          }
        } catch {}
      }
      removeBook(bookId);
    }, [books, removeBook]);

              //<div style={{ flex: 1, display: view === "reader" ? "flex" : "none", flexDirection: "column", minHeight: 0, height: '100vh' }}>
    return (
        <>
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Toolbar
              onOpenFile={openFile}
              onGoToLibrary={handleGoToLibrary}
              onGoToFlashcards={handleGoToFlashcards}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>
              <div style={{
                          flex: view === "reader" ? 1 : undefined,
                          display: view === "reader" ? "flex" : "none",
                          flexDirection: "column", 
                          minHeight: 0, 
                          }}>
                <EpubViewer
                  ref={viewerRef}
                  filePath={filePath}
                  fontSize={fontSize}
                  darkMode={isDark}
                  initialLocation={initialLocation}
                  onLocationChange={handleLocationChange}
                  onTextSelected={handleTextSelected}
                />
              </div>
              <div style={{ flex: 1, display: view === "library" ? "flex" : "none", flexDirection: "column", minHeight: 0 }}>
                <Library
                  books={books}
                  onOpenBook={handleOpenBook}
                  onRemoveBook={handleRemoveBook}
                />
              </div>
              <div style={{ flex: 1, display: view === "flashcards" ? "flex" : "none", flexDirection: "column", minHeight: 0 }}>
                <Flashcards
                  flashcards={flashcards}
                  onRemoveFlashcard={removeFlashcard}
                  onUpdateFlashcardStats={updateFlashcardStats}
                />
              </div>
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "center",
                  padding: "10px 16px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--accent)",
                    letterSpacing: "-0.3px",
                  }}
                >
                  CharLingo
                </span>
              </div>
            </div>
            {popup && (
              <TranslationPopup
                original={popup.original}
                translation={popup.translation}
                translating={translating}
                viewerWidth={popup.viewerWidth}
                fontSize={fontSize}
                onClose={handleClosePopup}
                onSaveFlashcard={handleSaveFlashcard}
              />
            )}
        </div>
        </>
    );
}

export default Reader;
