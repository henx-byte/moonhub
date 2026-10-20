import { createContext, useContext, ReactNode } from "react";
import { useReader } from "../player/useReader";
const Ctx = createContext<any>(null);
export function ReaderProvider({ children }: { children: ReactNode }) {
  const reader = useReader();
  return <Ctx.Provider value={reader}>{children}</Ctx.Provider>;
}
export const useReaderPlayer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useReaderPlayer must inside ReaderProvider");
  return ctx;
};
