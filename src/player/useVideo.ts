import { useState, useEffect, useRef } from "react";
import { useVideoPlayer } from "expo-video";
import { MediaItem } from "../types";
import {useEvent} from "expo"

export function useVideo() {
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer("", (p) => {
    p.loop = true;
    p.staysActiveInBackground = true; 
    p.showNowPlayingNotification = true;
    p.allowsExternalPlayback = true;
  });

 

  useEffect(() => {
    // cuma pake listener, jangan akses player.duration langsung
    const sub1 = player.addListener("playingChange", (e: any) => {
      const playing = typeof e === "boolean" ? e : e?.isPlaying ?? false;
      setIsPlaying(!!playing);
    });
    const sub2 = player.addListener("statusChange", (payload: any) => {
      if (payload?.duration) setDuration(payload.duration);
      if (payload?.currentTime !== undefined) setPosition(payload.currentTime);
      if (payload?.status?.duration) setDuration(payload.status.duration);
    });
    const sub3 = player.addListener("timeUpdate", (e: any) => {
      if (e?.currentTime !== undefined) setPosition(e.currentTime);
    });

    return () => {
      sub1?.remove?.();
      sub2?.remove?.();
      sub3?.remove?.();
    };
  }, [player]);

 
 

  const play = async (item: MediaItem) => {
    setCurrent(item);
   console.log("=== [EXPO VIDEO SETUP] ===")
    try {
      const p: any = player;
      if (p.replaceAsync) await p.replaceAsync(item.uri);
      else p.replace(item.uri);
      player.play();
    } catch (e) {
      console.log("[Video] play error", e);
    }
  };

  const pause = () => { try { player.pause(); } catch {} };
  const resume = () => { try { player.play(); } catch {} };
  const toggle = () => isPlaying ? pause() : resume();
  const seek = (sec: number) => {
    try { (player as any).currentTime = sec; } catch {}
  };
  const stop = () => { try { player.pause(); setCurrent(null); } catch {} };

  return { current, isPlaying, position, duration, player, play, pause, resume, toggle, seek, stop, playerType: 'video' as const };
}