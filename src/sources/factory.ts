import { ComicSource } from "./comic/ComicSource";
import { LocalSource } from "./local/LocalSource";
import { HttpSource } from "./online/HttpSource";
import { createAllSources as _createAllSources, registerSource } from "./core/registry";

export function initSources() {
  try {
    registerSource("comic", ComicSource as any);
    registerSource("book", ComicSource as any);
    registerSource("graphic", ComicSource as any);
    registerSource("local", LocalSource as any);
    registerSource("http", HttpSource as any);
    registerSource("radio", HttpSource as any);
    registerSource("musik", LocalSource as any);
    registerSource("music", LocalSource as any);
  } catch {}
}

initSources();

export function createAllSources(configs: any) {
  if (!configs || !Array.isArray(configs)) return [];
  try {
    initSources();
    const res = _createAllSources(configs);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}