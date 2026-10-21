import { useState } from "react";

// Reader bukan audio/video player, tapi book reader
// Tetap dibikin hook biar konsisten 4 player

export type ReaderPage = string;

export function useReader() {
  const [currentManga, setCurrentBook] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  const open = (book:any, pagesList:string[], startPage=0) => {
    try {
      (globalThis as any).__STOP_MP3__?.();
      (globalThis as any).__STOP_HLS__?.();
      (globalThis as any).__STOP_WEBVIEW__?.();
    } catch {}
    setCurrentBook(book);
    setPages(pagesList);
    setCurrentPage(startPage);
  };

  const close = () => {
    setCurrentBook(null);
    setPages([]);
    setCurrentPage(0);
  };

  return { currentManga, pages, currentPage, setCurrentPage, open, close, type: 'reader' as const };
}
