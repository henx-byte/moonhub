import { useEffect, useState } from "react";
import { createAllSources, initSources } from "../sources/factory";

export function useSources(configs: any) {
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    if (!configs || !Array.isArray(configs)) {
      setSources([]);
      return;
    }
    try {
      initSources();
      const all = createAllSources(configs);
      setSources(Array.isArray(all) ? all : []);
    } catch (e) {
      console.log("[useSources] error", e);
      setSources([]);
    }
  }, [JSON.stringify(configs || [])]);

  return sources;
}