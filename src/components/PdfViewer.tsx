import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  TextLayer,
  type PDFDocumentLoadingTask,
  type RenderTask,
} from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { loadBookBytes } from "../services/bookStorage";
import "./pdfTextLayer.css";

if (
  typeof ReadableStream === "function" &&
  typeof (ReadableStream.prototype as any)[Symbol.asyncIterator] !== "function"
) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] = async function* () {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

GlobalWorkerOptions.workerPort = new PdfWorker();

export type PdfViewerHandle = {
  clearHighlight: () => void;
};

type PdfViewerProps = {
  filePath: string | null;
  fontSize?: number;
  darkMode?: boolean;
  initialLocation?: string;
  onLocationChange?: (page: string) => void;
  onTextSelected?: (text: string, x: number, y: number, viewerWidth?: number) => void;
};

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

const PAGE_PADDING = 24;

const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  ({ filePath, fontSize, darkMode, initialLocation, onLocationChange, onTextSelected }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerDivRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<RenderTask | null>(null);
    const textLayerInstanceRef = useRef<any>(null);
    const pdfTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [resizeCounter, setResizeCounter] = useState(0);
    const [initialized, setInitialized] = useState(false);
    const containerSizeRef = useRef({ width: 0, height: 0 });
    const loadedPathRef = useRef<string | null>(null);

    const darkModeRef = useRef(darkMode);
    darkModeRef.current = darkMode;
    const fontSizeRef = useRef(fontSize ?? 100);
    fontSizeRef.current = fontSize ?? 100;
    const onLocationChangeRef = useRef(onLocationChange);
    onLocationChangeRef.current = onLocationChange;
    const onTextSelectedRef = useRef(onTextSelected);
    onTextSelectedRef.current = onTextSelected;

    useImperativeHandle(ref, () => ({
      clearHighlight: () => {
        window.getSelection()?.removeAllRanges();
        textLayerDivRef.current?.querySelectorAll<HTMLElement>(".hl").forEach((el) => el.classList.remove("hl"));
      },
    }));

    useEffect(() => {
      const el = viewerRef.current;
      if (!el) return;
      let cancelled = false;
      const obs = new ResizeObserver(([entry]) => {
        if (cancelled) return;
        const { width, height } = entry.contentRect;
        containerSizeRef.current = { width, height };
        if (pdfTaskRef.current) {
          setResizeCounter((c) => c + 1);
        } else {
          setInitialized(true);
        }
      });
      obs.observe(el);
      return () => {
        cancelled = true;
        obs.disconnect();
      };
    }, []);

    const loadPdf = useCallback(async (fp: string, initialLocation?: string) => {
      let fileBytes;
      try {
        fileBytes = await loadBookBytes(fp);
      } catch {
        return;
      }

      const pdf = await getDocument({ data: fileBytes.slice() });
      pdfTaskRef.current = pdf;
      const doc = await pdf.promise;
      setNumPages(doc.numPages);
      const saved = parseInt(initialLocation ?? "", 10);
      const page = Number.isFinite(saved) && saved >= 1 ? Math.min(saved, doc.numPages) : 1;
      setCurrentPage(page);
    }, []);

    useEffect(() => {
      if (!filePath) return;
      if (!initialized) return;

      const fp: string = filePath;
      if (loadedPathRef.current === fp) return;
      loadedPathRef.current = fp;

      let cancelled = false;

      (async () => {
        await loadPdf(fp, initialLocation);
        if (cancelled) return;
      })();

      return () => {
        cancelled = true;
        loadedPathRef.current = null;
      };
    }, [filePath, initialized, loadPdf]);

    useEffect(() => {
      return () => {
        textLayerInstanceRef.current?.cancel?.();
        renderTaskRef.current?.cancel?.();
        pdfTaskRef.current?.destroy?.();
        pdfTaskRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!pdfTaskRef.current) return;
      if (numPages === 0) return;
      const task = pdfTaskRef.current;
      const size = containerSizeRef.current;
      const canvas = canvasRef.current;
      const textLayerDiv = textLayerDivRef.current;
      if (!canvas || !textLayerDiv || !size.width) return;

      let cancelled = false;

      (async () => {
        try {
          const pdf = await task.promise;
          if (cancelled) return;
          const page = await pdf.getPage(currentPage);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const availWidth = Math.max(size.width - PAGE_PADDING * 2, 100);
          const fitScale = availWidth / baseViewport.width;
          const zoom = fontSizeRef.current / 100;
          const scale = Math.max(fitScale * zoom, 0.5);
          const viewport = page.getViewport({ scale });
          console.log(
            `[PdfViewer] render page=${currentPage} size=${size.width}x${size.height} scale=${scale.toFixed(3)}`,
          );

          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.background = darkModeRef.current ? "#0b0d14" : "#ffffff";

          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.setProperty("--scale-factor", String(scale));
          textLayerDiv.innerHTML = "";

          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const renderTask = page.render({
            canvas,
            canvasContext: ctx,
            viewport,
            ...(darkModeRef.current
              ? { pageColors: { background: "#0b0d14", foreground: "#e2e8f0" } }
              : {}),
          });
          renderTaskRef.current?.cancel?.();
          renderTaskRef.current = renderTask;
          await renderTask.promise;
          if (cancelled) return;

          const textContent = await page.getTextContent();
          if (cancelled) return;
          console.log("[PdfViewer] getTextContent items:", textContent.items.length);
          textLayerInstanceRef.current?.cancel?.();
          textLayerInstanceRef.current = new TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayerInstanceRef.current.render();
          if (cancelled) return;
          const spans = textLayerDiv.querySelectorAll("span").length;
          const first = textLayerDiv.querySelector("span");
          const fs = first ? getComputedStyle(first).fontSize : "n/a";
          const cw = first ? getComputedStyle(first).width : "n/a";
          console.log(
            `[PdfViewer] textLayer spans=${spans} firstFontSize=${fs} firstWidth=${cw} tlWidth=${textLayerDiv.style.width} tlHeight=${textLayerDiv.style.height}`,
          );
        } catch (err) {
          console.error("[PdfViewer] text layer render failed:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [currentPage, numPages, resizeCounter, darkMode, fontSize]);

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setCurrentPage((p) => Math.max(1, p - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setCurrentPage((p) => Math.min(numPages || 1, p + 1));
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [numPages]);

    useEffect(() => {
      if (currentPage >= 1 && numPages >= 1) {
        onLocationChangeRef.current?.(String(currentPage));
      }
    }, [currentPage, numPages]);

    const handleMouseUp = useCallback(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || !sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const viewerWidth = viewerRef.current?.clientWidth ?? 0;
      onTextSelectedRef.current?.(text, rect.x, rect.y, viewerWidth);
    }, []);

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <div
          ref={viewerRef}
          onMouseUp={handleMouseUp}
          style={{
            flex: 1,
            position: "relative",
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            padding: `${PAGE_PADDING}px`,
            boxSizing: "border-box",
          }}
        >
          <div
            className="charlingo-pdf"
            style={{
              position: "relative",
              alignSelf: "flex-start",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
            }}
          >
            <canvas ref={canvasRef} style={{ display: "block" }} />
            <div ref={textLayerDivRef} className="textLayer" />
          </div>
        </div>
        {filePath && numPages > 0 && (
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
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
              {numPages > 0 ? `${currentPage} / ${numPages}` : ""}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages || 1, p + 1))}
              disabled={numPages > 0 && currentPage >= numPages}
              style={navBtnStyle}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  },
);

export default PdfViewer;
