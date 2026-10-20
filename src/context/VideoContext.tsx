// VideoContext.tsx
import { createContext, useContext, ReactNode } from "react";
import { useVideo } from "../player/useVideo";
const VideoContext = createContext<any>(null);
export function VideoProvider({ children }: { children: ReactNode }) {
  const video = useVideo();
  return <VideoContext.Provider value={video}>{children}</VideoContext.Provider>;
}
export const useVideoPlayer = () => useContext(VideoContext);