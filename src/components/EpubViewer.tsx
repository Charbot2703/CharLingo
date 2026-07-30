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
  darkMode?: boolean;
  initialLocation?: string;
  onLocationChange?: (cfi: string) => void;
  onTextSelected?: (text: string, x: number, y: number, viewerWidth?: number) => void;
};

const STYLE_ID = "charlingo-viewer-styles";

function applyDarkMode(rendition: any, dark: boolean) {
  injectViewerStyles(rendition, dark);
}

const VIEWER_CSS_LIGHT = `body { padding-bottom: 48px !important; }`;
const VIEWER_CSS_DARK = `body {
  color: #e2e8f0 !important;
  background: #0b0d14 !important;
  padding-bottom: 48px !important;
}
a, a:link, a:visited {
  color: #fb923c !important;
}`;

function injectViewerStyles(rendition: any, dark: boolean) {
  try {
    const contents = rendition.getContents();
    if (!contents || !contents.length) return;
    contents.forEach((content: any) => {
      const doc = content.document;
      if (!doc || !doc.head) return;
      let el = doc.getElementById(STYLE_ID);
      if (!el) {
        el = doc.createElement("style");
        el.id = STYLE_ID;
        doc.head.appendChild(el);
      }
      el.textContent = dark ? VIEWER_CSS_DARK : VIEWER_CSS_LIGHT;
    });
  } catch {
    // silently ignore if iframe isn't ready
  }
}

const navBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 14px",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text)",
  cursor: "pointer",
  transition: "all 0.15s",
};

const EpubViewer = forwardRef<EpubViewerHandle, EpubViewerProps>(
  ({ filePath, fontSize, darkMode, initialLocation, onLocationChange, onTextSelected }, ref) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Awaited<ReturnType<typeof ePub>> | null>(null);
  const renditionRef = useRef<any>(null);
  const lastCfiRef = useRef<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useImperativeHandle(ref, () => ({
    clearHighlight: () => {
      if (lastCfiRef.current) {
        renditionRef.current?.annotations?.remove(lastCfiRef.current, "highlight");
        lastCfiRef.current = null;
      }
    },
  }));

  const loadedPathRef = useRef<string | null>(null);
  const darkModeRef = useRef(darkMode);
  darkModeRef.current = darkMode;
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Check immediately on mount
    const initialHeight = viewerRef.current.clientHeight;
    if (initialHeight > 0) {
      setContainerHeight(initialHeight);
      setContainerWidth(viewerRef.current.clientWidth);
      return;
    }

    // If it's 0, use a double-check loop (AnimationFrame) until it is ready
    let animationFrameId: number;
    const checkHeight = () => {
      if (viewerRef.current) {
        const height = viewerRef.current.clientHeight;
        const width = viewerRef.current.clientWidth;
        console.log(`Checking height ${height}`)
        
        if (height > 0) {
          console.log(`Height found! ${height}px`)
          setContainerHeight(height);
          setContainerWidth(width);
        } else {
          // Keep checking next frame if still 0
          animationFrameId = requestAnimationFrame(checkHeight);
        }
      }
    };

    animationFrameId = requestAnimationFrame(checkHeight);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (!filePath) return;
    if (filePath === loadedPathRef.current) return;

    if (containerHeight === 0) return;
    console.log(`Initialization safe! Width: ${containerWidth}px, Height: ${containerHeight}px`)


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
        flow: 'paginated', // Change to 'scrolled' if you want vertical scrolling
        manager: 'default', // Use 'continuous' if flow is 'scrolled'
        spread: 'none',
        width: containerWidth,
        height: containerHeight,
      });

      rendition.hooks.content.register((contents: any) => {
        contents.addStylesheetRules({
          body: {
            'padding': '0 40px !important', // Safe padding so text doesn't touch Tauri borders
            "column-count": "1 !important",    // Restricts layout to a single text column
            "column-width": "auto !important", // Spans the column to the container edges
            'box-sizing': 'border-box !important',
            'word-break': 'break-word !important',
          },
          'img, table, svg': {
            'max-width': '100% !important', // Stops large elements from blowing out container
            'height': 'auto !important',
          },
        });
      });

      rendition.on("relocated", (loc: any) => {
        setLocation(loc);
        if (loc?.start?.cfi) {
          onLocationChangeRef.current?.(loc.start.cfi);
        }
        if (darkModeRef.current && renditionRef.current) {
          applyDarkMode(renditionRef.current, true);
        }
      });
      rendition.on("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
        }
        if (e.key === "ArrowLeft") rendition.prev();
        else if (e.key === "ArrowRight") rendition.next();
      });
      rendition.on("touchstart", (e: TouchEvent) => {
        touchStartX.current = e.changedTouches[0].screenX;
        touchStartY.current = e.changedTouches[0].screenY;
      });

      rendition.on("touchend", (e: TouchEvent) => {
        window.dispatchEvent(new CustomEvent("viewer-interaction"));
        const deltaX = e.changedTouches[0].screenX - touchStartX.current;
        const deltaY = e.changedTouches[0].screenY - touchStartY.current;
        const threshold = 40;
        if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) rendition.next();
          else rendition.prev();
        }
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
      await rendition.display(initialLocation || undefined);
      rendition.themes.fontSize((fontSize ?? 100) + "%");
      if (darkModeRef.current) {
        applyDarkMode(rendition, true);
      }
    }

       // 5. Handle Tauri window resizing seamlessly
      const handleResize = () => {
        if (viewerRef.current && renditionRef.current) {
        console.log(`RESIZING ${viewerRef.current.clientHeight}`)
        const height = viewerRef.current.clientHeight;
        const width = viewerRef.current.clientWidth;
        console.log(`Checking height ${height}`)
        
        if (height > 0) {
          console.log(`Height found! ${height}px`)
          setContainerHeight(height);
          setContainerWidth(width);
        }
          renditionRef.current.resize(containerWidth, containerHeight)
        }
      };

      window.addEventListener('resize', handleResize);

    loadBook();

    return () => {
      cancelled = true;
    };
  }, [filePath, containerHeight, containerWidth]);

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

  useEffect(() => {
    if (!renditionRef.current) return;
    applyDarkMode(renditionRef.current, !!darkMode);
  }, [darkMode]);

  const handlePrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        ref={viewerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        //  overflow: 'hidden'
        }}
        //style={{ flex: 1, position: "relative",  maxHeight: "75svh" }}
      />
      {filePath && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            padding: "8px 16px",
            alignItems: "center",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <button
            onClick={handlePrev}
            disabled={location?.atStart}
            style={navBtnStyle}
          >
            ← Prev
          </button>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              fontWeight: 500,
              minWidth: 80,
              textAlign: "center",
            }}
          >
            {location
              ? `${location.start.displayed.page} / ${location.start.displayed.total}`
              : ""}
          </span>
          <button
            onClick={handleNext}
            disabled={location?.atEnd}
            style={navBtnStyle}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
});

export default EpubViewer;
