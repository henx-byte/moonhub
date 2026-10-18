import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';

type TrackInfo = { title: string; url: string; artist?: string };
type PlayerContextType = {
  playUrl: (url: string, title: string, artist?: string) => void;
  toggle: () => void;
  stop: () => void;
  current: TrackInfo | null;
  isPlaying: boolean;
};

const PlayerContext = createContext<PlayerContextType>(null as any);
export function usePlayer() { return useContext(PlayerContext); }

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(null, p => {
    p.loop = true; // radio loop terus
    p.staysActiveInBackground = true;
  });

  const playUrl = async (url: string, title: string, artist?: string) => {
    try {
      setCurrent({ title, url, artist });
      await player.replaceAsync(url);
      player.play();
      setIsPlaying(true);
    } catch (e) { console.log("❌", e); }
  };

  const toggle = () => {
    if (isPlaying) { player.pause(); setIsPlaying(false); }
    else { player.play(); setIsPlaying(true); }
  };

  const stop = () => { player.pause(); setIsPlaying(false); setCurrent(null); };

  return (
    <PlayerContext.Provider value={{ playUrl, toggle, stop, current, isPlaying }}>
      {children}
      <VideoView player={player} style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }} nativeControls={false} contentFit="contain" allowsFullscreen={false} />
    </PlayerContext.Provider>
  );
}