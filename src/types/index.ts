export type MediaType = "video" | "audio" | "image" | "unknown";

export interface MediaItem {
  id: string;
  sourceId: string;
  name: string;
  title?: string;
  path?: string;
  uri?: string;
  size?: number;
  duration?: number;
  mimeType?: string;
  mediaType: MediaType;
  type?: "movie" | "episode" | "song" | "file";
  thumbnail?: string;
  year?: number;
  overview?: string;
}

export interface Library {
  id: string;
  name: string;
  path: string;
  mediaType: "movie" | "series" | "music" | "mixed";
}

export interface SourceConfig {
  id: string;
  name: string;
  type: "local" | "gdrive" | "webdav" | "radio";
  enabled: boolean;
  config?: Record<string, any>;
  libraries?: Library[];
}