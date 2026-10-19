// FACTORY FINAL - Generic Plugin System
// core.registerSource(type, Class)
// SourceConfig generic type: string
// Server bisa format apa aja, yang penting return MediaItem[]

import { SourceConfig } from "../types";
import { Source } from "./base/Source";
import { LocalSource } from "./local/LocalSource";
import { HttpSource } from "./online/HttpSource";
import { RadioSource } from "./radio/RadioSource";
import { MangaSource } from "./manga/MangaSource";
import { coreRegistry, registerSource, createSourceInstance as createFromRegistry } from "./core/registry";

// Register built-in sources sekali aja
let builtinsRegistered = false;
function ensureBuiltins() {
  if (builtinsRegistered) return;
  builtinsRegistered = true;
  
  console.log("[Factory] Registering built-in sources (generic plugin system)");
  
  // Core built-ins
  registerSource("local", LocalSource as any);
  registerSource("cloud", HttpSource as any);
  registerSource("radio", RadioSource as any);
  registerSource("manga", MangaSource as any);
  
  // Aliases
  registerSource("gdrive", HttpSource as any);
  registerSource("http", HttpSource as any);
  registerSource("https", HttpSource as any);
  registerSource("server", HttpSource as any);
  registerSource("online", HttpSource as any);
  registerSource("api", HttpSource as any);
  
  registerSource("comic", MangaSource as any);
  registerSource("manhwa", MangaSource as any);
  registerSource("manhua", MangaSource as any);
  
  console.log(`[Factory] Registered types: ${coreRegistry.list().join(", ")}`);
}

// Public API buat extension
export { registerSource as registerSourceType };
export { coreRegistry };

// Factory generic
export function createSourceInstance(config: SourceConfig): Source {
  ensureBuiltins();
  return createFromRegistry(config);
}

export function createAllSources(configs: SourceConfig[]): Source[] {
  ensureBuiltins();
  console.log(`[Factory] Creating ${configs.length} sources with generic types: ${configs.map(c => c.type).join(", ")}`);
  return configs
    .filter(c => c.enabled)
    .map((c) => {
      try {
        return createSourceInstance(c);
      } catch (e) {
        console.log(`[Factory] Failed to create ${c.name} type=${c.type}:`, e);
        return null;
      }
    })
    .filter(Boolean) as Source[];
}

// Contoh cara bikin extension baru (komikindo, anichin, etc):
// 
// import { registerSourceType } from "./factory";
// 
// class KomikindoSource extends Source {
//   async getLibraries() { return [{ id: "komikindo_manga", name: "Manga", path: "manga", mediaType: "manga" }]; }
//   async getItems() {
//     // Fetch dari komikindo.com, parse HTML, return MediaItem[]
//     const res = await fetch("https://komikindo.com");
//     const html = await res.text();
//     // parse...
//     return [{ id: "...", title: "...", uri: "...", mediaType: "manga", type: "manga", size: 0, path: "...", sourceId: this.id, name: "...", extra: { chapters: [...] } }];
//   }
// }
// 
// registerSourceType("komikindo", KomikindoSource);
// registerSourceType("anichin", AnichinSource);
// 
// Sekarang di app, SourceConfig type: "komikindo" langsung jalan!
