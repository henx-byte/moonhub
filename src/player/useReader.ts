import { useState } from "react";

// Reader bukan audio/video player, tapi manga reader
// Tetap dibikin hook biar konsisten 4 player

export type ReaderPage = string;

export function useReader() {
  const [currentManga, setCurrentManga] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  const open = (manga:any, pagesList:string[], startPage=0) => {
    try {
      (globalThis as any).__STOP_MP3__?.();
      (globalThis as any).__STOP_HLS__?.();
      (globalThis as any).__STOP_WEBVIEW__?.();
    } catch {}
    setCurrentManga(manga);
    setPages(pagesList);
    setCurrentPage(startPage);
  };

  const close = () => {
    setCurrentManga(null);
    setPages([]);
    setCurrentPage(0);
  };

  return { currentManga, pages, currentPage, setCurrentPage, open, close, type: 'reader' as const };
}
