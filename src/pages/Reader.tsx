import { useState, useCallback, useRef, useEffect } from 'react';
import ePub from 'epubjs';
import { getDocument as getPdfDocument } from "pdfjs-dist";
import EpubViewer from "../components/EpubViewer";
import PdfViewer from "../components/PdfViewer";
import Toolbar from "../components/Toolbar";
import TranslationPopup from "../components/TranslationPopup";
import Library from "../components/Library";
import Flashcards from "../components/Flashcards";
import { useTranslation } from "../hooks/useTranslation";
import { useLibrary } from "../hooks/useLibrary";
import { useFlashcards } from "../hooks/useFlashcards";
import { useSettings } from "../contexts/SettingsContext";
import {
  pickBook,
  saveBookBytes,
  loadBookBytes,
  deleteBookBytes,
  deleteCover,
  saveCoverBytes,
  exportLibrary,
  saveLibraryFile,
  importLibrary,
  pickLibraryFile,
} from "../services/bookStorage";

type ViewerHandle = { clearHighlight: () => void };

function basename(path: string) {
  const parts = path.replace(/[/\\]$/, "").split(/[/\\]/);
  return parts[parts.length - 1].replace(/\.[^.]+$/, "");
}

function getBookFormat(path: string): "epub" | "pdf" {
  return /\.pdf$/i.test(path) ? "pdf" : "epub";
}

function detectBookFormat(bytes: Uint8Array): "epub" | "pdf" | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // '%'
    bytes[1] === 0x50 && // 'P'
    bytes[2] === 0x44 && // 'D'
    bytes[3] === 0x46 && // 'F'
    bytes[4] === 0x2d //  '-'
  ) {
    return "pdf";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && // 'P'
    bytes[1] === 0x4b && // 'K'
    bytes[2] === 0x03 && // '\x03'
    bytes[3] === 0x04 // '\x04'
  ) {
    return "epub";
  }
  return null;
}

function isAbsolutePath(p: string) {
  return p.startsWith("/") || /^[A-Z]:\\/i.test(p);
}

function friendlyBookName(path: string, format: "epub" | "pdf"): string {
  const decoded = decodeURIComponent(path);
  const candidate = basename(decoded).replace(/\.[^.]+$/, "");
  const cleaned = candidate.replace(/^(primary|msf|document|downloads|external)[:%][^/]*$/i, "");
  if (cleaned && !/^document%|%3A/.test(cleaned)) return cleaned;
  return format === "pdf" ? "Untitled PDF" : "Untitled EPUB";
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
    await saveCoverBytes(name, new Uint8Array(buf));
    return name;
  } catch (err) {
    window.alert("Failed to save cover image: " + String(err));
    return;
  }
}

async function extractPdfCover(bytes: Uint8Array, id: string): Promise<string | undefined> {
  try {
    const task = getPdfDocument({ data: bytes.slice() });
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    task.destroy();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const buf = await blob.arrayBuffer();
    const name = `covers/${id}.png`;
    await saveCoverBytes(name, new Uint8Array(buf));
    return name;
  } catch (err) {
    window.alert("Failed to save cover image: " + String(err));
    return;
  }
}

