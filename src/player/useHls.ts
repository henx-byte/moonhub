import { useState, useEffect } from "react";
import { useVideoPlayer } from "expo-video";
import { MediaItem } from "../types";

export function useHls() {
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer("", (p) => {
    p.loop = false;
    p.staysActiveInBackground = true;
    p.showNowPlayingNotification = true;
    try { (p as any).allowsExternalPlayback = true; } catch {}
  });

  useEffect(() => {
    const s1 = player.addListener("playingChange", (e:any) => {
      const playing = typeof e === "boolean" ? e : !!e?.isPlaying;
      setIsPlaying(playing);
    });
    const s2 = player.addListener("statusChange", (e:any) => {
      const d = e?.status?.duration || e?.duration;
      if (d) setDuration(d);
    });
    const s3 = player.addListener("timeUpdate", (e:any) => {
      if (e?.currentTime !== undefined) setPosition(e.currentTime);
    });
    (globalThis as any).__STOP_HLS__ = () => { try { player.pause(); setIsPlaying(false); } catch {} };
    return () => { s1?.remove?.(); s2?.remove?.(); s3?.remove?.(); };
  }, []);

  const play = async (item: MediaItem) => {
    try {
      (globalThis as any).__STOP_MP3__?.();
      (globalThis as any).__STOP_WEBVIEW__?.();
    } catch {}
    setCurrent(item);
    try {
      const p: any = player;
      if (p.replaceAsync) await p.replaceAsync(item.uri);
      else p.replace(item.uri);
      player.play();
    } catch (e) { console.log("[HLS] play error", e); }
  };

  const pause = () => { try { player.pause(); } catch {} };
  const resume = () => { try { player.play(); } catch {} };
  const toggle = () => isPlaying ? pause() : resume();
  const seek = (sec:number) => { try { (player as any).currentTime = sec; } catch {} };
  const stop = () => { try { player.pause(); setCurrent(null); setIsPlaying(false); } catch {} };

  return { current, isPlaying, position, duration, player, play, pause, resume, toggle, seek, stop, type: 'hls' as const };
}
