import { createContext, useContext, ReactNode } from "react";
import { useHls } from "../player/useHls";
const Ctx = createContext<any>(null);
export function HlsProvider({ children }: { children: ReactNode }) {
  const hls = useHls();
  return <Ctx.Provider value={hls}>{children}</Ctx.Provider>;
}
export const useHlsPlayer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHlsPlayer must inside HlsProvider");
  return ctx;
};