function Reader() {
    const { fontSize } = useSettings();
    const { books, addBook, removeBook, replaceBooks, updateBookLocation, updateBookFile } = useLibrary();
    const { flashcards, addFlashcard, updateFlashcardStats, removeFlashcard, replaceFlashcards } = useFlashcards();
    const viewerRef = useRef<ViewerHandle>(null);
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
        let picked;
        try {
            picked = await pickBook();
        } catch (err) {
            console.error("File dialog failed:", err);
            window.alert("Failed to open file dialog: " + String(err));
            return;
        }

        if (!picked) return;

        const bytes = picked.bytes;
        const name = picked.name;
        const format = detectBookFormat(bytes) ?? getBookFormat(name);

        let title: string;
        let author: string;
        let book: any;
        try {
          if (format === "pdf") {
            const task = getPdfDocument({ data: bytes.slice() });
            const pdf = await task.promise;
            const meta = await pdf.getMetadata();
            const info = (meta.info ?? {}) as { Title?: string; Author?: string };
            title = info.Title || basename(name);
            author = info.Author || "Unknown Author";
            task.destroy();
          } else {
            book = await ePub(bytes, {});
            const meta = book.metadata;
            title = meta.title || basename(name);
            author = meta.creator || meta.publisher || "Unknown Author";
          }
        } catch {
          title = basename(name);
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
        const storageName = `${id}.${format === "pdf" ? "pdf" : "epub"}`;
        try {
          await saveBookBytes(storageName, bytes);
        } catch (err) {
          window.alert("Failed to save book to library: " + String(err));
          return;
        }

        const storedCoverPath = format === "pdf"
          ? await extractPdfCover(bytes, id)
          : book
            ? await extractCover(book, id)
            : undefined;

        addBook({ filePath: storageName, title, author, coverPath: storedCoverPath });
        setFilePath(storageName);
        setView("reader");
        setPopup(null);
    }

    const handleOpenBook = useCallback(async (book: import("../hooks/useLibrary").LibraryBook) => {
      let path = book.filePath;
      let coverPath = book.coverPath;
      let title = book.title;

      try {
        const bytes = await loadBookBytes(path);
        const detected = detectBookFormat(bytes);
        if (isAbsolutePath(path) || (detected && getBookFormat(path) !== detected)) {
          const id = crypto.randomUUID();
          const storageName = `${id}.${(detected ?? getBookFormat(path)) === "pdf" ? "pdf" : "epub"}`;
          await saveBookBytes(storageName, bytes);
          if (detected && getBookFormat(path) !== detected && /document%|%3A|^content:/i.test(title)) {
            title = friendlyBookName(path, detected);
          }
          updateBookFile(book.id, storageName, title);
          const oldIsStorage = !isAbsolutePath(path) && !/^content:\/\//i.test(path);
          if (oldIsStorage) {
            try {
              await deleteBookBytes(path);
            } catch {}
          }
          path = storageName;
        }
      } catch (err) {
        window.alert("Failed to save book to library: " + String(err));
        return;
      }

      addBook({ filePath: path, title, author: book.author, coverPath });
      setFilePath(path);
      setView("reader");
      setPopup(null);
    }, [addBook, updateBookFile]);

    const handleGoToLibrary = useCallback(() => {
      setPopup(null);
      setView("library");
    }, []);

    const handleGoToFlashcards = useCallback(() => {
      setPopup(null);
      setView("flashcards");
    }, []);

    const handleExport = useCallback(async () => {
      try {
        const json = await exportLibrary(books, flashcards);
        await saveLibraryFile(json);
      } catch (err) {
        console.error("Export failed:", err);
        window.alert("Failed to export library: " + String(err));
      }
    }, [books, flashcards]);

    const handleImport = useCallback(async () => {
      try {
        const json = await pickLibraryFile();
        if (!json) return;
        const imported = await importLibrary(json);
        replaceBooks(imported.books);
        replaceFlashcards(imported.flashcards);
      } catch (err) {
        console.error("Import failed:", err);
        window.alert("Failed to import library: " + String(err));
      }
    }, [replaceBooks, replaceFlashcards]);

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

    const handleOutsideClick = useCallback(() => {
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
          await deleteBookBytes(book.filePath);
          if (book.coverPath) {
            await deleteCover(book.coverPath);
          }
        } catch {}
      }
      removeBook(bookId);
    }, [books, removeBook]);

              //<div style={{ flex: 1, display: view === "reader" ? "flex" : "none", flexDirection: "column", minHeight: 0, height: '100vh' }}>
    return (
        <>
        <div style={{ width: '100svw', height: '100svh', display: 'flex', flexDirection: 'column' }}>
            <Toolbar
              onOpenFile={openFile}
              onGoToLibrary={handleGoToLibrary}
              onGoToFlashcards={handleGoToFlashcards}
              onExport={handleExport}
              onImport={handleImport}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minHeight: 0 }}>
              <div style={{
                          flex: view === "reader" ? 1 : undefined,
                          display: view === "reader" ? "flex" : "none",
                          flexDirection: "column", 
                          minHeight: 0, 
                          }}>
                {filePath && getBookFormat(filePath) === "pdf" ? (
                  <PdfViewer
                    ref={viewerRef}
                    filePath={filePath}
                    fontSize={fontSize}
                    darkMode={isDark}
                    initialLocation={initialLocation}
                    onLocationChange={handleLocationChange}
                    onTextSelected={handleTextSelected}
                  />
                ) : (
                  <EpubViewer
                    ref={viewerRef}
                    filePath={filePath}
                    fontSize={fontSize}
                    darkMode={isDark}
                    initialLocation={initialLocation}
                    onLocationChange={handleLocationChange}
                    onTextSelected={handleTextSelected}
                  />
                )}
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
                onOutsideClick={handleOutsideClick}
                onSaveFlashcard={handleSaveFlashcard}
              />
            )}
        </div>
        </>
    );
}

export default Reader;
