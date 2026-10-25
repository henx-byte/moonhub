// src/player/useIcecast.ts
import { useEffect, useState, useRef } from "react";

export function useIcecastMetadata(currentUri: string | null) {
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!currentUri) return;

    console.log(
      "[Icecast Filter] detected icecast, start polling:",
      currentUri,
    );
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchIcy = async () => {
      try {
        // Cara 1: coba header icy-title langsung (paling gampang)
        const res = await fetch(currentUri, {
          headers: { "Icy-MetaData": "1" },
          signal: controller.signal,
        } as any);

        const icyFromHeader =
          res.headers.get("icy-title") ||
          res.headers.get("Icy-Title") ||
          res.headers.get("x-audiotitle") ||
          (res.headers as any).get?.("icy-name");

        if (icyFromHeader) {
          console.log("[Icecast NOW PLAYING - header] 🎵", icyFromHeader);
          setNowPlaying(icyFromHeader);
        }

        // Cara 2: baca StreamTitle dari body (protokol Icecast asli)
        // Format: [audio bytes][1 byte = len*16][metadata string "StreamTitle='...';"]
        const reader = res.body?.getReader();
        if (!reader) return;

        const metaIntHeader =
          res.headers.get("icy-metaint") || res.headers.get("Icy-Metaint");
        const metaInt = metaIntHeader ? parseInt(metaIntHeader) : 8192;
        console.log("[Icecast] metaint:", metaInt);

        let bytesRead = 0;
        let buffer = new Uint8Array(0);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) break;

          // gabung buffer
          const newBuf = new Uint8Array(buffer.length + value.length);
          newBuf.set(buffer);
          newBuf.set(value, buffer.length);
          buffer = newBuf;
          bytesRead += value.length;

          // kalau sudah lewat metaint, cek metadata
          if (bytesRead >= metaInt + 1) {
            const metaLenByte = buffer[metaInt];
            const metaLen = metaLenByte * 16;
            if (metaLen > 0 && buffer.length >= metaInt + 1 + metaLen) {
              const metaBytes = buffer.slice(
                metaInt + 1,
                metaInt + 1 + metaLen,
              );
              const metaText = new TextDecoder().decode(metaBytes);
              console.log("[Icecast RAW META]", metaText);

              // parse StreamTitle='ERCAYALAH - ECOUTEZ';
              const match = metaText.match(/StreamTitle='([^']*)'/);
              if (match && match[1]) {
                console.log("[Icecast NOW PLAYING - stream] 🎵", match[1]);
                setNowPlaying(match[1]);
              }
              // reset buat next chunk
              buffer = buffer.slice(metaInt + 1 + metaLen);
              bytesRead = buffer.length;
            }
          }

          // jangan buffer kepanjangan, potong
          if (buffer.length > metaInt * 2) {
            buffer = buffer.slice(-metaInt);
            bytesRead = buffer.length;
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.log("[Icecast] poll error (akan retry 5s)", e.message);
          setTimeout(fetchIcy, 5000);
        }
      }
    };

    // Cara 3: fallback ke status-json.xsl (banyak server Icecast punya ini)
    const fetchStatusJson = async () => {
      try {
        const base = currentUri.split("/").slice(0, 3).join("/");
        const statusUrl = `${base}/status-json.xsl`;
        console.log("[Icecast] trying status json:", statusUrl);
        const res = await fetch(statusUrl);
        const json = await res.json();
        const title =
          json?.icestats?.source?.[0]?.title || json?.icestats?.source?.title;
        if (title) {
          console.log("[Icecast NOW PLAYING - status-json] 🎵", title);
          setNowPlaying(title);
        }
      } catch {}
    };

    fetchIcy();
    fetchStatusJson();
    const interval = setInterval(fetchStatusJson, 10000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [currentUri]);

  return nowPlaying;
}
