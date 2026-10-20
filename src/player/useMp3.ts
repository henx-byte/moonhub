import { useState, useEffect, useRef } from "react";
import { MediaItem } from "../types";
import * as FileSystem from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system";

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
  // FIX 1: register di top-level, bukan di useEffect
  const svc = require("../services/playbackService");
  TrackPlayer.registerPlaybackService(() => svc.default || svc);
  console.log("[MP3] PlaybackService registered top-level");
} catch (e) {
  console.log("[MP3] TrackPlayer not available", e);
}

type LoopMode = "off" | "all" | "one";
let trackSetup = false;

async function toFileUri(uri: string, id: string): Promise<string> {
  try {
    if (uri.startsWith("file://")) return uri;
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
      const base64 = await StorageAccessFramework.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 } as any);
      await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
      return dest;
    } catch {
      return uri;
    }
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

  const queueRef = useRef<MediaItem[]>([]);
  const indexRef = useRef(-1);
  const loopRef = useRef<LoopMode>("all");
  const shuffleRef = useRef(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  useEffect(() => {
    if (!TrackPlayer || trackSetup) return;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        // FIX 2: gak ada duplicate android, SeekTo ada di notif
        await TrackPlayer.updateOptions({
          progressUpdateEventInterval: 0.5,
          android: {
            appKilledPlaybackBehavior: "ContinuePlayback",
            alwaysPauseOnInterruption: false,
          },
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SeekTo, Capability.SkipToNext, Capability.SkipToPrevious],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        });

        TrackPlayer.addEventListener(Event.PlaybackState, (e: any) => {
          setIsPlaying(e.state === State.Playing);
        });

        TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (e: any) => {
          if (e.nextTrack !== undefined) {
            setCurrentIndex(e.nextTrack);
            const orig = queueRef.current[e.nextTrack];
            if (orig) setCurrent(orig);
          }
        });

        TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e: any) => {
          if (e.duration > 0) {
            setPosition(e.position);
            setDuration(e.duration);
          }
        });

        // FIX 3: polling manual kayak PlayerContext yang normal - ini kunci biar gak 00:00
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
        console.log("[MP3] setup done");
      } catch (e) {
        console.log("[MP3] setup error", e);
      }
    })();
    return () => clearInterval(intervalRef.current);
  }, []);

  const play = async (item: MediaItem, newQueue?: MediaItem[]) => {
    const q = newQueue && newQueue.length > 0 ? [...newQueue] : [item];
    const idx = q.findIndex((x) => x.id === item.id || x.uri === item.uri);
    setQueue(q);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setCurrent(item);
    if (!TrackPlayer) return;
    try {
      const tracks = [];
      for (const m of q) {
        const fileUri = await toFileUri(m.uri, m.id);
        tracks.push({ id: m.id, url: fileUri, title: m.title || "Unknown", artist: m.artist || "Local", artwork: m.thumbnail });
      }
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      if (idx > 0) await TrackPlayer.skip(idx);
      if (RepeatMode) {
        if (loopRef.current === "one") await TrackPlayer.setRepeatMode(RepeatMode.Track);
        else if (loopRef.current === "all") await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        else await TrackPlayer.setRepeatMode(RepeatMode.Off);
      }
      await TrackPlayer.play();
      setIsPlaying(true);
    } catch (e) {
      console.log("[MP3] play error", e);
    }
  };

  const pause = async () => { try { await TrackPlayer.pause(); setIsPlaying(false); } catch {} };
  const resume = async () => { try { await TrackPlayer.play(); setIsPlaying(true); } catch {} };
  const toggle = async () => (isPlaying ? pause() : resume());
  const seek = async (sec: number) => { try { await TrackPlayer.seekTo(sec); setPosition(sec); } catch {} };
  const stop = async () => { try { await TrackPlayer.reset(); setIsPlaying(false); setCurrent(null); } catch {} };
  const playNext = async () => { try { await TrackPlayer.skipToNext(); } catch {} };
  const playPrev = async () => { try { const pos = await TrackPlayer.getPosition(); if (pos > 3) await TrackPlayer.seekTo(0); else await TrackPlayer.skipToPrevious(); } catch {} };
  const toggleLoop = async () => {
    setLoopMode((prev) => {
      const next = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      try {
        if (TrackPlayer?.setRepeatMode && RepeatMode) {
          if (next === "one") TrackPlayer.setRepeatMode(RepeatMode.Track);
          else if (next === "all") TrackPlayer.setRepeatMode(RepeatMode.Queue);
          else TrackPlayer.setRepeatMode(RepeatMode.Off);
        }
      } catch {}
      return next;
    });
  };
  const toggleShuffle = () => setShuffle((s) => !s);

  return { current, isPlaying, queue, currentIndex, position, duration, loopMode, shuffle, play, pause, resume, toggle, seek, stop, playNext, playPrev, setLoopMode, setShuffle, toggleLoop, toggleShuffle, type: "mp3" as const };
}
