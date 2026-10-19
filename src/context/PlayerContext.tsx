// FIX FINAL seek mendal - timeout reset bikin balik, sekarang gak reset, tunggu sampai currentTime deket
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { VideoPlayer, useVideoPlayer, VideoView } from "expo-video";
import { MediaItem } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LoopMode = "off" | "all" | "one";

export const PlayerContext = createContext<any>({
  current: null, currentItem: null, isPlaying: false, player: null, queue: [], currentIndex: -1, loopMode: "all", shuffle: false,
  toggle: () => {}, stop: () => {}, play: async () => {}, playUrl: () => {}, pause: () => {}, resume: () => {}, seek: () => {}, playNext: () => {}, playPrev: () => {}, setLoopMode: () => {}, setShuffle: () => {}, duration: 0, position: 0,
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [originalQueue, setOriginalQueue] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loopMode, setLoopModeState] = useState<LoopMode>("all");
  const [shuffle, setShuffleState] = useState(false);
  const endedRef = useRef(false);
  const seekingRef = useRef(false);
  const seekTargetRef = useRef<number | null>(null);
  const queueRef = useRef<MediaItem[]>([]);
  const indexRef = useRef(-1);
  const loopRef = useRef<LoopMode>("all");
  const shuffleRef = useRef(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  const player = useVideoPlayer("", (p) => {
    p.loop = false;
    try { (p as any).staysActiveInBackground = true; (p as any).showNowPlayingNotification = true; } catch {}
  });

  useEffect(() => {
    AsyncStorage.getItem("player_settings_v3").then(s => {
      if (s) { try { const parsed = JSON.parse(s); if (parsed.loopMode) setLoopModeState(parsed.loopMode); if (typeof parsed.shuffle === "boolean") setShuffleState(parsed.shuffle); } catch {} }
    });
  }, []);

  const saveSettings = (ns: Partial<{ loopMode: LoopMode; shuffle: boolean }>) => {
    const settings = { loopMode, shuffle, ...ns };
    AsyncStorage.setItem("player_settings_v3", JSON.stringify(settings));
  };

  const setLoopMode = (mode: LoopMode) => { setLoopModeState(mode); saveSettings({ loopMode: mode }); };
  const setShuffle = (v: boolean) => {
    setShuffleState(v); saveSettings({ shuffle: v });
    if (v) {
      if (originalQueue.length === 0 && queue.length > 0) setOriginalQueue([...queue]);
      const cur = queue[currentIndex];
      if (!cur) return;
      const others = queue.filter((_, i) => i !== currentIndex);
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      setQueue([cur, ...shuffled]); setCurrentIndex(0);
    } else {
      if (originalQueue.length > 0) {
        const curId = queue[currentIndex]?.id || currentItem?.id;
        const idx = originalQueue.findIndex(q => q.id === curId || q.uri === currentItem?.uri);
        setQueue([...originalQueue]); setCurrentIndex(idx >= 0 ? idx : 0); setOriginalQueue([]);
      }
    }
  };

  const playNextInternal = () => {
    const q = queueRef.current;
    const idx = indexRef.current;
    const loop = loopRef.current;
    const shuf = shuffleRef.current;
    if (q.length === 0 || idx < 0) return;
    if (loop === "one") { seekInternal(0); resumeInternal(); return; }
    let nextIdx: number;
    if (shuf) {
      if (q.length <= 1) nextIdx = 0;
      else { const cand = q.map((_, i) => i).filter(i => i !== idx); nextIdx = cand[Math.floor(Math.random() * cand.length)]; }
    } else {
      nextIdx = idx + 1;
      if (nextIdx >= q.length) { if (loop === "all") nextIdx = 0; else { stopInternal(); return; } }
    }
    const nextItem = q[nextIdx];
    if (nextItem) { setCurrentIndex(nextIdx); endedRef.current = false; playInternal(nextItem); }
  };

  const playInternal = async (item: MediaItem) => {
    if (!item) return;
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    setCurrentItem(item);
    if (item.uri && player) {
      try {
        const p: any = player;
        try { p.staysActiveInBackground = true; p.showNowPlayingNotification = true; } catch {}
        if (p.replaceAsync) await p.replaceAsync(item.uri);
        else p.replace(item.uri);
        try { p.staysActiveInBackground = true; p.showNowPlayingNotification = true; } catch {}
        if (player) { player.play(); setIsPlaying(true); }
      } catch (e) { console.log("[Player] play error", e); setTimeout(() => playNextInternal(), 300); }
    }
  };

  // FIX: jangan timeout reset yang bikin mendal
  const seekInternal = (sec: number) => {
    console.log(`[Player] seekInternal to ${sec.toFixed(1)}`);
    seekingRef.current = true;
    seekTargetRef.current = sec;
    endedRef.current = false;
    setPosition(sec); // langsung update
    try {
      const p: any = player;
      if (p?.seek) p.seek(sec);
      // Fallback untuk content:// yang kadang seek gak update currentTime
      if (p?.currentTime !== undefined) {
        try { p.currentTime = sec; } catch {}
      }
    } catch (e) { console.log("[Player] seek error", e); }
    // GAK ADA TIMEOUT RESET - biar gak mendal
    // seeking akan selesai kalo currentTime deket target di interval
  };

  const resumeInternal = () => { try { if (player) { player.play(); setIsPlaying(true); } } catch {} };
  const stopInternal = () => { try { player?.pause(); } catch {} setIsPlaying(false); setCurrentItem(null); setQueue([]); setOriginalQueue([]); setCurrentIndex(-1); };

  async function play(item: MediaItem, newQueue?: MediaItem[]) {
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    if (newQueue && newQueue.length > 0) {
      let q = [...newQueue];
      const curIdx = q.findIndex(x => x.id === item.id || x.uri === item.uri);
      if (shuffle) {
        const cur = q[curIdx >= 0 ? curIdx : 0];
        const others = q.filter((_, i) => i !== (curIdx >= 0 ? curIdx : 0));
        q = [cur, ...others.sort(() => Math.random() - 0.5)];
        setOriginalQueue([...newQueue]); setQueue(q); setCurrentIndex(0);
      } else {
        setQueue(q); setOriginalQueue([]); setCurrentIndex(curIdx >= 0 ? curIdx : 0);
      }
    } else if (queue.length === 0) {
      setQueue([item]); setOriginalQueue([]); setCurrentIndex(0);
    } else {
      const idx = queue.findIndex(q => q.id === item.id || q.uri === item.uri);
      if (idx >= 0) setCurrentIndex(idx);
    }
    await playInternal(item);
  }

  async function playUrl(url: string, item?: any) {
    if (item && typeof item === "object" && (item as MediaItem).uri) { await play(item as MediaItem); return; }
    const titleFromUrl = url.split("/").pop() || "Stream";
    const safeItem: any = item;
    const mediaItem: MediaItem = { id: `url_${Date.now()}`, sourceId: safeItem?.sourceId || "url", name: safeItem?.name || titleFromUrl, title: safeItem?.title || titleFromUrl, path: url, uri: url, size: 0, mediaType: "music", type: "song" } as MediaItem;
    await play(mediaItem);
  }

  function pause() { try { if (player) { player.pause(); setIsPlaying(false); } } catch {} }
  function resume() { try { if (player) { player.play(); setIsPlaying(true); } } catch {} }
  function toggle() { if (isPlaying) pause(); else resume(); }
  function stop() { stopInternal(); }
  function seek(s: number) { seekInternal(s); }
  function playNext() { playNextInternal(); }
  function playPrev() {
    endedRef.current = false;
    if (position > 3) { seekInternal(0); return; }
    const q = queueRef.current; const idx = indexRef.current; const loop = loopRef.current;
    if (q.length === 0 || idx < 0) return;
    let prevIdx = idx - 1;
    if (prevIdx < 0) { if (loop === "all") prevIdx = q.length - 1; else prevIdx = 0; }
    const prevItem = q[prevIdx];
    if (prevItem) { setCurrentIndex(prevIdx); endedRef.current = false; playInternal(prevItem); }
  }

  useEffect(() => {
    const subPlaying = player?.addListener("playingChange", (p: any) => {
      const playing = typeof p === "boolean" ? p : p?.isPlaying ?? false;
      setIsPlaying(!!playing);
    });

    const subStatus = player?.addListener("statusChange", (payload: any) => {
      try {
        const didJustFinish = payload?.didJustFinish || payload?.status?.didJustFinish;
        const status = payload?.status || payload?.status?.status || payload;
        const statusStr = typeof status === "string" ? status : JSON.stringify(payload).slice(0,200);
        const isIdle = status === "idle" || payload?.status === "idle" || statusStr.includes("idle");
        if ((didJustFinish || isIdle) && !endedRef.current) {
          const p: any = player;
          const duration = p?.duration || 0;
          if ((isIdle || didJustFinish) && duration > 0) {
            endedRef.current = true;
            playNextInternal();
          }
        }
      } catch {}
    });

    // FIX MENDAL: kalo lagi seeking, jangan update position dari player, keep target
    intervalRef.current = setInterval(() => {
      try {
        const p: any = player;
        const currentTime = p?.currentTime;
        const durationVal = p?.duration;

        if (seekingRef.current && seekTargetRef.current !== null) {
          // Kalo masih seeking, cek apakah currentTime udah deket target
          if (currentTime !== undefined && !isNaN(currentTime)) {
            const diff = Math.abs(currentTime - seekTargetRef.current);
            if (diff < 1.5) {
              console.log(`[Player] Seek done target=${seekTargetRef.current.toFixed(1)} current=${currentTime.toFixed(1)} diff=${diff.toFixed(2)}`);
              seekingRef.current = false;
              seekTargetRef.current = null;
              setPosition(currentTime);
            } else {
              // Masih jauh, keep position di target biar gak mendal
              // Jangan return, tapi jangan update position dari currentTime
              if (durationVal && !isNaN(durationVal) && durationVal > 0) setDuration(durationVal);
              // Keep position di seekTargetRef, bukan currentTime
              if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
              return;
            }
          } else {
            // currentTime belum ada, keep di target
            if (durationVal && !isNaN(durationVal) && durationVal > 0) setDuration(durationVal);
            if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
            return;
          }
        }

        if (currentTime !== undefined && !isNaN(currentTime)) setPosition(currentTime);
        if (durationVal !== undefined && !isNaN(durationVal) && durationVal > 0) setDuration(durationVal);

        if (p?.duration && p?.currentTime && p.duration > 2 && !endedRef.current) {
          const remaining = p.duration - p.currentTime;
          if (remaining <= 0.6 && remaining > -2) {
            endedRef.current = true;
            playNextInternal();
          }
        }
      } catch {}
    }, 250);

    return () => { subPlaying?.remove(); subStatus?.remove(); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [player]);

  return (
    <PlayerContext.Provider value={{ current: currentItem, currentItem, isPlaying, player, queue, originalQueue, currentIndex, loopMode, shuffle, play, playUrl, pause, resume, toggle, stop, seek, playNext, playPrev, setLoopMode, setShuffle, duration, position }}>
      {children}
      {player && <VideoView player={player} style={{ width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }} nativeControls={false} contentFit="contain" staysActiveInBackground showsNowPlayingNotification />}
    </PlayerContext.Provider>
  );
}

export function usePlayer() { return useContext(PlayerContext); }
