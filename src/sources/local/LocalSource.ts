import * as FileSystem from "expo-file-system";
import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig, MediaType } from "../../types";

export class LocalSource extends Source {
  constructor(config: SourceConfig) {
    super(config);
  }

  async getLibraries(): Promise<Library[]> {
    // Sementara return library default
    // Nanti user bisa pilih folder
    return [
      {
        id: "local_root",
        name: "Internal Storage",
        path: FileSystem.documentDirectory || "",
        mediaType: "mixed",
      },
    ];
  }

  async getItems(libraryId: string, path?: string): Promise<MediaItem[]> {
    try {
      const targetPath = path || FileSystem.documentDirectory;
      if (!targetPath) return [];

      const files = await FileSystem.readDirectoryAsync(targetPath);
      const items: MediaItem[] = [];

      for (const file of files) {
        const fullPath = `\( {targetPath} \){file}`;
        const info = await FileSystem.getInfoAsync(fullPath);

        if (!info.exists) continue;

        const isDirectory = info.isDirectory;
        const mediaType = this.detectMediaType(file);

        items.push({
          id: `local_${fullPath}`,
          sourceId: this.id,
          name: file,
          path: fullPath,
          uri: fullPath,
          size: info.size,
          mediaType: isDirectory ? "unknown" : mediaType,
          type: isDirectory ? "file" : this.detectType(file),
        });
      }

      return items;
    } catch (error) {
      console.log("[LocalSource] getItems error:", error);
      return [];
    }
  }

  async getStreamUrl(itemId: string): Promise<string | null> {
    // itemId format: local_/path/to/file
    const path = itemId.replace("local_", "");
    return path.startsWith("file://") ? path : `file://${path}`;
  }

  async search(query: string): Promise<MediaItem[]> {
    // Sementara sederhana, nanti bisa dikembangkan
    const libraries = await this.getLibraries();
    const results: MediaItem[] = [];

    for (const lib of libraries) {
      const items = await this.getItems(lib.id);
      const filtered = items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      results.push(...filtered);
    }

    return results;
  }

  private detectMediaType(filename: string): MediaType {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) return "video";
    if (["mp3", "m4a", "flac", "wav", "aac", "ogg"].includes(ext)) return "audio";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    return "unknown";
  }

  private detectType(filename: string): "movie" | "episode" | "song" | "file" {
    const lower = filename.toLowerCase();
    if (lower.includes("s0") || lower.includes("e0") || lower.includes("episode")) {
      return "episode";
    }
    if (this.detectMediaType(filename) === "audio") return "song";
    if (this.detectMediaType(filename) === "video") return "movie";
    return "file";
  }
}