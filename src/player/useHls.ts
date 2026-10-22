// src/player/useHls.ts - FULL LENGKAP UNTUK expo-video (tinggal copas)
import { useRef, useState, useCallback, useEffect } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';

export function useHls() {
  const playerRef = useRef<VideoPlayer | null>(null);
  const [current, setCurrent] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const player = useVideoPlayer('', (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    playerRef.current = player;

    const subStatus = player.addListener('statusChange', (payload: any) => {
      const status = payload?.status || payload;
      console.log('[Hls expo-video] status:', status);
      if (status === 'loading' || status?.status === 'loading') {
        setIsBuffering(true);
      } else if (status === 'readyToPlay' || status?.status === 'readyToPlay') {
        setIsBuffering(false);
      } else if (status === 'error') {
        setIsBuffering(false);
        setIsPlaying(false);
      }
    });

    const subPlaying = player.addListener('playingChange', (playing: boolean) => {
      console.log('[Hls expo-video] playing:', playing);
      setIsPlaying(playing);
      if (playing) setIsBuffering(false);
    });

    let subBuffering: any = null;
    try {
      // @ts-ignore SDK 52+
      subBuffering = player.addListener('isBufferingChange', (b: boolean) => {
        console.log('[Hls expo-video] buffering:', b);
        setIsBuffering(b);
      });
    } catch {}

    return () => {
      subStatus?.remove();
      subPlaying?.remove();
      subBuffering?.remove?.();
    };
  }, [player]);

  const play = useCallback(async (item: any) => {
    try {
      setCurrent(item);
      setIsBuffering(true);
      setIsPlaying(false);
      console.log('[Hls expo-video] Loading:', item.uri);
      if (playerRef.current) {
        // @ts-ignore
        if (playerRef.current.replaceAsync) {
          // @ts-ignore
          playerRef.current.replaceAsync(item.uri);
        } else {
          // @ts-ignore
          playerRef.current.src = item.uri;
        }
        playerRef.current.play();
      }
    } catch (e) {
      console.log('[Hls] Play error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      playerRef.current?.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    } catch {}
  }, []);

  const resume = useCallback(async () => {
    try {
      setIsBuffering(true);
      playerRef.current?.play();
    } catch {}
  }, []);

  const stop = useCallback(async () => {
    try {
      playerRef.current?.pause();
      setCurrent(null);
      setIsPlaying(false);
      setIsBuffering(false);
    } catch {}
  }, []);

  return {
    current,
    isPlaying,
    isBuffering,
    play,
    pause,
    resume,
    stop,
    player,
  };
}
