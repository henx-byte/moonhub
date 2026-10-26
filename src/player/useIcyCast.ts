import { useState, useRef, useCallback, useEffect } from "react";

function parseIcy(raw: string, fallback = "Live") {
  const c = raw.trim();
  if (c.includes(" - ")) {
    const [a, ...rest] = c.split(" - ");
    return { title: rest.join(" - ").trim(), artist: a.trim(), raw: c };
  }
  return { title: c, artist: fallback, raw: c };
}

export function useIcyCast() {
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{ title: string; artist: string; raw: string } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<any>(null);
  const uriRef = useRef<string | null>(null);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const handleRaw = useCallback((raw: string) => {
    if (!raw) return;
    const p = parseIcy(raw, "Live");
    setNowPlaying(p.raw);
    setParsed(p);
  }, []);

  const fetchStatusJson = useCallback(async (uri: string) => {
    try {
      const base = uri.split("/").slice(0, 3).join("/");
      const res = await fetch(`${base}/status-json.xsl`, { headers: { "Cache-Control": "no-cache" } });
      if (!res.ok) return;
      const json = await res.json();
      const src = Array.isArray(json?.icestats?.source) ? json.icestats.source[0] : json?.icestats?.source;
      if (src?.title) handleRaw(src.title);
    } catch {}
  }, [handleRaw]);

  const play = useCallback((uri: string) => {
    if (!uri) return;
    uriRef.current = uri;
    clearAll();
    setIsPolling(true);
    console.log("[IcyCast] PLAY", uri.slice(0,60));
    fetchStatusJson(uri);
    intervalRef.current = setInterval(() => fetchStatusJson(uri), 10000);
  }, [clearAll, fetchStatusJson]);

  const pause = useCallback(() => {
    console.log("[IcyCast] PAUSE");
    clearAll();
  }, [clearAll]);

  const resume = useCallback(() => {
    if (uriRef.current) play(uriRef.current);
  }, [play]);

  const stop = useCallback(() => {
    console.log("[IcyCast] STOP");
    clearAll();
    setNowPlaying(null);
    setParsed(null);
    uriRef.current = null;
  }, [clearAll]);

  useEffect(() => () => clearAll(), [clearAll]);

  return { nowPlaying, parsed, isPolling, play, pause, resume, stop };
}