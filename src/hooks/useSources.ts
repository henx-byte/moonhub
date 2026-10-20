import { useEffect, useState } from "react";
import { SourceConfig } from "../types";
import { Source } from "../sources/base/Source";
import { getSourceConfigs } from "../stores/sourceStore";
import { createAllSources } from "../sources/factory";

export function useSources() {
  const [configs, setConfigs] = useState<SourceConfig[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const cfgs = await getSourceConfigs();
    setConfigs(cfgs);
    const srcs = createAllSources(cfgs);
    setSources(srcs);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { configs, sources, loading, refresh };
}