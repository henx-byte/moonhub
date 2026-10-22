// FIXED TYPES - Generic SourceConfig type: string + Bookmark
// Core: Server bisa format apa aja, yang penting return MediaItem[]

export type SourceType = string; 

export type MediaType = 
  | "music" 
  | "video" 
  | "image" 
  | "book" 
  | "comic"
  | "mixed"
  | string; 

export type MediaItemType = "book" | "image" | "video" | "audio" | string;

export interface Library {
  id: string;
  name: string;
  path: string;
  mediaType: MediaType;
  count?: number;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType; 
  enabled: boolean;
  config: {
    path?: string;
    folderUri?: string;
    displayPath?: string;
    url?: string;
    name?: string;
    [key: string]: any;
  };
  libraries: Library[];
}

export interface MediaItem {
  id: string;
  sourceId: string;
  name: string;
  title: string;
  artist?: string;
  album?: string;
  path: string;
  uri: string;
  thumbnail?: string;
  cover?: string;
  size: number;
  mediaType: MediaType;
  type: MediaItemType;
  duration?: number;
  extra?: {
    chapters?: any[];
    pages?: any[];
    rawPath?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Bookmark - Library jadi Bookmark
export interface BookmarkItem extends MediaItem {
  bookmarkedAt: number;
  lastPosition?: number; // buat book/video: halaman / detik terakhir
  progress?: number; // 0-100
}

export interface BookmarkStore {
  items: BookmarkItem[];
  add: (item: MediaItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isBookmarked: (id: string) => boolean;
  getAll: () => BookmarkItem[];
}
