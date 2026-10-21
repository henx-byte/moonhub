import React, { createContext, useContext, useMemo } from "react";
import { useHlsPlayer } from "./HlsContext";

const UnifiedContext = createContext<any>(null);

export function UnifiedProvider({ children }: { children: React.ReactNode }) {
  const hls = useHlsPlayer();

  const value = useMemo(() => ({
    ...hls,
    isPlaying: hls?.isPlaying ?? false,
    current: hls?.current ?? null,
  }), [hls?.isPlaying, hls?.current?.id]);

  return <UnifiedContext.Provider value={value}>{children}</UnifiedContext.Provider>;
}

export const useUnifiedPlayer = () => useContext(UnifiedContext);