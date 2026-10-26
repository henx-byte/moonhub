import React, { createContext, useContext, useMemo, useCallback, useState, useRef } from "react";
import { useHlsPlayer } from "./HlsContext";
import { useMp3Player } from "./Mp3Context";

type PlayOptions = { useIcy?: boolean };
const PlayerCore = createContext<any>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const hls = useHlsPlayer();
  const mp3 = useMp3Player();
  const [activeType, setActiveType] = useState<"hls" | "mp3" | null>(null);
  const lastOptsRef = useRef<PlayOptions>({ useIcy: false });

  const current = useMemo(() => {
    if (activeType === "hls") return hls?.current || null;
    if (activeType === "mp3") return mp3?.current || null;
    return hls?.current || mp3?.current || null;
  }, [activeType, hls?.current, mp3?.current]);

  const isPlaying = useMemo(() => {
    if (activeType === "hls") return !!hls?.isPlaying;
    if (activeType === "mp3") return !!mp3?.isPlaying;
    return !!(hls?.isPlaying || mp3?.isPlaying);
  }, [activeType, hls?.isPlaying, mp3?.isPlaying]);

  const isBuffering = useMemo(() => {
    if (activeType === "hls") return !!hls?.isBuffering;
    if (activeType === "mp3") return !!(mp3 as any)?.isBuffering;
    return !!(hls?.isBuffering || (mp3 as any)?.isBuffering);
  }, [activeType, hls?.isBuffering, mp3]);

  const nowPlaying = useMemo(() => hls?.nowPlaying || mp3?.nowPlaying || null, [hls?.nowPlaying, mp3?.nowPlaying]);
  const parsed = useMemo(() => hls?.parsed || mp3?.parsed || null, [hls?.parsed, mp3?.parsed]);

  const play = useCallback(async (item: any, options: PlayOptions = {}) => {
    const opts = { useIcy: false, ...options }; // default false
    lastOptsRef.current = opts;
    try {
      if (["video"].includes(item?.type)) {
        setActiveType("hls");
        try { await mp3?.pause?.(); } catch {}
        return hls?.play?.(item, opts);
      }
      if (["mp3", "radio"].includes(item?.type)) {
        setActiveType("mp3");
        try { await hls?.pause?.(); } catch {}
        return mp3?.play?.(item, undefined, opts);
      }
    } catch (e) { console.log("play error: " + e); }
  }, [hls, mp3]);

  const pause = useCallback(() => { hls?.pause?.(); mp3?.pause?.(); }, [hls, mp3]);
  const resume = useCallback(() => {
    const opts = lastOptsRef.current;
    if (activeType === "hls" && hls?.current) return hls?.resume?.(opts);
    if (activeType === "mp3" && mp3?.current) return mp3?.resume?.(opts);
    if (hls?.current) return hls?.resume?.(opts);
    if (mp3?.current) return mp3?.resume?.(opts);
  }, [activeType, hls, mp3]);

  const value = useMemo(() => ({
    current, isPlaying, isBuffering, nowPlaying, parsed, play, pause, resume, hls, mp3, activeType
  }), [current, isPlaying, isBuffering, nowPlaying, parsed, play, pause, resume, hls, mp3, activeType]);

  return <PlayerCore.Provider value={value}>{children}</PlayerCore.Provider>;
}

export const Player = PlayerProvider;
export const useCorePlayer = () => {
  const ctx = useContext(PlayerCore);
  if (!ctx) throw new Error("useCorePlayer must be inside <PlayerProvider>");
  return ctx;
};
export const useUnifiedPlayer = useCorePlayer;