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
  const uris = [(this as any).config?.folderUri, (this as any).config?.path, this.rawConfig?.config?.folderUri, this.rawConfig?.config?.path].filter(Boolean);
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
   try {
    t = decodeURIComponent(t);
   } catch {}
   return t || "Unknown";
  } catch {
   return (
    input
     .split("/")
     .pop()
     ?.replace(/\.[^/.]+$/, "") || input
   );
  }
 }

 // ===== INTERNAL CACHE - GAK BUTUH IZIN, GAK BIKIN FOLDER DI /Music/ =====
 private async getEmbeddedArtwork(contentUri: string): Promise<string | undefined> {
  try {
   // hash dari uri biar unik, taro di cache internal app (hidden)
   const safe = contentUri.replace(/[^a-z0-9]/gi, "_").slice(-50);
   const thumbDir = FileSystem.cacheDirectory + "thumbs/";
   const cacheFile = thumbDir + `thumb_${safe}.jpg`;

   // bikin folder nya kalau belum ada - ini di internal jadi pasti bisa
   await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true }).catch(() => {});

   // 1. CEK CACHE INTERNAL - kalau udah ada langsung pakai (200 lagu jadi instant)
   try {
    const info: any = await FileSystem.getInfoAsync(cacheFile);
    if (info.exists && info.size > 500) {
     return info.uri || cacheFile;
    }
   } catch {}

   // 2. EXTRACT APIC - cuma baca 200KB biar cepet buat 200 lagu
   const tmp = FileSystem.cacheDirectory + `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
   try {
    const b64 = await FileSystem.readAsStringAsync(contentUri, {
     encoding: FileSystem.EncodingType.Base64 as any,
     length: 200000,
    } as any);
    await FileSystem.writeAsStringAsync(tmp, b64, {
     encoding: FileSystem.EncodingType.Base64,
    });
   } catch {
    return undefined;
   }

   let chunk = "";
   try {
    chunk = await FileSystem.readAsStringAsync(tmp, {
     encoding: FileSystem.EncodingType.Base64,
     length: 200000,
    } as any);
   } catch {}
   await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => {});
   if (!chunk) return undefined;

   // decode base64 -> binary
   const binary = typeof atob !== "undefined" ? atob(chunk) : (global as any).Buffer ? (global as any).Buffer.from(chunk, "base64").toString("binary") : "";
   if (!binary) return undefined;
   const bytes = new Uint8Array(binary.length);
   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;

   if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return undefined;
   const id3Size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
   let off = 10;
   let foundB64: string | undefined;
   let mime = "image/jpeg";

   while (off + 10 < bytes.length && off < id3Size + 10) {
    const id = String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = (bytes[off + 4] << 24) | (bytes[off + 5] << 16) | (bytes[off + 6] << 8) | bytes[off + 7];
    if (size <= 0 || size > 8 * 1024 * 1024) break;
    if (id === "APIC") {
     let p = off + 10;
     const enc = bytes[p];
     p += 1;
     let me = p;
     while (me < bytes.length && bytes[me] !== 0) me++;
     const m = String.fromCharCode(...bytes.slice(p, me)).toLowerCase();
     p = me + 1;
     p += 1; // pic type
     if (enc === 0 || enc === 3) {
      while (p < bytes.length && bytes[p] !== 0) p++;
      p += 1;
     } else {
      while (p + 1 < bytes.length && !(bytes[p] === 0 && bytes[p + 1] === 0)) p++;
      p += 2;
     }
     const imgStart = p;
     const imgEnd = off + 10 + size;
     if (imgStart >= imgEnd) break;
     const img = bytes.slice(imgStart, imgEnd);
     let s = "";
     for (let i = 0; i < img.length; i++) s += String.fromCharCode(img[i]);
     try {
      foundB64 = btoa(s);
     } catch {
      foundB64 = (global as any).Buffer ? (global as any).Buffer.from(s, "binary").toString("base64") : undefined;
     }
     mime = m.includes("png") ? "image/png" : "image/jpeg";
     break;
    }
    off += 10 + size;
   }

   if (!foundB64 || foundB64.length < 800) return undefined;

   // 3. SIMPAN KE INTERNAL CACHE (bukan ke /Music/)
   try {
    await FileSystem.writeAsStringAsync(cacheFile, foundB64, {
     encoding: FileSystem.EncodingType.Base64,
    });
    const info: any = await FileSystem.getInfoAsync(cacheFile);
    if (info.exists) return info.uri || cacheFile;
   } catch {}

   // fallback kalau write gagal, tetep muncul pake data uri
   return `data:${mime};base64,${foundB64}`;
  } catch (e) {
   console.log("[LocalSource] thumb err", e);
   return undefined;
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
   const found = children.find((c) => decodeURIComponent(c).toLowerCase().includes(cleanName.toLowerCase()));
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
    const found = files.find((f) => f.toLowerCase().includes(cfgName));
    if (found) {
     configFileUri = found;
     break;
    }
   }
   if (!configFileUri) return;
   let content: string;
   if (configFileUri.startsWith("content://") || folderUri.startsWith("content://")) {
    content = await StorageAccessFramework.readAsStringAsync(configFileUri);
   } else {
    content = await FileSystem.readAsStringAsync(configFileUri);
   }
   this.fileConfig = JSON.parse(content);
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

    // extract thumbnail dengan cache internal (no permission needed)
    let thumb: string | undefined;
    if (isMusic) {
     thumb = await this.getEmbeddedArtwork(fullPath);
    }

    items.push({
     id: `local_${fullPath}_${Math.random().toString(36).slice(2, 6)}`,
     sourceId: this.id,
     name: fileName,
     title: this.cleanTitle(fileName),
     path: fullPath,
     uri: fullPath,
     size: 0,
     mediaType,
     type: (mediaType === "music" ? "song" : mediaType === "video" ? "movie" : "chapter") as any,
     thumbnail: thumb,
     cover: thumb,
    } as any);
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
   const keys = Object.keys(this.fileConfig).filter((k) => k !== "name");
   for (const key of keys) {
    const val = this.fileConfig[key];
    if (val === undefined) continue;
    if (Array.isArray(val)) {
     let mt: MediaType = "mixed";
     if (["music", "audio", "song", "radio"].includes(key)) mt = "music";
     else if (["video", "movie"].includes(key)) mt = "video";
     else if (["img", "image", "images", "book", "comic"].includes(key)) mt = "image";
     libs.push({ id: `${this.id}_${key}`, name: key.charAt(0).toUpperCase() + key.slice(1), path: base, mediaType: mt } as Library);
    } else if (typeof val === "string") {
     const uri = await this.resolveChildUri(base, val);
     let mt: MediaType = "mixed";
     if (["music", "audio"].includes(key)) mt = "music";
     else if (["video"].includes(key)) mt = "video";
     else if (["img", "image"].includes(key)) mt = "image";
     libs.push({ id: `${this.id}_${key}`, name: key.charAt(0).toUpperCase() + key.slice(1), path: uri, mediaType: mt } as Library);
    }
   }
   if (libs.length > 0) return libs;
  }

  return [{ id: `${this.id}_lib`, name: this.fileConfig?.name || this.rawConfig?.name || "Local", path: folderUri, mediaType: "mixed" } as Library];
 }

 async getItems(libraryId: string, path?: string): Promise<MediaItem[]> {
  const libs = await this.getLibraries();
  const library = libs.find((l) => l.id === libraryId) || libs[0];
  const targetPath = path || library?.path;
  if (!targetPath) return [];
  if (this.fileConfig) {
   const key = libraryId.replace(`${this.id}_`, "");
   const raw = this.fileConfig[key];
   if (Array.isArray(raw)) {
    return raw.map(
     (it: any, idx: number) =>
      ({
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
      }) as MediaItem,
    );
   }
  }
  return this.scanFolder(targetPath, (library?.mediaType as MediaType) || ("mixed" as any));
 }

 async getItem(): Promise<MediaItem | null> {
  return null;
 }
 async getStreamUrl(itemId: string): Promise<string | null> {
  const m = itemId.match(/local_(.*)_[a-z0-9]{4}$/);
  if (m) return m[1];
  if (itemId.startsWith("local_")) {
   const parts = itemId.split("_");
   if (parts.length >= 3) return parts.slice(1, -1).join("_");
  }
  return itemId;
 }
 async search(): Promise<MediaItem[]> {
  return [];
 }
}
