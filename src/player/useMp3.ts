import { useState, useEffect, useRef } from "react";
import { MediaItem } from "../types";
import * as FileSystem from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system";
import { useIcyCast } from "./useIcyCast";

let TrackPlayer: any = null,
  Capability: any,
  Event: any,
  State: any,
  RepeatMode: any;
try {
  const TP = require("react-native-track-player");
  TrackPlayer = TP.default || TP;
  Capability = TP.Capability;
  Event = TP.Event;
  State = TP.State;
  RepeatMode = TP.RepeatMode;
  const svc = require("../services/playbackService");
  TrackPlayer.registerPlaybackService(() => svc.default || svc);
} catch {}

type LoopMode = "off" | "all" | "one";
let trackSetup = false;
type PlayOpts = { useIcy?: boolean };

async function toFileUri(uri: string, id: string): Promise<string> {
  if (uri.startsWith("file://")) return uri;
  if (uri.startsWith("http")) return uri; // JANGAN copy http radio, langsung return
  const fileName = `${id}_${Date.now()}.mp3`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = FileSystem.cacheDirectory + fileName;
  try {
    const info: any = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
  } catch {}
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {}
  try {
    const base64 = await StorageAccessFramework.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64
    } as any);
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64
    });
    return dest;
  } catch {
    return uri;
  }
}

export function useMp3() {
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>("all");
  const [shuffle, setShuffle] = useState(false);

  const queueRef = useRef<MediaItem[]>([]),
    indexRef = useRef(-1),
    loopRef = useRef<LoopMode>("all"),
    shuffleRef = useRef(false),
    intervalRef = useRef<any>(null),
    useIcyRef = useRef(false);
  const icyCast = useIcyCast();

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    loopRef.current = loopMode;
  }, [loopMode]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    if (!TrackPlayer || trackSetup) return;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          progressUpdateEventInterval: 0.5,
          android: {
            appKilledPlaybackBehavior: "ContinuePlayback",
            alwaysPauseOnInterruption: false
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
            Capability.SkipToNext,
            Capability.SkipToPrevious
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext
          ]
        });
        TrackPlayer.addEventListener(Event.PlaybackState, (e: any) =>
          setIsPlaying(e.state === State.Playing)
        );
        TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (e: any) => {
          if (e.nextTrack !== undefined) {
            setCurrentIndex(e.nextTrack);
            const orig = queueRef.current[e.nextTrack];
            if (orig) setCurrent(orig);
          }
        });
        TrackPlayer.addEventListener(
          Event.PlaybackProgressUpdated,
          (e: any) => {
            if (e.duration > 0) {
              setPosition(e.position);
              setDuration(e.duration);
            }
          }
        );
        intervalRef.current = setInterval(async () => {
          try {
            const prog: any = await TrackPlayer.getProgress();
            if (prog?.duration > 0) {
              setPosition(prog.position);
              setDuration(prog.duration);
            }
          } catch {}
        }, 400);
        if (RepeatMode) await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        trackSetup = true;
      } catch (e) {
        console.log("[MP3] setup error", e);
      }
    })();
    return () => clearInterval(intervalRef.current);
  }, []);

  const play = async (
    item: MediaItem,
    newQueue?: MediaItem[],
    opts: PlayOpts = {}
  ) => {
    const useIcy = opts.useIcy ?? false;
    useIcyRef.current = useIcy;
    const q = newQueue && newQueue.length > 0 ? [...newQueue] : [item];
    const idx = q.findIndex(x => x.id === item.id || x.uri === item.uri);
    setQueue(q);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setCurrent(item);
    if (!TrackPlayer) return;
    try {
      const tracks = [];
      for (const m of q) {
        if (!m.uri || m.uri.trim() === "") continue;
        const fileUri = await toFileUri(m.uri, m.id);
        if (!fileUri.trim()) continue;
        const isHls = fileUri.toLowerCase().includes(".m3u8");
        tracks.push({
          id: m.id,
          url: fileUri,
          title: m.title || "Unknown",
          artist: m.artist || m.state || m.country || "Unknown",
          artwork:
            m.thumbnail ||
            "https://raw.githubusercontent.com/henx-byte/moonhub/refs/heads/main/assets/icon.png",
          type: isHls ? "hls" : "default", 
          isLive: isHls || m.type === "radio" || item.type === "radio", 
          duration: isHls ? 0 : undefined
        });
      }
      if (tracks.length === 0) return;
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      if (idx > 0) await TrackPlayer.skip(idx);
      if (RepeatMode) {
        if (loopRef.current === "one")
          await TrackPlayer.setRepeatMode(RepeatMode.Track);
        else if (loopRef.current === "all")
          await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        else await TrackPlayer.setRepeatMode(RepeatMode.Off);
      }
      await TrackPlayer.play();
      setIsPlaying(true);
      if (useIcy) icyCast.play(item.uri);
      else icyCast.stop();
    } catch (e) {
      console.log("[MP3] play error", e);
    }
  };

  const pause = async () => {
    try {
      await TrackPlayer.pause();
      setIsPlaying(false);
      if (useIcyRef.current) icyCast.pause();
    } catch {}
  };
  const resume = async () => {
    try {
      await TrackPlayer.play();
      setIsPlaying(true);
      if (useIcyRef.current) icyCast.resume();
    } catch {}
  };
  const stop = async () => {
    try {
      await TrackPlayer.reset();
      setIsPlaying(false);
      setCurrent(null);
      icyCast.stop();
      useIcyRef.current = false;
    } catch {}
  };
  const toggle = async () => (isPlaying ? pause() : resume());
  const seek = async (sec: number) => {
    try {
      await TrackPlayer.seekTo(sec);
      setPosition(sec);
    } catch {}
  };
  const playNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {}
  };
  const playPrev = async () => {
    try {
      const pos = await TrackPlayer.getPosition();
      if (pos > 3) await TrackPlayer.seekTo(0);
      else await TrackPlayer.skipToPrevious();
    } catch {}
  };
  const toggleLoop = async () => {
    setLoopMode(prev => {
      const next = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      try {
        if (next === "one") TrackPlayer.setRepeatMode(RepeatMode.Track);
        else if (next === "all") TrackPlayer.setRepeatMode(RepeatMode.Queue);
        else TrackPlayer.setRepeatMode(RepeatMode.Off);
      } catch {}
      return next;
    });
  };
  const toggleShuffle = () => setShuffle(s => !s);

  return {
    current,
    isPlaying,
    queue,
    currentIndex,
    position,
    duration,
    loopMode,
    shuffle,
    nowPlaying: icyCast.nowPlaying,
    parsed: icyCast.parsed,
    play,
    pause,
    resume,
    toggle,
    seek,
    stop,
    playNext,
    playPrev,
    setLoopMode,
    setShuffle,
    toggleLoop,
    toggleShuffle,
    type: "mp3" as const
  };
}
