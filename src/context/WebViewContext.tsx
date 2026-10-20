import { createContext, useContext, ReactNode } from "react";
import { useWebView } from "../player/useWebView";
const Ctx = createContext<any>(null);
export function WebViewProvider({ children }: { children: ReactNode }) {
  const web = useWebView();
  return <Ctx.Provider value={web}>{children}</Ctx.Provider>;
}
export const useWebViewPlayer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWebViewPlayer must inside WebViewProvider");
  return ctx;
};
