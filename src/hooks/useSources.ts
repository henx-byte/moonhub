import { useEffect, useState } from "react";
import { SourceConfig } from "../types";
import { Source } from "../sources/base/Source";
import { getSourceConfigs } from "../stores/sourceStore";
import { createAllSources } from "../sources/factory";

export function useSources() {
  const [configs, setConfigs] = useState<SourceConfig[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const cfgs = await getSourceConfigs();
    setConfigs(cfgs);
    setSources(createAllSources(cfgs));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return { configs, sources, loading, refresh };
}