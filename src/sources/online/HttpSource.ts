import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig, MediaType } from "../../types";

type RemoteItem = { title: string; path: string; artist?: string; thumbnail?: string };

export class HttpSource extends Source {
  private rawConfig: SourceConfig;
  private fileConfig: any = null;
  private loaded = false;
  private baseUrl: string;

  constructor(config: SourceConfig) {
    super(config);
    this.rawConfig = config;
    this.baseUrl = (config.config as any)?.url || (config.config as any)?.path || "";
    this.baseUrl = this.baseUrl.replace(/\/$/, "");
    console.log(`[HttpSource] Created ${config.name} baseUrl=${this.baseUrl} type=${config.type}`);
  }

  private cleanTitle(input: string): string {
    if (!input) return "Unknown";
    try {
      let t = decodeURIComponent(input);
      t = t.split("/").pop() || t;
      t = t.replace(/\.[^/.]+$/, "");
      t = t.replace(/_/g, " ").trim();
      return t || "Unknown";
    } catch { return input; }
  }

  private async fetchJson(url: string): Promise<any> {
    const tries = [
      `${url}/index.json`,
      `${url}/config.json`,
      `${url}/moonhub.json`,
      `${url}`,
      `${url}/api`,
    ];
    for (const tryUrl of tries) {
      try {
        console.log(`[HttpSource] Fetching ${tryUrl}`);
        const res = await fetch(tryUrl, { headers: { "Accept": "application/json" } });
        if (!res.ok) {
          console.log(`[HttpSource] ${tryUrl} status ${res.status}`);
          continue;
        }
        const json = await res.json();
        console.log(`[HttpSource] Success from ${tryUrl}: ${json.name} keys=${Object.keys(json)}`);
        return json;
      } catch (e) {
        console.log(`[HttpSource] Fail ${tryUrl}`, (e as any).message);
      }
    }
    return null;
  }

  private async loadConfig() {
    if (this.loaded) return;
    this.loaded = true;
    console.log(`[HttpSource] Loading config from ${this.baseUrl}`);
    const cfg = await this.fetchJson(this.baseUrl);
    if (cfg) {
      this.fileConfig = cfg;
    } else {
      console.log("[HttpSource] Load failed, using empty");
      this.fileConfig = { name: this.rawConfig.name, music: [] };
    }
  }

  async getLibraries(): Promise<Library[]> {
    await this.loadConfig();
    const libs: Library[] = [];
    const keys = Object.keys(this.fileConfig).filter(k => k !== "name");
    
    for (const key of keys) {
      const val = this.fileConfig[key];
      if (val === undefined) continue;
      let mt: MediaType = "mixed";
      if (["music", "audio", "song", "radio"].includes(key)) mt = "music";
      else if (["video", "movie"].includes(key)) mt = "video";
      else if (["img", "image", "images", "manga", "comic", "manhwa"].includes(key)) mt = "image";
      
      libs.push({
        id: `${this.id}_${key}`,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        path: key,
        mediaType: mt,
      } as Library);
    }

    if (libs.length === 0) {
      return [{ id: `${this.id}_lib`, name: this.fileConfig?.name || "Remote", path: "mixed", mediaType: "mixed" } as Library];
    }
    console.log(`[HttpSource] Libraries: ${libs.map(l => l.name).join(", ")}`);
    return libs;
  }

  private resolvePath(p: string): string {
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("content://")) return p;
    if (p.startsWith("/")) return `${this.baseUrl}${p}`;
    return `${this.baseUrl}/${p}`;
  }

  async getItems(libraryId: string, path?: string): Promise<MediaItem[]> {
    await this.loadConfig();
    const key = libraryId.replace(`${this.id}_`, "");
    let raw = this.fileConfig[key];

    if (raw === undefined) {
      console.log(`[HttpSource] getItems key ${key} not found`);
      return [];
    }

    // FIX: handle string path -> fetch sub-config
    if (typeof raw === "string") {
      const subPath = raw === "." || raw === "./" ? "" : raw;
      const subUrl = subPath ? `${this.baseUrl}/${subPath}` : this.baseUrl;
      console.log(`[HttpSource] key ${key} is string "${raw}" -> fetch sub ${subUrl}`);
      const subConfig = await this.fetchJson(subUrl);
      if (subConfig) {
        if (Array.isArray(subConfig[key])) raw = subConfig[key];
        else if (Array.isArray(subConfig)) raw = subConfig;
        else if (Array.isArray(subConfig.music) && key === "music") raw = subConfig.music;
        else raw = subConfig.files || subConfig.items || [];
      } else {
        return [];
      }
    }

    if (!Array.isArray(raw)) {
      console.log(`[HttpSource] ${key} not array`);
      return [];
    }

    console.log(`[HttpSource] getItems ${key} -> ${raw.length} items via fetch`);
    return raw.map((it: any, idx: number) => {
      const itemObj = typeof it === "string" ? { title: it, path: it } : it;
      const title = itemObj.title || `Item ${idx + 1}`;
      const fullPath = this.resolvePath(itemObj.path);
      return {
        id: `http_${this.id}_${fullPath}_${idx}`,
        sourceId: this.id,
        name: title,
        title: this.cleanTitle(title),
        artist: itemObj.artist,
        path: fullPath,
        uri: fullPath,
        thumbnail: itemObj.thumbnail ? this.resolvePath(itemObj.thumbnail) : undefined,
        size: 0,
        mediaType: "music" as any,
        type: "song" as any,
      } as MediaItem;
    });
  }

  async getItem(): Promise<MediaItem | null> { return null; }
  async getStreamUrl(itemId: string): Promise<string | null> {
    const match = itemId.match(/http_.*_(https?:\/\/.*)_\d+$/);
    if (match) return match[1];
    return itemId.replace(`http_${this.id}_`, "").split(/_\d+$/)[0];
  }
  async search(): Promise<MediaItem[]> { return []; }
}
