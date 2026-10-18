export type MediaType = "video" | "music" | "image";

export type LibraryMediaType = MediaType | "mixed";

export interface MediaItem {
  id: string; 
  sourceId: string;
  name: string; 
  title?: string; 
  path: string; 
  uri: string; 
  size?: number;
  duration?: number;
  mimeType?: string; 
  mediaType: MediaType; 
  type?: "movie" | "episode" | "song" | "chapter" | "file";
  thumbnail?: string;
}

export interface Library {
  id: string;
  name: string; 
  path: string; 
  mediaType: LibraryMediaType; 
}

export interface SourceConfig {
  id: string;
  name: string;
  type: "local" | "gdrive" | "radio";
  enabled: boolean;
  config?: Record<string, any>; 
  libraries?: Library[];
}