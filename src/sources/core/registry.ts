// MOONHUB-CORE - Generic Plugin System
// SourceConfig generic type: string
// core.registerSource(type, Class) plugin system
// Server bisa format apa aja, yang penting return MediaItem[]

import { Source } from "../base/Source";
import { SourceConfig, MediaItem, Library } from "../../types";

// Registry buat semua source type - plugin system
type SourceClass = new (config: SourceConfig) => Source;

class CoreRegistry {
  private registry: Map<string, SourceClass> = new Map();

  register(type: string, sourceClass: SourceClass) {
    const normalized = type.toLowerCase().trim();
    console.log(`[Core] Register source type: ${normalized} -> ${sourceClass.name}`);
    this.registry.set(normalized, sourceClass);
  }

  get(type: string): SourceClass | undefined {
    const normalized = type.toLowerCase().trim();
    // Exact match dulu
    if (this.registry.has(normalized)) return this.registry.get(normalized);
    // Alias mapping
    const aliases: Record<string, string> = {
      gdrive: "cloud",
      drive: "cloud",
      google: "cloud",
      http: "cloud",
      https: "cloud",
      server: "cloud",
      online: "cloud",
      remote: "cloud",
      api: "cloud",
      comic: "book",
      manhwa: "book",
      manhua: "book",
      doujin: "book",
    };
    const aliased = aliases[normalized];
    if (aliased && this.registry.has(aliased)) return this.registry.get(aliased);
    return undefined;
  }

  list(): string[] {
    return Array.from(this.registry.keys());
  }

  has(type: string): boolean {
    return this.get(type) !== undefined;
  }
}

// Singleton registry
export const coreRegistry = new CoreRegistry();

// Public API: core.registerSource(type, Class)
export function registerSource(type: string, sourceClass: SourceClass) {
  coreRegistry.register(type, sourceClass);
}

export function getSourceClass(type: string): SourceClass | undefined {
  return coreRegistry.get(type);
}

// Factory yang pakai registry - generic type: string
export function createSourceInstance(config: SourceConfig): Source {
  const type = (config.type as string) || "local";
  console.log(`[Core] Creating source ${config.name} type=${type} (generic)`);

  const SourceClass = coreRegistry.get(type);
  
  if (SourceClass) {
    return new SourceClass(config);
  }

  // Fallback: coba deteksi dari URL kalo type gak kenal
  const url = (config.config as any)?.url || (config.config as any)?.path || "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Coba cari cloud source
    const cloudClass = coreRegistry.get("cloud");
    if (cloudClass) {
      console.log(`[Core] Fallback to cloud for unknown type ${type} with URL ${url}`);
      return new cloudClass(config);
    }
  }

  // Ultimate fallback: local
  const localClass = coreRegistry.get("local");
  if (localClass) {
    console.log(`[Core] Fallback to local for unknown type ${type}`);
    return new localClass(config);
  }

  throw new Error(`[Core] Unknown source type: ${type} and no fallback. Registered: ${coreRegistry.list().join(", ")}`);
}

export function createAllSources(configs: SourceConfig[]): Source[] {
  return configs
    .filter(c => c.enabled)
    .map((c) => {
      try {
        return createSourceInstance(c);
      } catch (e) {
        console.log(`[Core] Failed to create source ${c.name}:`, e);
        return null;
      }
    })
    .filter(Boolean) as Source[];
}

// Auto-register built-in sources (dipanggil sekali di app init)
// Ini biar app lama tetap jalan tanpa perlu manual register
export function registerBuiltins(sources: { local?: SourceClass, cloud?: SourceClass, radio?: SourceClass, comic?: SourceClass }) {
  if (sources.local) registerSource("local", sources.local);
  if (sources.cloud) {
    registerSource("cloud", sources.cloud);
    // Register semua alias cloud juga
    registerSource("gdrive", sources.cloud);
    registerSource("http", sources.cloud);
    registerSource("server", sources.cloud);
    registerSource("online", sources.cloud);
  }
  if (sources.radio) registerSource("radio", sources.radio);
  if (sources.book) {
    registerSource("book", sources.book);
    registerSource("comic", sources.book);
    registerSource("manhwa", sources.book);
    registerSource("manhua", sources.book);
  }
}
