import { createContext, useContext, ReactNode } from "react";
import { useMp3Player } from "./Mp3Context";
import { useHlsPlayer } from "./HlsContext";
import { useWebViewPlayer } from "./WebViewContext";
import { getPlayerType, shouldFallbackToWebView, PlayerType } from "../player/PlayerRouter";
import { MediaItem } from "../types";

const Ctx = createContext<any>(null);

export function UnifiedProvider({ children }: { children: ReactNode }) {
  const mp3 = useMp3Player();
  const hls = useHlsPlayer();
  const web = useWebViewPlayer();

  const play = async (item: MediaItem, queue?: MediaItem[]) => {
    const type: PlayerType = getPlayerType(item);
    try {
      if (type === 'mp3') {
        await mp3.play(item, queue);
      } else if (type === 'hls') {
        try {
          await hls.play(item);
        } catch (e) {
          if (shouldFallbackToWebView(e)) {
            await web.play(item);
          } else throw e;
        }
      } else if (type === 'reader') {
        // reader handle di screen manga, bukan di sini
        console.log("[Router] reader - handle di manga screen");
      } else {
        await web.play(item);
      }
    } catch (e) {
      console.log("[Router] fallback to webview", e);
      await web.play(item);
    }
  };

  const value = {
    play,
    mp3,
    hls,
    web,
    current: mp3.current || hls.current || web.current,
    isPlaying: mp3.isPlaying || hls.isPlaying || web.isPlaying,
    activeType: mp3.current ? 'mp3' : hls.current ? 'hls' : web.current ? 'webview' : null,
    stopAll: () => { mp3.stop(); hls.stop(); web.stop(); }
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUnifiedPlayer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUnifiedPlayer must inside UnifiedProvider");
  return ctx;
};
