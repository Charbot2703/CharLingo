import { useEffect, useState } from "react";
import { loadCoverBytes } from "../services/bookStorage";
import { type LibraryBook } from "../hooks/useLibrary";

type LibraryProps = {
  books: LibraryBook[];
  onOpenBook: (book: LibraryBook) => void;
  onRemoveBook: (id: string) => void;
};

const COLORS = ["#f97316", "#d97706", "#f43f5e", "#14b8a6", "#eab308", "#f87171"];

function CoverImage({ coverPath }: { coverPath?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!coverPath) return;
    let cancelled = false;
    (async () => {
      try {
        const bytes = await loadCoverBytes(coverPath);
        if (cancelled) return;
        const blob = new Blob([bytes.slice().buffer]);
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
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
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
    >
      <div onClick={() => onOpenBook(book)}>
        <div
          style={{
            height: 200,
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
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
        <div style={{ padding: "10px 12px 12px", textAlign: "left" }}>
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
              color: "var(--text-secondary)",
              marginTop: 3,
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

function Library({ books, onOpenBook, onRemoveBook }: LibraryProps) {
  if (books.length === 0) {
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
        <div style={{ fontSize: 48, opacity: 0.3 }}>📚</div>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 300, lineHeight: 1.5 }}>
          No books yet. Open an EPUB or PDF file to add it to your library.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 20,
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
