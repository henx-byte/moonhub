import { MediaItem, Library, SourceConfig } from "../../types";

export abstract class Source {
  id: string;
  name: string;
  type: SourceConfig["type"];
  enabled: boolean;
  config?: Record<string, any>;

  constructor(config: SourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.enabled = config.enabled ?? true;
    this.config = config.config;
  }

  abstract getLibraries(): Promise<Library[]>;
  abstract getItems(libraryId: string, path?: string): Promise<MediaItem[]>;
  abstract getStreamUrl(itemId: string): Promise<string | null>;
  abstract search(query: string): Promise<MediaItem[]>;
}