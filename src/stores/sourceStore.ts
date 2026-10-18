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
];

export async function getSourceConfigs(): Promise<SourceConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOURCES));
      return DEFAULT_SOURCES;
    }
    return JSON.parse(raw);
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
  const updated = current.map((c) => (c.id === id ? { ...c, ...patch } : c));
  await saveSourceConfigs(updated);
  return updated;
}