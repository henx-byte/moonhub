import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig, MediaType } from "../../types";

type RemoteItem = { title: string; path: string; artist?: string; thumbnail?: string; cover?: string; chapters?: any[]; pages?: any[] };

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
  }

  private async fetchJson(url: string): Promise<any> {
    const tries = [
      `${url}/index.json`,
      `${url}/config.json`,
      `${url}/moonhub.json`,
      `${url}/manga.json`,
      `${url}`,
      `${url}/api`,
    ];
    for (const tryUrl of tries) {
      try {
        console.log(`[HttpSource] Fetching ${tryUrl}`);
        const res = await fetch(tryUrl, { headers: { "Accept": "application/json" } });
        if (!res.ok) continue;
        const json = await res.json();
        console.log(`[HttpSource] Success from ${tryUrl}: ${json.name} | manga=${json.manga?.length}`);
        return json;
      } catch (e) {
        console.log(`[HttpSource] Fail ${tryUrl}`);
      }
    }
    throw new Error(`Gagal fetch config dari ${url}`);
  }

  private async loadConfig() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      this.fileConfig = await this.fetchJson(this.baseUrl);
      console.log(`[HttpSource] Loaded: ${this.fileConfig.name} | keys: ${Object.keys(this.fileConfig)}`);
    } catch (e) {
      console.log("[HttpSource] Load error", e);
      this.fileConfig = { name: this.rawConfig.name, music: [] };
    }
  }

  async getLibraries(): Promise<Library[]> {
    await this.loadConfig();
    const libs: Library[] = [];
    if (this.fileConfig?.music !== undefined) {
      libs.push({ id: `${this.id}_music`, name: "Music", path: "music", mediaType: "music" } as Library);
    }
    if (this.fileConfig?.video !== undefined) {
      libs.push({ id: `${this.id}_video`, name: "Video", path: "video", mediaType: "video" } as Library);
    }
    if (this.fileConfig?.img || this.fileConfig?.image) {
      libs.push({ id: `${this.id}_img`, name: "Images", path: "img", mediaType: "image" } as Library);
    }
    if (this.fileConfig?.manga || this.fileConfig?.comic || this.fileConfig?.manhwa) {
      libs.push({ id: `${this.id}_manga`, name: "Manga", path: "manga", mediaType: "manga" } as Library);
    }
    if (libs.length === 0) {
      return [{ id: `${this.id}_lib`, name: this.fileConfig?.name || "Remote", path: "mixed", mediaType: "mixed" } as Library];
    }
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
    let raw: any = null;
    let mediaType: MediaType = "music";

    if (libraryId.includes("music")) {
      raw = this.fileConfig.music;
      mediaType = "music";
    } else if (libraryId.includes("video")) {
      raw = this.fileConfig.video;
      mediaType = "video";
    } else if (libraryId.includes("img")) {
      raw = this.fileConfig.img || this.fileConfig.image;
      mediaType = "image";
    } else if (libraryId.includes("manga")) {
      raw = this.fileConfig.manga || this.fileConfig.comic || this.fileConfig.manhwa;
      mediaType = "manga";
    } else {
      const all = [
        ...(Array.isArray(this.fileConfig.music) ? this.fileConfig.music : []),
        ...(Array.isArray(this.fileConfig.video) ? this.fileConfig.video : []),
        ...(Array.isArray(this.fileConfig.img) ? this.fileConfig.img : []),
        ...(Array.isArray(this.fileConfig.manga) ? this.fileConfig.manga : []),
      ];
      raw = all;
    }

    if (!raw) return [];
    if (typeof raw === "string") return [];

    const arr: RemoteItem[] = Array.isArray(raw) ? raw : [];

    return arr.map((it, idx) => {
      const obj = typeof it === "string" ? { title: it, path: it } : it as RemoteItem;
      const title = obj.title || `Item ${idx + 1}`;
      const fullPath = this.resolvePath(obj.path);
      
      // FIX: SIMPEN CHAPTERS & PAGES biar gak 0 chapters
      const extra = {
        chapters: (obj as any).chapters || [],
        pages: (obj as any).pages || [],
        rawPath: obj.path,
        cover: obj.cover,
      };

      return {
        id: `http_${this.id}_${fullPath}_${idx}`,
        sourceId: this.id,
        name: title,
        title: title,
        artist: obj.artist || ((obj as any).chapters ? `${(obj as any).chapters.length} chapters` : undefined),
        path: fullPath,
        uri: fullPath,
        thumbnail: obj.thumbnail ? this.resolvePath(obj.thumbnail) : obj.cover ? this.resolvePath(obj.cover) : undefined,
        cover: obj.cover ? this.resolvePath(obj.cover) : undefined,
        size: 0,
        mediaType,
        type: (mediaType === "music" ? "song" : mediaType === "video" ? "movie" : "manga") as any,
        extra, // FIX PENTING
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
