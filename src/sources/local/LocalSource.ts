import { StorageAccessFramework } from "expo-file-system";
import * as FileSystem from "expo-file-system";
import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig, MediaType } from "../../types";

export class LocalSource extends Source {
  private rawConfig: SourceConfig;
  private fileConfig: any = null;
  private configLoaded = false;

  constructor(config: SourceConfig) {
    super(config);
    this.rawConfig = config;
  }

  private getFolderUri(): string | null {
    const uris = [
      (this as any).config?.folderUri,
      (this as any).config?.path,
      this.rawConfig?.config?.folderUri,
      this.rawConfig?.config?.path,
    ].filter(Boolean);
    return uris[0] || null;
  }

  private cleanTitle(input: string): string {
    if (!input) return "Unknown";
    try {
      let t = decodeURIComponent(input);
      t = t.split("/").pop() || t;
      t = t.replace(/^primary:/, "");
      t = t.replace(/^.*Moonhub\//, "");
      t = t.replace(/\.[^/.]+$/, "");
      t = t.replace(/_/g, " ").trim();
      try { t = decodeURIComponent(t); } catch {}
      return t || "Unknown";
    } catch {
      return input.split("/").pop()?.replace(/\.[^/.]+$/, "") || input;
    }
  }

  private async resolveChildUri(baseTreeUri: string, subFolderName: string): Promise<string> {
    if (!subFolderName || subFolderName === "." || subFolderName === "./") return baseTreeUri;
    const cleanName = subFolderName.replace(/^\.\//, "").replace(/\/$/, "").trim();
    const baseDecoded = decodeURIComponent(baseTreeUri).toLowerCase();
    if (baseDecoded.endsWith(cleanName.toLowerCase())) return baseTreeUri;
    try {
      let children: string[] = [];
      if (baseTreeUri.startsWith("content://")) {
        children = await StorageAccessFramework.readDirectoryAsync(baseTreeUri);
      } else {
        children = await FileSystem.readDirectoryAsync(baseTreeUri);
      }
      for (const childUri of children) {
        const decoded = decodeURIComponent(childUri).toLowerCase();
        if (decoded.includes(`/${cleanName.toLowerCase()}`)) return childUri;
      }
      const found = children.find(c => decodeURIComponent(c).toLowerCase().includes(cleanName.toLowerCase()));
      if (found) return found;
      return baseTreeUri;
    } catch {
      return baseTreeUri;
    }
  }

  private async loadFileConfig(folderUri: string) {
    if (this.configLoaded) return;
    this.configLoaded = true;
    try {
      let files: string[] = [];
      if (folderUri.startsWith("content://")) {
        files = await StorageAccessFramework.readDirectoryAsync(folderUri);
      } else {
        files = await FileSystem.readDirectoryAsync(folderUri);
      }
      const configNames = ["index.json", "moonhub.json", "config.json"];
      let configFileUri: string | null = null;
      for (const cfgName of configNames) {
        const found = files.find(f => f.toLowerCase().includes(cfgName));
        if (found) { configFileUri = found; break; }
      }
      if (!configFileUri) return;
      let content: string;
      if (configFileUri.startsWith("content://") || folderUri.startsWith("content://")) {
        content = await StorageAccessFramework.readAsStringAsync(configFileUri);
      } else {
        content = await FileSystem.readAsStringAsync(configFileUri);
      }
      this.fileConfig = JSON.parse(content);
      console.log(`[LocalSource] Config loaded: ${this.fileConfig.name} keys=${Object.keys(this.fileConfig)}`);
    } catch (e) {
      console.log("[LocalSource] Config load error", e);
    }
  }

  private async scanFolder(targetUri: string, mediaType: MediaType): Promise<MediaItem[]> {
    try {
      let files: string[] = [];
      if (targetUri.startsWith("content://")) {
        files = await StorageAccessFramework.readDirectoryAsync(targetUri);
      } else {
        files = await FileSystem.readDirectoryAsync(targetUri);
      }
      console.log(`[LocalSource] Scan ${mediaType} ${targetUri} -> ${files.length} files`);
      const items: MediaItem[] = [];
      for (const entry of files) {
        const isSAF = targetUri.startsWith("content://");
        const fullPath = isSAF ? entry : `${targetUri}/${entry}`;
        const fileName = isSAF ? decodeURIComponent(fullPath.split("/").pop() || "") : entry;
        if (!fileName || fileName.startsWith(".")) continue;
        if (["index.json", "moonhub.json", "config.json"].includes(fileName.toLowerCase())) continue;
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const isMusic = ["mp3", "m4a", "flac", "wav", "aac", "ogg", "opus"].includes(ext);
        const isVideo = ["mp4", "mkv", "avi", "mov", "webm", "m4v"].includes(ext);
        const isImg = ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
        if (mediaType === "music" && !isMusic) continue;
        if (mediaType === "video" && !isVideo) continue;
        if (mediaType === "image" && !isImg) continue;
        if (mediaType === "mixed" && !isMusic && !isVideo && !isImg) continue;

        items.push({
          id: `local_${fullPath}_${Math.random().toString(36).slice(2,6)}`,
          sourceId: this.id,
          name: fileName,
          title: this.cleanTitle(fileName),
          path: fullPath,
          uri: fullPath,
          size: 0,
          mediaType,
          type: (mediaType === "music" ? "song" : mediaType === "video" ? "movie" : "chapter") as any,
        } as MediaItem);
      }
      return items;
    } catch (e) {
      console.log(`[LocalSource] scan error ${targetUri}`, e);
      return [];
    }
  }

  async getLibraries(): Promise<Library[]> {
    const folderUri = this.getFolderUri();
    if (!folderUri) return this.libraries || [];
    await this.loadFileConfig(folderUri);

    if (this.fileConfig) {
      const libs: Library[] = [];
      const base = folderUri;
      const keys = Object.keys(this.fileConfig).filter(k => k !== "name");
      
      for (const key of keys) {
        const val = this.fileConfig[key];
        if (val === undefined) continue;

        // Jika array langsung, buat library
        if (Array.isArray(val)) {
          let mt: MediaType = "mixed";
          if (["music", "audio", "song", "radio"].includes(key)) mt = "music";
          else if (["video", "movie"].includes(key)) mt = "video";
          else if (["img", "image", "images", "manga", "comic"].includes(key)) mt = "image";
          
          libs.push({
            id: `${this.id}_${key}`,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            path: base,
            mediaType: mt,
          } as Library);
        } else if (typeof val === "string") {
          // Jika string path seperti "Music", "Video", "."
          const uri = await this.resolveChildUri(base, val);
          let mt: MediaType = "mixed";
          if (["music", "audio"].includes(key)) mt = "music";
          else if (["video"].includes(key)) mt = "video";
          else if (["img", "image"].includes(key)) mt = "image";
          
          libs.push({
            id: `${this.id}_${key}`,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            path: uri,
            mediaType: mt,
          } as Library);
        }
      }
      if (libs.length > 0) {
        console.log(`[LocalSource] Libraries: ${libs.map(l => `${l.name}:${l.path}`).join(", ")}`);
        return libs;
      }
    }

    return [{
      id: `${this.id}_lib`,
      name: this.fileConfig?.name || this.rawConfig?.name || "Local",
      path: folderUri,
      mediaType: "mixed",
    } as Library];
  }

  async getItems(libraryId: string, path?: string): Promise<MediaItem[]> {
    const libs = await this.getLibraries();
    const library = libs.find(l => l.id === libraryId) || libs[0];
    const targetPath = path || library?.path;
    if (!targetPath) return [];

    if (this.fileConfig) {
      const key = libraryId.replace(`${this.id}_`, "");
      const raw = this.fileConfig[key];
      if (Array.isArray(raw)) {
        console.log(`[LocalSource] getItems from array ${key} -> ${raw.length}`);
        return raw.map((it: any, idx: number) => ({
          id: `local_${it.path}_${idx}`,
          sourceId: this.id,
          name: it.title,
          title: this.cleanTitle(it.title || it.path),
          path: it.path,
          uri: it.path,
          size: 0,
          mediaType: library?.mediaType as MediaType,
          type: "song" as any,
          thumbnail: it.thumbnail,
        } as MediaItem));
      }
    }

    console.log(`[LocalSource] getItems scan ${library?.name} -> ${targetPath}`);
    return this.scanFolder(targetPath, (library?.mediaType as MediaType) || "mixed" as any);
  }

  async getItem(): Promise<MediaItem | null> { return null; }
  async getStreamUrl(itemId: string): Promise<string | null> {
    const m = itemId.match(/local_(.*)_[a-z0-9]{4}$/);
    if (m) return m[1];
    // Fallback untuk array format
    if (itemId.startsWith("local_")) {
      const parts = itemId.split("_");
      if (parts.length >= 3) {
        // local_path_idx -> ambil path
        return parts.slice(1, -1).join("_");
      }
    }
    return itemId;
  }
  async search(): Promise<MediaItem[]> { return []; }
}
