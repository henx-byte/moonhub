import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig, MediaType } from "../../types";

type ComicPage = { title: string; path: string; thumbnail?: string };
type ComicChapter = { title: string; pages: ComicPage[] | string; cover?: string };
type ComicTitle = { title: string; cover?: string; chapters: ComicChapter[] | string };

export class ComicSource extends Source {
  private baseUrl: string;
  private configData: any = null;
  private loaded = false;

  constructor(config: SourceConfig) {
    super(config);
    this.baseUrl = (config.config as any)?.url || (config.config as any)?.path || "";
    this.baseUrl = this.baseUrl.replace(/\/$/, "");
    console.log(`[ComicSource] ${config.name} -> ${this.baseUrl}`);
  }

  private async fetchJson(url: string): Promise<any> {
    const tries = [
      `${url}/index.json`,
      `${url}/comic.json`,
      `${url}/comic.json`,
      `${url}`,
    ];
    for (const t of tries) {
      try {
        console.log(`[ComicSource] Fetch ${t}`);
        const res = await fetch(t, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const json = await res.json();
        console.log(`[ComicSource] Success ${t} keys=${Object.keys(json)}`);
        return json;
      } catch (e) {
        console.log(`[ComicSource] Fail ${t}`);
      }
    }
    return null;
  }

  private resolve(p: string): string {
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    if (p.startsWith("/")) return `${this.baseUrl}${p}`;
    return `${this.baseUrl}/${p}`;
  }

  private clean(s: string): string {
    try {
      return decodeURIComponent(s).split("/").pop()?.replace(/\.[^/.]+$/, "").replace(/_/g, " ") || s;
    } catch { return s; }
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    this.configData = await this.fetchJson(this.baseUrl);
    if (!this.configData) this.configData = { comic: [] };
  }

  async getLibraries(): Promise<Library[]> {
    await this.load();
    // Comic source cuma punya 1 library: Comic
    const count = this.configData?.comic?.length || this.configData?.comic?.length || this.configData?.manhwa?.length || 0;
    console.log(`[ComicSource] Libraries comic count=${count}`);
    return [
      { id: `${this.id}_comic`, name: "Comic", path: "book", mediaType: "book" } as Library,
      { id: `${this.id}_manhwa`, name: "Manhwa", path: "manhwa", mediaType: "book" } as Library,
    ];
  }

  async getItems(libraryId: string): Promise<MediaItem[]> {
    await this.load();
    let raw = this.configData.comic || this.configData.comic || this.configData.manhwa || this.configData.img || [];

    // Jika raw adalah string path, fetch sub
    if (typeof raw === "string") {
      const sub = await this.fetchJson(this.resolve(raw));
      raw = sub?.comic || sub?.chapters || sub || [];
    }

    if (!Array.isArray(raw)) raw = [];

    console.log(`[ComicSource] getItems ${libraryId} -> ${raw.length} titles`);

    // Case 1: raw is list of comic titles (with chapters)
    // Case 2: raw is list of chapters (flat)
    return raw.map((item: any, idx: number) => {
      const obj = typeof item === "string" ? { title: item, path: item } : item;
      const title = obj.title || `Comic ${idx + 1}`;
      
      // Jika punya chapters, simpen chapters nya di artist field sebagai JSON
      let chapters: any[] = [];
      if (Array.isArray(obj.chapters)) chapters = obj.chapters;
      
      // Jika pages langsung
      let pages: any[] = [];
      if (Array.isArray(obj.pages)) pages = obj.pages;

      return {
        id: `comic_${this.id}_${idx}_${title}`,
        sourceId: this.id,
        name: title,
        title: this.clean(title),
        artist: obj.artist || (chapters.length > 0 ? `${chapters.length} chapters` : undefined),
        path: this.resolve(obj.path || obj.cover || ""),
        uri: this.resolve(obj.path || obj.cover || ""),
        thumbnail: obj.cover ? this.resolve(obj.cover) : obj.thumbnail ? this.resolve(obj.thumbnail) : undefined,
        cover: obj.cover ? this.resolve(obj.cover) : undefined,
        size: 0,
        mediaType: "book" as MediaType,
        type: "book" as any,
        // Simpan raw data buat reader
        extra: {
          chapters: chapters,
          pages: pages,
          rawPath: obj.path,
        },
      } as MediaItem;
    });
  }

  async getChapters(comicItem: MediaItem): Promise<any[]> {
    // Jika extra.chapters ada, pakai itu
    const extra = (comicItem as any).extra;
    if (extra?.chapters && extra.chapters.length > 0) {
      return extra.chapters;
    }
    if (extra?.pages && extra.pages.length > 0) {
      return [{ title: comicItem.title, pages: extra.pages }];
    }
    // Fetch dari path comic
    const path = extra?.rawPath || comicItem.path;
    if (!path) return [];
    const json = await this.fetchJson(this.resolve(path));
    if (!json) return [];
    if (Array.isArray(json)) return json.map((p: any, i: number) => ({ title: `Chapter ${i + 1}`, pages: Array.isArray(p) ? p : [p] }));
    if (Array.isArray(json.chapters)) return json.chapters;
    if (Array.isArray(json.pages)) return [{ title: comicItem.title, pages: json.pages }];
    return [];
  }

  async getPages(chapter: any): Promise<string[]> {
    let pages = chapter.pages || chapter;
    if (typeof pages === "string") {
      const json = await this.fetchJson(this.resolve(pages));
      if (Array.isArray(json)) pages = json;
      else if (Array.isArray(json?.pages)) pages = json.pages;
      else pages = [];
    }
    if (!Array.isArray(pages)) return [];
    return pages.map((p: any) => {
      const obj = typeof p === "string" ? { path: p } : p;
      return this.resolve(obj.path || obj.url || obj);
    });
  }

  async getItem(): Promise<MediaItem | null> { return null; }
  async getStreamUrl(): Promise<string | null> { return null; }
  async search(): Promise<MediaItem[]> { return []; }
}
