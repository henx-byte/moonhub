import { SourceConfig } from "../types";
import { Source } from "./base/Source";
import { LocalSource } from "./local/LocalSource";
import { HttpSource } from "./online/HttpSource";
import { RadioSource } from "./radio/RadioSource";

export function createSourceInstance(config: SourceConfig): Source {
  // Log buat debug
  console.log(`[Factory] Creating source ${config.name} type=${config.type} url=${(config.config as any)?.url || (config.config as any)?.path}`);

  switch (config.type) {
    case "local":
      return new LocalSource(config);
    case "gdrive":
    case "cloud":      // NEW: universal cloud
    case "online":     // NEW: alias
    case "http":       // NEW: alias
    case "server":     // NEW: alias
      return new HttpSource(config);
    case "radio":
      return new RadioSource(config);
    default:
      // Fallback: cek kalo url nya http, pakai HttpSource, bukan LocalSource!
      const url = (config.config as any)?.url || (config.config as any)?.path || "";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        console.log(`[Factory] Fallback to HttpSource for ${url}`);
        return new HttpSource(config);
      }
      console.log(`[Factory] Fallback to LocalSource for ${config.type}`);
      return new LocalSource(config);
  }
}

export function createAllSources(configs: SourceConfig[]): Source[] {
  return configs
    .filter(c => c.enabled) // cuma yang enabled
    .map((c) => createSourceInstance(c));
}
