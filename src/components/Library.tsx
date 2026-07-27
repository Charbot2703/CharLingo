import { useEffect, useState } from "react";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { type LibraryBook } from "../hooks/useLibrary";

type LibraryProps = {
  books: LibraryBook[];
  onOpenBook: (book: LibraryBook) => void;
  onRemoveBook: (id: string) => void;
};

const COLORS = ["#c084fc", "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#f87171"];

function CoverImage({ coverPath }: { coverPath?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverPath) return;
    let cancelled = false;
    (async () => {
      try {
        const bytes = await readFile(coverPath, { baseDir: BaseDirectory.AppData });
        if (cancelled) return;
        const blob = new Blob([bytes]);
        setUrl(URL.createObjectURL(blob));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [coverPath]);

  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);

  if (url) {
    return (
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    );
  }
  return null;
}

function BookCard({ book, color, onOpenBook, onRemoveBook }: {
  book: LibraryBook;
  color: string;
  onOpenBook: (book: LibraryBook) => void;
  onRemoveBook: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--bg)",
        cursor: "pointer",
        boxShadow: hover ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div onClick={() => onOpenBook(book)}>
        <div
          style={{
            height: 200,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            color: "#fff",
            fontWeight: 700,
            userSelect: "none",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <CoverImage coverPath={book.coverPath} />
          {!book.coverPath && book.title.charAt(0).toUpperCase()}
        </div>
        <div style={{ padding: "8px 10px", textAlign: "left" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-h)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {book.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text)",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {book.author}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemoveBook(book.id); }}
        title="Remove from library"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.5)",
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

function Library({ books, onOpenBook, onRemoveBook }: LibraryProps) {
  if (books.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text)",
          fontSize: 16,
        }}
      >
        <p>No books yet. Open an EPUB to add it to your library.</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {books.map((book, i) => (
          <BookCard
            key={book.id}
            book={book}
            color={COLORS[i % COLORS.length]}
            onOpenBook={onOpenBook}
            onRemoveBook={onRemoveBook}
          />
        ))}
      </div>
    </div>
  );
}

export default Library;
