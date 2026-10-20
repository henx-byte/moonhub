import { useState } from "react";
import { MediaItem } from "../types";

export function useWebView() {
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const play = async (item: MediaItem) => {
    try {
      (globalThis as any).__STOP_MP3__?.();
      (globalThis as any).__STOP_HLS__?.();
    } catch {}
    setCurrent(item);
    setFallbackUrl(item.uri);
    setIsPlaying(true);
  };

  const stop = () => {
    setFallbackUrl(null);
    setIsPlaying(false);
    setCurrent(null);
  };

  (globalThis as any).__STOP_WEBVIEW__ = stop;

  return { current, isPlaying, fallbackUrl, play, stop, type: 'webview' as const };
}
