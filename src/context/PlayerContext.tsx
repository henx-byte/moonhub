// FINAL - MP3 = track-player (seek jalan), Radio+Video = expo-video
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { MediaItem } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";

let TrackPlayer: any = null;
let Capability: any = null;
let Event: any = null;
let State: any = null;
let RepeatMode: any = null;
try {
  const TP = require("react-native-track-player");
  TrackPlayer = TP.default || TP;
  Capability = TP.Capability;
  Event = TP.Event;
  State = TP.State;
  RepeatMode = TP.RepeatMode;
} catch {
  console.log("[Player] TrackPlayer not available");
}

type LoopMode = "off" | "all" | "one";

export const PlayerContext = createContext<any>({
  current: null, isPlaying: false, queue: [], currentIndex: -1, loopMode: "all",
  toggle: () => {}, play: async () => {}, pause: () => {}, resume: () => {}, seek: () => {}, playNext: () => {}, playPrev: () => {}, stop: () => {},
  duration: 0, position: 0, playerType: "audio",
});

let trackSetup = false;

function isRadio(item: any) {
  if (!item) return false;
  if (item.mediaType === "radio") return true;
  if (item.extra?.isRadio) return true;
  if (item.sourceId && typeof item.sourceId === "string" && item.sourceId.toLowerCase().includes("radio")) return true;
  if (item.type === "radio") return true;
  if (item.url_resolved) return true;
  return false;
}
function isVideo(item: any) {
  return item?.mediaType === "video";
}
function useTrackPlayerForItem(item: any) {
  if (isRadio(item)) return false;
  if (isVideo(item)) return false;
  return true;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [playerType, setPlayerType] = useState<"audio" | "video">("audio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loopMode, setLoopModeState] = useState<LoopMode>("all");
  const [shuffle, setShuffleState] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const queueRef = useRef<MediaItem[]>([]);
  const indexRef = useRef(-1);
  const loopRef = useRef<LoopMode>("all");
  const endedRef = useRef(false);
  const seekingRef = useRef(false);
  const seekTargetRef = useRef<number | null>(null);
  const videoIntervalRef = useRef<any>(null);
  const audioIntervalRef = useRef<any>(null);
  const shuffleRef = useRef(false);
  const playerTypeRef = useRef<"audio" | "video">("audio");

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { playerTypeRef.current = playerType; }, [playerType]);

  const videoPlayer = useVideoPlayer("", (p) => {
    p.loop = false;
    try { (p as any).staysActiveInBackground = true; } catch {}
  });

  // Setup TrackPlayer + POLLING FIX SEEK
  useEffect(() => {
    if (!TrackPlayer || trackSetup) return;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        try { TrackPlayer.registerPlaybackService(() => require('../services/playbackService')); } catch {}
        await TrackPlayer.updateOptions({
          progressUpdateEventInterval: 0.5,
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo, Capability.SkipToNext, Capability.SkipToPrevious],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
        });

        TrackPlayer.addEventListener(Event.RemoteNext, () => playNextInternal());
        TrackPlayer.addEventListener(Event.RemotePrevious, () => playPrevInternal());
        TrackPlayer.addEventListener(Event.RemoteSeek, (e: any) => { if (e.position !== undefined) TrackPlayer.seekTo(e.position); });
        TrackPlayer.addEventListener(Event.PlaybackState, (e: any) => { 
          if (playerTypeRef.current === "audio") setIsPlaying(e.state === State.Playing); 
        });
        TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (e: any) => {
          if (playerTypeRef.current !== "audio") return;
          if (e.nextTrack !== undefined) {
            setCurrentIndex(e.nextTrack);
            const q = queueRef.current;
            const original = q[e.nextTrack];
            if (original) setCurrentItem(original);
            endedRef.current = false;
          }
        });
        TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e: any) => {
          if (playerTypeRef.current !== "audio") return;
          if (seekingRef.current) return;
          if (e.duration > 0) {
            setPosition(e.position);
            setDuration(e.duration);
          }
        });

        // INI KUNCI FIX 00:00 - polling manual untuk content://
        audioIntervalRef.current = setInterval(async () => {
          try {
            if (playerTypeRef.current !== "audio") return;
            if (seekingRef.current) return;
            const prog: any = await TrackPlayer.getProgress();
            if (prog && prog.duration > 0) {
              setPosition(prog.position);
              setDuration(prog.duration);
            }
          } catch {}
        }, 400);

        trackSetup = true;
      } catch (e) { console.log("[TrackPlayer] setup error", e); }
    })();
    return () => { if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); };
  }, []);

  // expo-video progress
  useEffect(() => {
    if (playerType !== "video") return;
    const subPlaying = videoPlayer?.addListener("playingChange", (p: any) => {
      const playing = typeof p === "boolean" ? p : p?.isPlaying ?? false;
      if (!seekingRef.current) setIsPlaying(!!playing);
    });
    const subStatus = videoPlayer?.addListener("statusChange", (payload: any) => {
      try {
        const didJustFinish = payload?.didJustFinish || payload?.status?.didJustFinish;
        if (didJustFinish && currentItem && isRadio(currentItem)) return;
        const isIdle = payload?.status === "idle" || JSON.stringify(payload).includes("idle");
        if ((didJustFinish || isIdle) && !endedRef.current && !seekingRef.current) {
          const p: any = videoPlayer;
          if (p?.duration > 0) { endedRef.current = true; playNextInternal(); }
        }
      } catch {}
    });

    videoIntervalRef.current = setInterval(() => {
      try {
        const p: any = videoPlayer;
        const currentTime = p?.currentTime;
        const durationVal = p?.duration;
        if (seekingRef.current && seekTargetRef.current !== null) {
          if (currentTime !== undefined && !isNaN(currentTime)) {
            const diff = Math.abs(currentTime - seekTargetRef.current);
            if (diff < 1.5) {
              seekingRef.current = false; seekTargetRef.current = null;
              setPosition(currentTime);
            } else {
              if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
              return;
            }
          } else {
            if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
            return;
          }
        }
        if (currentTime !== undefined && !isNaN(currentTime)) setPosition(currentTime);
        if (durationVal !== undefined && !isNaN(durationVal) && durationVal > 0) setDuration(durationVal);
      } catch {}
    }, 300);

    return () => {
      subPlaying?.remove?.();
      subStatus?.remove?.();
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [playerType, currentItem]);

  const playNextInternal = async () => {
    if (endedRef.current) return;
    if (playerTypeRef.current === "audio" && TrackPlayer) {
      try { await TrackPlayer.skipToNext(); return; } catch {}
    }
    const q = queueRef.current; const idx = indexRef.current;
    const loop = loopRef.current; const shuf = shuffleRef.current;
    if (loop === "one") {
      const same = q[idx]; if (same) { endedRef.current = false; await playInternalAV(same); return; }
    }
    let nextIdx: number;
    if (shuf) {
      if (q.length <= 1) nextIdx = 0;
      else { const cand = q.map((_, i) => i).filter(i => i !== idx); nextIdx = cand[Math.floor(Math.random() * cand.length)]; }
    } else {
      nextIdx = idx + 1;
      if (nextIdx >= q.length) { if (loop === "all") nextIdx = 0; else { stopInternal(); return; } }
    }
    const nextItem = q[nextIdx];
    if (nextItem) { setCurrentIndex(nextIdx); endedRef.current = false; await playInternalAV(nextItem); }
  };

  const playPrevInternal = async () => {
    if (playerTypeRef.current === "audio" && TrackPlayer) {
      try { const pos = await TrackPlayer.getPosition(); if (pos > 3) { await TrackPlayer.seekTo(0); return; } await TrackPlayer.skipToPrevious(); } catch {}
      return;
    }
    const q = queueRef.current; const idx = indexRef.current;
    if (position > 3) { await seekInternal(0); return; }
    let prevIdx = idx - 1; if (prevIdx < 0) prevIdx = loopRef.current === "all" ? q.length - 1 : 0;
    const prevItem = q[prevIdx]; if (prevItem) { setCurrentIndex(prevIdx); endedRef.current = false; await playInternalAV(prevItem); }
  };

  const playInternalAV = async (item: MediaItem) => {
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    setCurrentItem(item);
    try {
      const p: any = videoPlayer;
      if (p.replaceAsync) await p.replaceAsync(item.uri);
      else p.replace(item.uri);
      videoPlayer.play(); setIsPlaying(true);
    } catch (e) { console.log("[AV] play error", e); }
  };

  const seekInternal = async (sec: number) => {
    if (playerTypeRef.current === "audio" && TrackPlayer) {
      seekingRef.current = true; seekTargetRef.current = sec; setPosition(sec);
      try { await TrackPlayer.seekTo(sec); } catch {}
      setTimeout(() => { seekingRef.current = false; seekTargetRef.current = null; }, 600);
      return;
    }
    if (currentItem && isRadio(currentItem)) return;
    seekingRef.current = true; seekTargetRef.current = sec; endedRef.current = false; setPosition(sec);
    try {
      const p: any = videoPlayer;
      if (p?.seek) p.seek(sec);
      if (p?.currentTime !== undefined) { try { p.currentTime = sec; } catch {} }
    } catch {}
  };

  const stopInternal = async () => {
    try { if (TrackPlayer) await TrackPlayer.reset(); } catch {}
    try { videoPlayer.pause(); } catch {}
    setIsPlaying(false); endedRef.current = false;
  };

  async function play(item: MediaItem, newQueue?: MediaItem[]) {
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    const useTP = useTrackPlayerForItem(item);
    const newType = useTP ? "audio" : "video";
    const incomingQueue = newQueue && newQueue.length > 0 ? [...newQueue] : [item];
    const isSameQueue = queue.length > 0 && incomingQueue.length === queue.length && incomingQueue.every((it, i) => it.id === queue[i].id);
    if (!isSameQueue) {
      setQueue(incomingQueue);
      queueRef.current = incomingQueue;
    }
    const curIdx = incomingQueue.findIndex(x => x.id === item.id || x.uri === item.uri);
    setCurrentIndex(curIdx >= 0 ? curIdx : 0);
    indexRef.current = curIdx >= 0 ? curIdx : 0;
    setCurrentItem(item);
    setPlayerType(newType);

    if (newType === "video") {
      if (TrackPlayer) try { await TrackPlayer.pause(); } catch {}
      await playInternalAV(item);
    } else {
      try { videoPlayer.pause(); } catch {}
      if (!TrackPlayer) { await playInternalAV(item); return; }
      try {
        if (!isSameQueue) {
          const tracks = incomingQueue.map((m: any) => {
            const t: any = { id: m.id, url: m.uri, title: m.title || "Unknown", artist: m.artist || "Unknown" };
            if (m.thumbnail && typeof m.thumbnail === "string" && m.thumbnail.startsWith("http") && m.thumbnail.length > 8) {
              t.artwork = m.thumbnail;
            }
            return t;
          });
          await TrackPlayer.reset();
          await TrackPlayer.add(tracks);
          if (curIdx >= 0) await TrackPlayer.skip(curIdx);
          await TrackPlayer.setRepeatMode(loopMode === "all" ? RepeatMode.Queue : loopMode === "one" ? RepeatMode.Track : RepeatMode.Off);
        } else {
          if (curIdx >= 0) await TrackPlayer.skip(curIdx);
        }
        await TrackPlayer.play();
        setIsPlaying(true);
      } catch (e) { console.log("[Audio] play error", e); }
    }
  }

  async function pause() { if (playerTypeRef.current === "audio" && TrackPlayer) await TrackPlayer.pause(); else videoPlayer.pause(); setIsPlaying(false); }
  async function resume() { if (playerTypeRef.current === "audio" && TrackPlayer) await TrackPlayer.play(); else videoPlayer.play(); setIsPlaying(true); }
  async function toggle() { if (isPlaying) await pause(); else await resume(); }
  async function seek(s: number) { await seekInternal(s); }
  async function playNext() { await playNextInternal(); }
  async function playPrev() { await playPrevInternal(); }
  async function stop() { await stopInternal(); setCurrentItem(null); setQueue([]); setCurrentIndex(-1); }

  const setLoopMode = async (mode: LoopMode) => {
    setLoopModeState(mode);
    AsyncStorage.setItem("player_settings_v3", JSON.stringify({ loopMode: mode, shuffle }));
    if (playerTypeRef.current === "audio" && TrackPlayer) {
      if (mode === "all") await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      else if (mode === "one") await TrackPlayer.setRepeatMode(RepeatMode.Track);
      else await TrackPlayer.setRepeatMode(RepeatMode.Off);
    }
  };

  return (
    <PlayerContext.Provider value={{
      current: currentItem, currentItem, isPlaying, queue, currentIndex, loopMode, shuffle, playerType,
      play, pause, resume, toggle, stop, seek, playNext, playPrev, setLoopMode, setShuffle: setShuffleState,
      duration, position, player: playerType === "video" ? videoPlayer : TrackPlayer
    }}>
      {children}
      <VideoView player={videoPlayer} style={{ width: 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }} nativeControls={false} contentFit="contain" />
    </PlayerContext.Provider>
  );
}
export function usePlayer() { return useContext(PlayerContext); }