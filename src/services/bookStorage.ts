import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, remove, BaseDirectory } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { type LibraryBook } from "../hooks/useLibrary";
import { type Flashcard } from "../hooks/useFlashcards";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function basename(path: string): string {
  const parts = path.replace(/[/\\]$/, "").split(/[/\\]/);
  return parts[parts.length - 1];
}

function friendlyName(path: string): string | null {
  const decoded = decodeURIComponent(basename(path)).replace(/\.[^.]+$/, "");
  const cleaned = decoded.replace(/^(primary|msf|document|downloads|external)[:%][^/]*$/i, "");
  if (cleaned && !/^document%|%3A/.test(cleaned)) return cleaned;
  return null;
}

type PickedFile = { name: string; bytes: Uint8Array };

export async function pickBook(): Promise<PickedFile | null> {
  if (isTauri()) {
    const file = await open({
      filters: [{ name: "Books", extensions: ["epub", "pdf"] }],
    });
    if (typeof file !== "string") return null;
    const bytes = await readFile(file);
    let name = basename(file);
    if (/^content:\/\//i.test(file)) {
      try {
        const display = await invoke<string | null>("get_display_name", { uri: file });
        if (display && display.trim()) name = display;
        else {
          const friendly = friendlyName(file);
          if (friendly) name = friendly;
        }
      } catch {
        const friendly = friendlyName(file);
        if (friendly) name = friendly;
      }
    }
    return { name, bytes };
  }
  return pickWebFile(".epub,application/epub+zip,.pdf,application/pdf");
}

function pickWebFile(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    let settled = false;
    const finish = (v: PickedFile | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      resolve(v);
    };
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 200);
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      const buf = await file.arrayBuffer();
      finish({ name: file.name, bytes: new Uint8Array(buf) });
    };
    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}

export async function saveBookBytes(id: string, bytes: Uint8Array): Promise<void> {
  if (isTauri()) {
    await writeFile(id, bytes, { baseDir: BaseDirectory.AppData });
    return;
  }
  await idbPut("books", id, bytes);
}

export async function loadBookBytes(id: string): Promise<Uint8Array> {
  if (isTauri()) {
    try {
      return await readFile(id, { baseDir: BaseDirectory.AppData });
    } catch {
      return await readFile(id);
    }
  }
  return idbGet("books", id);
}

export async function deleteBookBytes(id: string): Promise<void> {
  if (isTauri()) {
    try {
      await remove(id, { baseDir: BaseDirectory.AppData });
    } catch {}
    return;
  }
  await idbDelete("books", id);
}

export async function saveCoverBytes(id: string, bytes: Uint8Array): Promise<void> {
  if (isTauri()) {
    await writeFile(id, bytes, { baseDir: BaseDirectory.AppData });
    return;
  }
  await idbPut("covers", id, bytes);
}

export async function loadCoverBytes(id: string): Promise<Uint8Array> {
  if (isTauri()) {
    return await readFile(id, { baseDir: BaseDirectory.AppData });
  }
  return idbGet("covers", id);
}

export async function deleteCover(id: string): Promise<void> {
  if (isTauri()) {
    try {
      await remove(id, { baseDir: BaseDirectory.AppData });
    } catch {}
    return;
  }
  await idbDelete("covers", id);
}

export async function exportLibrary(books: LibraryBook[], flashcards: Flashcard[]): Promise<string> {
  const bookFiles: Record<string, string> = {};
  const coverFiles: Record<string, string> = {};

  for (const book of books) {
    try {
      bookFiles[book.filePath] = bytesToBase64(await loadBookBytes(book.filePath));
    } catch {}
    if (book.coverPath) {
      try {
        coverFiles[book.coverPath] = bytesToBase64(await loadCoverBytes(book.coverPath));
      } catch {}
    }
  }

  return JSON.stringify({
    app: "charlingo",
    version: 1,
    books: books.map((b) => ({
      id: b.id,
      filePath: b.filePath,
      title: b.title,
      author: b.author,
      coverPath: b.coverPath,
      lastLocation: b.lastLocation,
      addedAt: b.addedAt,
      lastReadAt: b.lastReadAt,
    })),
    flashcards: flashcards.map((c) => ({
      id: c.id,
      original: c.original,
      translation: c.translation,
      sourceTitle: c.sourceTitle,
      createdAt: c.createdAt,
      correctCount: c.correctCount,
      attemptCount: c.attemptCount,
    })),
    bookFiles,
    coverFiles,
  });
}

export type ImportedData = {
  books: LibraryBook[];
  flashcards: Flashcard[];
};

export async function importLibrary(json: string): Promise<ImportedData> {
  const data = JSON.parse(json) as {
    app?: string;
    version?: number;
    books?: LibraryBook[];
    flashcards?: Flashcard[];
    bookFiles?: Record<string, string>;
    coverFiles?: Record<string, string>;
  };

  if (data.app !== "charlingo" || data.version !== 1 || !Array.isArray(data.books)) {
    throw new Error("Unrecognized CharLingo library file");
  }

  for (const [id, b64] of Object.entries(data.bookFiles ?? {})) {
    await saveBookBytes(id, base64ToBytes(b64));
  }
  for (const [id, b64] of Object.entries(data.coverFiles ?? {})) {
    await saveCoverBytes(id, base64ToBytes(b64));
  }

  return { books: data.books, flashcards: data.flashcards ?? [] };
}

export async function saveLibraryFile(json: string): Promise<void> {
  if (isTauri()) {
    const target = await save({
      defaultPath: "charlingo-library.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof target !== "string") return;
    await writeFile(target, new TextEncoder().encode(json));
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "charlingo-library.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function pickLibraryFile(): Promise<string | null> {
  if (isTauri()) {
    const file = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof file !== "string") return null;
    const bytes = await readFile(file);
    return new TextDecoder().decode(bytes);
  }
  const picked = await pickWebFile(".json,application/json");
  if (!picked) return null;
  return new TextDecoder().decode(picked.bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("charlingo", 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("books")) d.createObjectStore("books");
        if (!d.objectStoreNames.contains("covers")) d.createObjectStore("covers");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function idbPut(store: string, key: string, bytes: Uint8Array): Promise<void> {
  return db().then(
    (d) =>
      new Promise<void>((resolve, reject) => {
        const tx = d.transaction(store, "readwrite");
        tx.objectStore(store).put(bytes.slice().buffer, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

function idbGet(store: string, key: string): Promise<Uint8Array> {
  return db().then(
    (d) =>
      new Promise<Uint8Array>((resolve, reject) => {
        const tx = d.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => {
          if (!req.result) {
            reject(new Error(`Not found in ${store}: ${key}`));
            return;
          }
          resolve(new Uint8Array(req.result as ArrayBuffer));
        };
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbDelete(store: string, key: string): Promise<void> {
  return db().then(
    (d) =>
      new Promise<void>((resolve, reject) => {
        const tx = d.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}
