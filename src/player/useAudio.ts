import { useState, useEffect, useRef } from "react";
import { MediaItem } from "../types";

let TrackPlayer: any = null;
let Capability: any = null;
let Event: any = null;
let State: any = null;
try {
  const TP = require("react-native-track-player");
  TrackPlayer = TP.default || TP;
  Capability = TP.Capability;
  Event = TP.Event;
  State = TP.State;
} catch {
  console.log("[Audio] TrackPlayer not ready");
}

let trackSetup = false;
type LoopMode = "off" | "all" | "one";

export function useAudio() {
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>("all");
  const [shuffle, setShuffle] = useState(false);

  const queueRef = useRef<MediaItem[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (!TrackPlayer || trackSetup) return;
    (async () => {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          progressUpdateEventInterval: 0.5,
          android: {
            appKilledPlaybackBehavior: "ContinuePlayback",
            alwaysPauseOnInterruption: false,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });
        TrackPlayer.addEventListener(Event.PlaybackState, (e: any) =>
          setIsPlaying(e.state === State.Playing),
        );
        TrackPlayer.addEventListener(
          Event.PlaybackProgressUpdated,
          (e: any) => {
            if (e.duration > 0) {
              setPosition(e.position);
              setDuration(e.duration);
            }
          },
        );
        trackSetup = true;
      } catch (e) {
        console.log(e);
      }
    })();
  }, []);

  const play = async (item: MediaItem, newQueue?: MediaItem[]) => {
    const q = newQueue?.length ? [...newQueue] : [item];
    const idx = q.findIndex((x) => x.id === item.id);
    setQueue(q);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setCurrent(item);
    try {
      const tracks = q.map((m: any) => ({
        id: m.id,
        url: m.uri,
        title: m.title,
        artist: m.artist || "Local",
        artwork: m.thumbnail,
      }));
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      if (idx > 0) await TrackPlayer.skip(idx);
      await TrackPlayer.play();
    } catch {}
  };

  const pause = async () => {
    try {
      await TrackPlayer.pause();
    } catch {}
  };
  const resume = async () => {
    try {
      await TrackPlayer.play();
    } catch {}
  };
  const toggle = () => (isPlaying ? pause() : resume());
  const seek = async (sec: number) => {
    try {
      await TrackPlayer.seekTo(sec);
    } catch {}
  };
  const stop = async () => {
    try {
      await TrackPlayer.reset();
      setCurrent(null);
    } catch {}
  };
  const playNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {}
  };
  const playPrev = async () => {
    try {
      const p = await TrackPlayer.getPosition();
      if (p > 3) await TrackPlayer.seekTo(0);
      else await TrackPlayer.skipToPrevious();
    } catch {}
  };

  return {
    current,
    isPlaying,
    queue,
    currentIndex,
    position,
    duration,
    loopMode,
    shuffle,
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
    playerType: "audio" as const,
  };
}
