import { useState, useEffect, useCallback } from "react";
import { getSourceConfigs } from "../stores/sourceStore";
import { createAllSources } from "../sources/factory";

export function useSources() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const cfgs = await getSourceConfigs();
      setConfigs(cfgs);
      const all = createAllSources(cfgs);
      setSources(all || []);
      setLoading(false);
    } catch (e) {
      console.log("[useSources] error", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, []);

  return { configs, sources: sources || [], loading, refresh };
}