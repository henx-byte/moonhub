// HYBRID FINAL - Musik track-player (next notif nyala), Video expo-video, seek gak mendal, auto next background, queue gak kereset
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
  console.log("[Player] TrackPlayer not in Expo Go, fallback video");
}

type LoopMode = "off" | "all" | "one";

export const PlayerContext = createContext<any>({
  current: null, isPlaying: false, queue: [], currentIndex: -1, loopMode: "all",
  toggle: () => {}, play: async () => {}, pause: () => {}, resume: () => {}, seek: () => {}, playNext: () => {}, playPrev: () => {}, stop: () => {},
  duration: 0, position: 0, playerType: "audio",
});

let trackSetup = false;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [playerType, setPlayerType] = useState<"audio" | "video">("audio");
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [originalQueue, setOriginalQueue] = useState<MediaItem[]>([]);
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
  const shuffleRef = useRef(false);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  const videoPlayer = useVideoPlayer("", (p) => {
    p.loop = false;
    try { (p as any).staysActiveInBackground = true; (p as any).showNowPlayingNotification = true; } catch {}
  });

  // Setup TrackPlayer
  useEffect(() => {
    if (!TrackPlayer || trackSetup) return;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo, Capability.SkipToNext, Capability.SkipToPrevious],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
        });
        TrackPlayer.addEventListener(Event.RemoteNext, () => playNextInternal());
        TrackPlayer.addEventListener(Event.RemotePrevious, () => playPrevInternal());
        TrackPlayer.addEventListener(Event.RemoteSeek, (e: any) => { if (e.position !== undefined) TrackPlayer.seekTo(e.position); });
        TrackPlayer.addEventListener(Event.PlaybackState, (e: any) => { if (playerType === "audio") setIsPlaying(e.state === State.Playing); });
        TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (e: any) => {
          if (playerType !== "audio") return;
          if (e.nextTrack !== undefined) {
            setCurrentIndex(e.nextTrack);
            const q = await TrackPlayer.getQueue();
            const track = q[e.nextTrack] as any;
            if (track) setCurrentItem({ id: track.id, title: track.title, artist: track.artist, uri: track.url, mediaType: "music" } as any);
            endedRef.current = false;
          }
        });
        TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e: any) => {
          if (playerType !== "audio") return;
          if (seekingRef.current) return; // kalau lagi seeking, jangan update dari trackplayer biar gak mendal
          setPosition(e.position); setDuration(e.duration);
          // auto next background untuk audio sudah di-handle TrackPlayer RepeatMode, tapi cek juga
          if (e.duration > 2 && e.duration - e.position <= 0.6 && !endedRef.current) {
            endedRef.current = true;
          }
        });
        trackSetup = true;
      } catch (e) { console.log("[TrackPlayer] setup error", e); }
    })();
  }, []);

  // VIDEO progress + anti mendal
  useEffect(() => {
    if (playerType !== "video") return;
    const subPlaying = videoPlayer?.addListener("playingChange", (p: any) => {
      const playing = typeof p === "boolean" ? p : p?.isPlaying ?? false;
      if (!seekingRef.current) setIsPlaying(!!playing);
    });
    const subStatus = videoPlayer?.addListener("statusChange", (payload: any) => {
      try {
        const didJustFinish = payload?.didJustFinish || payload?.status?.didJustFinish;
        const isIdle = payload?.status === "idle" || JSON.stringify(payload).includes("idle");
        if ((didJustFinish || isIdle) && !endedRef.current && !seekingRef.current) {
          const p: any = videoPlayer; if (p?.duration > 0) { endedRef.current = true; playNextInternal(); }
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
              if (durationVal) setDuration(durationVal);
              if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
              return;
            }
          } else {
            if (seekTargetRef.current !== null) setPosition(seekTargetRef.current);
            return;
          }
        }

        if (currentTime !== undefined && !isNaN(currentTime) && !seekingRef.current) setPosition(currentTime);
        if (durationVal && !isNaN(durationVal) && durationVal > 0) setDuration(durationVal);

        if (p?.duration && p?.currentTime && p.duration > 2 && !endedRef.current && !seekingRef.current) {
          const remaining = p.duration - p.currentTime;
          if (remaining <= 0.6 && remaining > -2) { endedRef.current = true; playNextInternal(); }
        }
      } catch {}
    }, 250);

    return () => { subPlaying?.remove(); subStatus?.remove(); if (videoIntervalRef.current) clearInterval(videoIntervalRef.current); };
  }, [videoPlayer, playerType]);

  const playNextInternal = async () => {
    const q = queueRef.current; const idx = indexRef.current; const loop = loopRef.current; const shuf = shuffleRef.current;
    if (q.length === 0 || idx < 0) return;
    if (loop === "one") { await seekInternal(0); await resumeInternal(); return; }

    if (playerType === "audio" && TrackPlayer) {
      try {
        if (shuf) {
          const cand = q.map((_, i) => i).filter(i => i !== idx);
          const nextIdx = cand[Math.floor(Math.random() * cand.length)];
          await TrackPlayer.skip(nextIdx); setCurrentIndex(nextIdx);
        } else {
          if (idx < q.length - 1) await TrackPlayer.skipToNext();
          else if (loop === "all") await TrackPlayer.skip(0);
        }
        endedRef.current = false;
      } catch {}
      return;
    }

    // VIDEO
    let nextIdx: number;
    if (shuf) {
      if (q.length <= 1) nextIdx = 0;
      else { const cand = q.map((_, i) => i).filter(i => i !== idx); nextIdx = cand[Math.floor(Math.random() * cand.length)]; }
    } else {
      nextIdx = idx + 1;
      if (nextIdx >= q.length) { if (loop === "all") nextIdx = 0; else { stopInternal(); return; } }
    }
    const nextItem = q[nextIdx];
    if (nextItem) { setCurrentIndex(nextIdx); endedRef.current = false; await playInternalVideo(nextItem); }
  };

  const playPrevInternal = async () => {
    if (playerType === "audio" && TrackPlayer) {
      try { const pos = await TrackPlayer.getPosition(); if (pos > 3) { await TrackPlayer.seekTo(0); return; } await TrackPlayer.skipToPrevious(); } catch {}
      return;
    }
    const q = queueRef.current; const idx = indexRef.current;
    if (position > 3) { await seekInternal(0); return; }
    let prevIdx = idx - 1; if (prevIdx < 0) prevIdx = loopRef.current === "all" ? q.length - 1 : 0;
    const prevItem = q[prevIdx]; if (prevItem) { setCurrentIndex(prevIdx); endedRef.current = false; await playInternalVideo(prevItem); }
  };

  const playInternalVideo = async (item: MediaItem) => {
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    setCurrentItem(item);
    try {
      const p: any = videoPlayer;
      if (p.replaceAsync) await p.replaceAsync(item.uri); else p.replace(item.uri);
      videoPlayer.play(); setIsPlaying(true);
    } catch (e) { console.log("[Video] play error", e); setTimeout(() => playNextInternal(), 300); }
  };

  const seekInternal = async (sec: number) => {
    if (playerType === "audio" && TrackPlayer) {
      seekingRef.current = true; seekTargetRef.current = sec; setPosition(sec);
      try { await TrackPlayer.seekTo(sec); } catch {}
      setTimeout(() => { seekingRef.current = false; seekTargetRef.current = null; }, 600);
      return;
    }
    // VIDEO seek anti mendal
    seekingRef.current = true; seekTargetRef.current = sec; endedRef.current = false; setPosition(sec);
    try {
      const p: any = videoPlayer;
      if (p?.seek) p.seek(sec);
      if (p?.currentTime !== undefined) { try { p.currentTime = sec; } catch {} }
    } catch {}
  };

  const resumeInternal = async () => {
    if (playerType === "audio" && TrackPlayer) { try { await TrackPlayer.play(); setIsPlaying(true); } catch {} }
    else { try { videoPlayer.play(); setIsPlaying(true); } catch {} }
  };

  const stopInternal = async () => {
    try { if (TrackPlayer) await TrackPlayer.reset(); } catch {}
    try { videoPlayer.pause(); } catch {}
    setIsPlaying(false); endedRef.current = false;
  };

  async function play(item: MediaItem, newQueue?: MediaItem[]) {
    endedRef.current = false; seekingRef.current = false; seekTargetRef.current = null;
    const isVideo = item.mediaType === "video";
    const newType = isVideo ? "video" : "audio";
    const incomingQueue = newQueue && newQueue.length > 0 ? [...newQueue] : [item];
    
    // FIX QUEUE KERESET: kalau queue sama persis (user tap dari daftar putar), jangan reset, cukup skip
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
      await playInternalVideo(item);
    } else {
      try { videoPlayer.pause(); } catch {}
      if (!TrackPlayer) {
        // Fallback Expo Go
        await playInternalVideo(item);
        return;
      }
      try {
        if (!isSameQueue) {
          const tracks = incomingQueue.map((m) => ({ id: m.id, url: m.uri, title: m.title, artist: m.artist || "Unknown", artwork: m.thumbnail }));
          await TrackPlayer.reset();
          await TrackPlayer.add(tracks);
          if (curIdx >= 0) await TrackPlayer.skip(curIdx);
          await TrackPlayer.setRepeatMode(loopMode === "all" ? RepeatMode.Queue : loopMode === "one" ? RepeatMode.Track : RepeatMode.Off);
        } else {
          // Queue sama, tinggal skip aja - ini fix tap dari daftar putar gak kereset
          if (curIdx >= 0) await TrackPlayer.skip(curIdx);
        }
        await TrackPlayer.play();
        setIsPlaying(true);
      } catch (e) { console.log("[Audio] play error", e); }
    }
  }

  async function pause() { if (playerType === "audio" && TrackPlayer) await TrackPlayer.pause(); else videoPlayer.pause(); setIsPlaying(false); }
  async function resume() { if (playerType === "audio" && TrackPlayer) await TrackPlayer.play(); else videoPlayer.play(); setIsPlaying(true); }
  async function toggle() { if (isPlaying) await pause(); else await resume(); }
  async function seek(s: number) { await seekInternal(s); }
  async function playNext() { await playNextInternal(); }
  async function playPrev() { await playPrevInternal(); }
  async function stop() { await stopInternal(); setCurrentItem(null); setQueue([]); setCurrentIndex(-1); }

  const setLoopMode = async (mode: LoopMode) => {
    setLoopModeState(mode);
    AsyncStorage.setItem("player_settings_v3", JSON.stringify({ loopMode: mode, shuffle }));
    if (playerType === "audio" && TrackPlayer) {
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
      <VideoView player={videoPlayer} style={{ width: playerType === "video" ? 1 : 1, height: 1, position: "absolute", opacity: 0, pointerEvents: "none" }} nativeControls={false} contentFit="contain" staysActiveInBackground showsNowPlayingNotification={playerType === "video" || !TrackPlayer} />
    </PlayerContext.Provider>
  );
}

export function usePlayer() { return useContext(PlayerContext); }