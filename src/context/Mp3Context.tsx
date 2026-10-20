import { createContext, useContext, ReactNode } from "react";
import { useMp3 } from "../player/useMp3";

const Ctx = createContext<any>(null);

export function Mp3Provider({ children }: { children: ReactNode }) {
  const mp3 = useMp3();
  return <Ctx.Provider value={mp3}>{children}</Ctx.Provider>;
}

export const useMp3Player = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMp3Player must inside Mp3Provider");
  return ctx;
};