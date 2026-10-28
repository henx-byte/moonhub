import { useRef, useState, useCallback, useEffect } from "react";
import { useVideoPlayer, VideoPlayer, VideoSource } from "expo-video";
import { useEventListener } from "expo";
import { useIcyCast } from "./useIcyCast";

type PlayOpts = { useIcy?: boolean };

export function useHls() {
  const playerRef = useRef<VideoPlayer | null>(null);
  const currentRef = useRef<any | null>(null);
  const useIcyRef = useRef(false);
  const [current, setCurrent] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const icyCast = useIcyCast();

  const player: any = useVideoPlayer(null as any, (p: any) => {
    p.loop = true;
    p.muted = false;
    p.showNowPlayingNotification = true;
  });

  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEventListener(player, "statusChange", ({ status, error }: any) => {
    if (!currentRef.current && status === "error") {
      setIsBuffering(false);
      setIsPlaying(false);
      return;
    }
    if (status === "loading") setIsBuffering(true);
    if (status === "readyToPlay") setIsBuffering(false);
    if (status === "error") {
      console.log("Player error:", error?.message);
      if (currentRef.current) {
        setIsBuffering(false);
        setIsPlaying(false);
      }
    }
  });

  useEventListener(player, "playingChange", (v: boolean) => setIsPlaying(v));

  const play = useCallback(
    async (item: any, opts: PlayOpts = {}) => {
      const uri = item?.uri;
      if (!uri) return;
      const useIcy = opts.useIcy ?? false;
      useIcyRef.current = useIcy;

      setCurrent(item);
      currentRef.current = item;
      setIsBuffering(true);

      if (useIcy) icyCast.play(uri);
      else icyCast.stop();

      const source: VideoSource = {
        uri,
        metadata: {
          title: item?.title || "Unknown",
          artist: "Unknown",
          artwork:
            item?.thumbnail ||
            "https://raw.githubusercontent.com/henx-byte/moonhub/refs/heads/main/assets/icon.png"
        },
        headers: { "Icy-MetaData": "1" }
      };

      try {
        await (playerRef.current as any).replaceAsync?.(source);
        playerRef.current?.play();
      } catch (e) {
        console.log("[Hls] play error", e);
        setIsBuffering(false);
      }
    },
    [icyCast]
  );

  const pause = useCallback(async () => {
    try {
      playerRef.current?.pause();
      if (useIcyRef.current) icyCast.pause();
    } catch {}
  }, [icyCast]);

  const resume = useCallback(async () => {
    try {
      playerRef.current?.play();
      if (useIcyRef.current) icyCast.resume();
    } catch {}
  }, [icyCast]);

  const stop = useCallback(async () => {
    try {
      playerRef.current?.pause();
      icyCast.stop();
      setCurrent(null);
      currentRef.current = null;
      setIsBuffering(false);
      setIsPlaying(false);
      useIcyRef.current = false;
    } catch {}
  }, [icyCast]);

  return {
    current,
    isPlaying,
    isBuffering,
    nowPlaying: icyCast.nowPlaying,
    parsed: icyCast.parsed,
    play,
    pause,
    resume,
    stop,
    player
  };
}
