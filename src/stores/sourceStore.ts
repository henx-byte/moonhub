import AsyncStorage from "@react-native-async-storage/async-storage";
import { SourceConfig } from "../types";

const STORAGE_KEY = "moonhub_sources";

const DEFAULT_SOURCES: SourceConfig[] = [
  {
    id: "radio_default",
    name: "Radio",
    type: "radio",
    enabled: true,
    config: {},
    libraries: [],
  },
  {
    id: "local_default",
    name: "Musik HP",
    type: "local",
    enabled: true,
    config: {
      path: "", // akan diisi pas user pilih folder
      folderUri: "",
    },
    libraries: [],
  },
];

export async function getSourceConfigs(): Promise<SourceConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOURCES));
      return DEFAULT_SOURCES;
    }
    const parsed = JSON.parse(raw);
    // migrasi: kalau dulu cuma ada radio, tambahin local
    if (!parsed.some((c: any) => c.type === "local")) {
      const updated = [...parsed, DEFAULT_SOURCES[1]];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch {
    return DEFAULT_SOURCES;
  }
}

export async function saveSourceConfigs(configs: SourceConfig[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
export async function addSourceConfig(config: SourceConfig): Promise<SourceConfig[]> {
  const current = await getSourceConfigs();
  const updated = [...current, config];
  await saveSourceConfigs(updated);
  return updated;
}
export async function removeSourceConfig(id: string): Promise<SourceConfig[]> {
  const current = await getSourceConfigs();
  const updated = current.filter((c) => c.id !== id);
  await saveSourceConfigs(updated);
  return updated;
}
export async function updateSourceConfig(id: string, patch: Partial<SourceConfig>): Promise<SourceConfig[]> {
  const current = await getSourceConfigs();
  const updated = current.map((c) => (c.id === id ? { ...c, ...patch, config: { ...c.config, ...(patch.config||{}) } } : c));
  await saveSourceConfigs(updated);
  return updated;
}