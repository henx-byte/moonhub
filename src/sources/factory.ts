import { SourceConfig } from "../types";
import { Source } from "./base/Source";
import { LocalSource } from "./local/LocalSource";
import { HttpSource } from "./online/HttpSource";
import { MangaSource } from "./manga/MangaSource";
import { coreRegistry, registerSource, createSourceInstance as createFromRegistry } from "./core/registry";

let builtinsRegistered = false;
function ensureBuiltins() {
  if (builtinsRegistered) return;
  builtinsRegistered = true;
  registerSource("local", LocalSource as any);
  registerSource("cloud", HttpSource as any);
  registerSource("manga", MangaSource as any);
  registerSource("gdrive", HttpSource as any);
  registerSource("http", HttpSource as any);
  registerSource("https", HttpSource as any);
  registerSource("server", HttpSource as any);
  registerSource("online", HttpSource as any);
  registerSource("api", HttpSource as any);
  registerSource("comic", MangaSource as any);
  registerSource("manhwa", MangaSource as any);
  registerSource("manhua", MangaSource as any);
}

export { registerSource as registerSourceType };
export { coreRegistry };

export function createSource(config: SourceConfig): Source {
  ensureBuiltins();
  return createFromRegistry(config);
}

export function createAllSources(configs: SourceConfig[]): Source[] {
  ensureBuiltins();
  return configs
    .filter((c) => c.enabled)
    .map((c) => {
      try {
        return createFromRegistry(c);
      } catch (e) {
        console.log(`[Factory] Failed ${c.name}`, e);
        return null;
      }
    })
    .filter(Boolean) as Source[];
}

// alias biar useSources lama tetap jalan
export function createSourceInstance(config: SourceConfig): Source {
  return createSource(config);
}