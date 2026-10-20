// AudioContext.tsx
import { createContext, useContext, ReactNode } from "react";
import { useAudio } from "../player/useAudio";
const AudioContext = createContext<any>(null);
export function AudioProvider({ children }: { children: ReactNode }) {
  const audio = useAudio();
  return <AudioContext.Provider value={audio}>{children}</AudioContext.Provider>;
}
export const useAudioPlayer = () => useContext(AudioContext);
