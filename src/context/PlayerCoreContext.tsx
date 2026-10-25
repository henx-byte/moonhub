// src/context/PlayerCoreContext.tsx - FULL LENGKAP UNTUK expo-video
import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useHlsPlayer } from "./HlsContext";
import { useMp3Player } from "./Mp3Context";

const PlayerCore = createContext<any>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const hls = useHlsPlayer();
  const mp3 = useMp3Player();

  const current = hls?.current || mp3?.current || null;
  const isPlaying = !!(hls?.isPlaying || mp3?.isPlaying);
  const isBuffering = !!(hls?.isBuffering || (mp3 as any)?.isBuffering);

  const play = useCallback(
    async (item: any) => {
      try {
        if (["video"].includes(item?.type)) {
          try {
            await mp3?.pause?.();
          } catch {}
          return hls?.play?.(item);
        } else if (["mp3","radio"].includes(item?.type)) {
          try {
            await hls?.pause?.();
          } catch {}
          return mp3?.play?.(item);
        } else {
           console.log("type tidak cocok");
        }
      } catch (error) {
        console.log("type tidak cocok: " + error);
      }
    },
    [hls, mp3],
  );

  const pause = useCallback(() => {
    hls?.pause?.();
    mp3?.pause?.();
  }, [hls, mp3]);

  const resume = useCallback(() => {
    if (hls?.current) return hls?.resume?.();
    if (mp3?.current) return mp3?.resume?.();
  }, [hls, mp3]);

  const value = useMemo(
    () => ({
      current,
      isPlaying,
      isBuffering,
      bufferingId: isBuffering ? current?.id || null : null,
      play,
      pause,
      resume,
      hls,
      mp3,
    }),
    [current, isPlaying, isBuffering, play, pause, resume, hls, mp3],
  );
  return <PlayerCore.Provider value={value}>{children}</PlayerCore.Provider>;
}

export const Player = PlayerProvider;
export const useCorePlayer = () => {
  const ctx = useContext(PlayerCore);
  if (!ctx) throw new Error("useCorePlayer must be inside <PlayerProvider>");
  return ctx;
};
export const useUnifiedPlayer = useCorePlayer;
