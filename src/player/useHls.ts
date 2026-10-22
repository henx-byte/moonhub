// src/player/useHls.ts - FIXED v2 handle master playlist
import { useRef, useState, useCallback, useEffect } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';

export function useHls() {
  const playerRef = useRef<VideoPlayer | null>(null);
  const [current, setCurrent] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  const player = useVideoPlayer('', (p:any) => {
    p.loop = false;
    p.muted = false;
    p.showNowPlayingNotification = true;
  });

  useEffect(() => {
    playerRef.current = player;
    const subStatus = player.addListener('statusChange', (payload: any) => {
      const status = payload?.status || payload;
      if (status === 'loading' || status?.status === 'loading') setIsBuffering(true);
      else if (status === 'readyToPlay' || status?.status === 'readyToPlay') setIsBuffering(false);
      else if (status === 'error') { setIsBuffering(false); setIsPlaying(false); }
    });
    const subPlaying = player.addListener('playingChange', (playing: boolean) => {
      setIsPlaying(playing);
      if (playing) setIsBuffering(false);
    });
    return () => { subStatus?.remove(); subPlaying?.remove(); };
  }, [player]);

  // === FIX POLLING - HANDLE MASTER PLAYLIST ===
  useEffect(() => {
    if (!current?.uri) return;
    if (!current.uri.includes('m3u8')) return;

    console.log('[HLS] start polling metadata for:', current.uri);

    const getBaseUrl = (url: string) => {
      return url.substring(0, url.lastIndexOf('/') + 1);
    };

    const poll = async () => {
      try {
        // 1. fetch master.m3u8
        const res1 = await fetch(current.uri, { headers: { 'Cache-Control': 'no-cache' } });
        const masterText = await res1.text();
        console.log('[HLS MASTER RAW] ===\n', masterText.slice(0,800), '\n=== END MASTER');

        let mediaUrl = current.uri;

        // cek apakah master (ada EXT-X-STREAM-INF)
        if (masterText.includes('#EXT-X-STREAM-INF')) {
          // ambil line chunklist_xxx.m3u8
          const lines = masterText.split('\n');
          let chunkFile = '';
          for (const l of lines) {
            const t = l.trim();
            if (t && !t.startsWith('#') && t.endsWith('.m3u8')) {
              chunkFile = t;
              break;
            }
          }
          if (chunkFile) {
            // resolve relative url
            if (chunkFile.startsWith('http')) mediaUrl = chunkFile;
            else mediaUrl = getBaseUrl(current.uri) + chunkFile;
            console.log('[HLS] resolved media playlist ->', mediaUrl);
          }
        }

        // 2. fetch media playlist (chunklist)
        if (mediaUrl !== current.uri || !masterText.includes('#EXT-X-STREAM-INF')) {
          // kalau mediaUrl masih master, tapi master gak ada STREAM-INF berarti dia sudah media playlist
          const res2 = mediaUrl === current.uri ? { text: async () => masterText } : await fetch(mediaUrl, { headers: { 'Cache-Control': 'no-cache' } });
          const mediaText = await res2.text();
          console.log('[HLS MEDIA RAW] ===\n', mediaText.slice(0,1500), '\n=== END MEDIA');

          // parse EXTINF untuk judul
          const mLines = mediaText.split('\n');
          for (const line of mLines) {
            if (line.startsWith('#EXTINF')) {
              const title = line.split(',').slice(1).join(',').trim();
              if (title && title.length > 1 && !title.includes('chunklist')) {
                if (title !== nowPlaying) {
                  console.log('[HLS NOW PLAYING] 🎵', title);
                  setNowPlaying(title);
                }
              }
            }
            // beberapa radio Noice / Gen FM simpan metadata di EXT-X-PROGRAM-DATE-TIME atau custom tag
            if (line.includes('#EXT-X-DATERANGE') || line.includes('TITLE=')) {
              console.log('[HLS CUSTOM TAG]', line);
            }
          }
        } else {
          // masih master, fetch lagi mediaUrl yang sudah di-resolve
          const res2 = await fetch(mediaUrl, { headers: { 'Cache-Control': 'no-cache' } });
          const mediaText = await res2.text();
          console.log('[HLS MEDIA RAW] ===\n', mediaText.slice(0,1500), '\n=== END MEDIA');
          const mLines = mediaText.split('\n');
          for (const line of mLines) {
            if (line.startsWith('#EXTINF')) {
              const title = line.split(',').slice(1).join(',').trim();
              if (title && title.length > 1) {
                console.log('[HLS NOW PLAYING] 🎵', title);
                setNowPlaying(title);
              }
            }
          }
        }

      } catch (e) {
        console.log('[HLS poll error]', e);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [current?.uri]);

  const play = useCallback(async (item: any) => {
    try {
      setCurrent(item);
      setIsBuffering(true);
      setIsPlaying(false);
      setNowPlaying(null);
      console.log('[Hls expo-video] Loading:', item.uri);
      if (playerRef.current) {
        // @ts-ignore
        if (playerRef.current.replaceAsync) await playerRef.current.replaceAsync(item.uri);
        else (playerRef.current as any).src = item.uri;
        playerRef.current.play();
      }
    } catch (e) {
      console.log('[Hls] Play error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(async () => { try { playerRef.current?.pause(); setIsPlaying(false); setIsBuffering(false); } catch {} }, []);
  const resume = useCallback(async () => { try { setIsBuffering(true); playerRef.current?.play(); } catch {} }, []);
  const stop = useCallback(async () => { try { playerRef.current?.pause(); setCurrent(null); setIsPlaying(false); setIsBuffering(false); setNowPlaying(null); } catch {} }, []);

  return { current, isPlaying, isBuffering, nowPlaying, play, pause, resume, stop, player };
}
