import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import ePub from 'epubjs';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

(window as any).ePub = ePub;

export type EpubViewerHandle = {
  clearHighlight: () => void;
};

type EpubViewerProps = {
  filePath: string | null;
  fontSize?: number;
  onTextSelected?: (text: string, x: number, y: number, viewerWidth?: number) => void;
};

const EpubViewer = forwardRef<EpubViewerHandle, EpubViewerProps>(
  ({ filePath, fontSize, onTextSelected }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Awaited<ReturnType<typeof ePub>> | null>(null);
  const renditionRef = useRef<any>(null);
  const lastCfiRef = useRef<string | null>(null);
  const [location, setLocation] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    clearHighlight: () => {
      if (lastCfiRef.current) {
        renditionRef.current?.annotations?.remove(lastCfiRef.current, "highlight");
        lastCfiRef.current = null;
      }
    },
  }));

  const loadedPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Going to library — keep book alive in hidden DOM
    if (!filePath) return;

    // Same book being re-shown after going to library — already loaded
    if (filePath === loadedPathRef.current) return;

    // Opening a different book — destroy the old one deferred to avoid
    // re-entering React's rendering cycle (rendition.destroy triggers
    // events that cause state updates and infinite re-render loops)
    if (bookRef.current) {
      const oldRendition = renditionRef.current;
      const oldBook = bookRef.current;
      renditionRef.current = null;
      bookRef.current = null;
      setTimeout(() => {
        oldRendition?.destroy?.();
        oldBook?.destroy?.();
      }, 0);
    }

    loadedPathRef.current = filePath;

    const fp: string = filePath;
    let cancelled = false;

    async function loadBook() {
      let fileBytes;
      try {
        fileBytes = await readFile(fp, { baseDir: BaseDirectory.AppData });
      } catch {
        fileBytes = await readFile(fp);
      }
      if (cancelled) return;

      const book = await ePub(fileBytes, {});
      if (cancelled) { book.destroy?.(); return; }

      bookRef.current = book;
      const rendition = book.renderTo(viewerRef.current!, {
        width: '100%',
        height: '100%',
      });
      rendition.on("relocated", (loc: any) => setLocation(loc));
      rendition.on("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
        }
        if (e.key === "ArrowLeft") rendition.prev();
        else if (e.key === "ArrowRight") rendition.next();
      });
      rendition.on("mouseup", (_e: MouseEvent, contents: any) => {
        window.dispatchEvent(new CustomEvent("viewer-interaction"));
        const selection = contents.window.getSelection();
        const text = selection?.toString().trim();
        if (!text) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const iframe = viewerRef.current?.querySelector("iframe");
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          rect.x += iframeRect.left;
          rect.y += iframeRect.top;
        }

        if (lastCfiRef.current) {
          rendition.annotations.remove(lastCfiRef.current, "highlight");
        }
        const cfirange = contents.cfiFromRange(range);
        lastCfiRef.current = cfirange;
        rendition.annotations.highlight(cfirange, {});
        const viewerWidth = viewerRef.current?.clientWidth ?? 0;
        onTextSelected?.(text, rect.x, rect.y, viewerWidth);
      });
      renditionRef.current = rendition;
      await rendition.display();
      rendition.themes.fontSize((fontSize ?? 100) + "%");
    }

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Destroy book/rendition only on actual component unmount (app shutdown)
  useEffect(() => {
    return () => {
      renditionRef.current?.destroy?.();
      renditionRef.current = null;
      bookRef.current?.destroy?.();
      bookRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!renditionRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        renditionRef.current.prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        renditionRef.current.next();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!renditionRef.current) return;
    renditionRef.current.themes.fontSize(fontSize + "%");
  }, [fontSize]);

  const handlePrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        ref={viewerRef}
        style={{ flex: 1 }}
      />
      {filePath && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            padding: "0.5rem",
            alignItems: "center",
          }}
        >
          <button onClick={handlePrev} disabled={location?.atStart}>
            ← Prev
          </button>
          <span>
            {location
              ? `${location.start.displayed.page} / ${location.start.displayed.total}`
              : ""}
          </span>
          <button onClick={handleNext} disabled={location?.atEnd}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
});

export default EpubViewer;
