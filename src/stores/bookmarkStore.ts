// FIXED BookmarkStore - Stable ID + Persist + gak ilang pas refresh
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaItem } from "../types";

const BOOKMARK_KEY = "moonhub_bookmarks_v2"; // ganti key biar migrasi bersih
const PLAYLIST_KEY = "moonhub_playlists_v2";
const LEGACY_BOOKMARK_KEY = "moonhub_bookmarks_v1";
const LEGACY_PLAYLIST_KEY = "moonhub_playlists_v1";

export interface BookmarkItem extends MediaItem {
  bookmarkedAt: number;
  playlistIds: string[];
  stableId: string; // FIX: stable key biar gak ilang pas refresh
  lastPosition?: number;
  progress?: number;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
  icon?: string;
}

function getStableId(item: MediaItem): string {
  // FIX: Bikin ID stabil dari path/uri/title, bukan id random dari source
  // Kalo source ngasih id random tiap refresh, kita pakai path/uri sebagai kunci
  if ((item as any).stableId) return (item as any).stableId;
  const uri = (item.uri || item.path || "").toLowerCase();
  const title = (item.title || item.name || "").toLowerCase().trim();
  // Buat hash simple dari uri + title
  if (uri) {
    // ambil filename aja biar stabil
    const file = uri.split("/").pop() || uri;
    return `${file}::${title}`.replace(/[^a-z0-9]/g, "_").slice(0, 120);
  }
  return (item.id || title).replace(/[^a-z0-9]/g, "_").slice(0, 120);
}

class BookmarkManager {
  private items: BookmarkItem[] = [];
  private playlists: Playlist[] = [];
  private loaded = false;
  private listeners: (() => void)[] = [];

  async load() {
    if (this.loaded) return;
    try {
      // Coba load v2 dulu, kalo gak ada migrasi dari v1
      let rawItems = await AsyncStorage.getItem(BOOKMARK_KEY);
      let rawPlaylists = await AsyncStorage.getItem(PLAYLIST_KEY);

      if (!rawItems) {
        const legacy = await AsyncStorage.getItem(LEGACY_BOOKMARK_KEY);
        if (legacy) {
          console.log("[Bookmark] Migrasi dari v1 ke v2");
          rawItems = legacy;
          await AsyncStorage.setItem(BOOKMARK_KEY, legacy);
        }
      }
      if (!rawPlaylists) {
        const legacyPl = await AsyncStorage.getItem(LEGACY_PLAYLIST_KEY);
        if (legacyPl) {
          rawPlaylists = legacyPl;
          await AsyncStorage.setItem(PLAYLIST_KEY, legacyPl);
        }
      }

      if (rawItems) {
        const parsed = JSON.parse(rawItems);
        this.items = parsed.map((it: any) => ({
          ...it,
          stableId: it.stableId || getStableId(it),
          playlistIds: it.playlistIds || (it.playlistId ? [it.playlistId] : it.playlistIds?.length ? it.playlistIds : ["fav"]),
        }));
        console.log(`[Bookmark] Loaded ${this.items.length} items`);
      }
      if (rawPlaylists) {
        this.playlists = JSON.parse(rawPlaylists);
        console.log(`[Bookmark] Loaded ${this.playlists.length} playlists`);
      }
      if (this.playlists.length === 0) {
        this.playlists = [
          { id: "fav", name: "Favorit", createdAt: Date.now(), color: "#3b82f6", icon: "heart" },
          { id: "later", name: "Dengerin Nanti", createdAt: Date.now(), color: "#10b981", icon: "time" },
        ];
        await this.savePlaylists();
      }
    } catch (e) {
      console.log("[Bookmark] Load error", e);
      this.items = [];
    }
    this.loaded = true;
    this.notify();
  }

  // FIX: force reload buat debug kalo ilang pas refresh
  async reload() {
    this.loaded = false;
    await this.load();
  }

  private async save() {
    try {
      await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(this.items));
      console.log(`[Bookmark] Saved ${this.items.length} items to ${BOOKMARK_KEY}`);
    } catch (e) { console.log("[Bookmark] Save error", e); }
    this.notify();
  }

  private async savePlaylists() {
    try {
      await AsyncStorage.setItem(PLAYLIST_KEY, JSON.stringify(this.playlists));
      console.log(`[Bookmark] Saved ${this.playlists.length} playlists`);
    } catch (e) { console.log("[Bookmark] Save playlists error", e); }
    this.notify();
  }

  private notify() { this.listeners.forEach(l => l()); }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getPlaylists(): Playlist[] { return [...this.playlists]; }

  async createPlaylist(name: string): Promise<Playlist> {
    await this.load();
    const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
    const playlist: Playlist = { id, name: name.trim(), createdAt: Date.now(), color: colors[Math.floor(Math.random() * colors.length)], icon: "musical-notes" };
    this.playlists.push(playlist);
    await this.savePlaylists();
    return playlist;
  }

  async deletePlaylist(id: string) {
    await this.load();
    if (id === "fav") return; // jangan hapus favorit
    this.playlists = this.playlists.filter(p => p.id !== id);
    this.items = this.items.map(it => ({ ...it, playlistIds: it.playlistIds.filter(pid => pid !== id) })).filter(it => it.playlistIds.length > 0);
    await Promise.all([this.savePlaylists(), this.save()]);
  }

  async renamePlaylist(id: string, newName: string) {
    await this.load();
    const pl = this.playlists.find(p => p.id === id);
    if (pl) { pl.name = newName.trim(); await this.savePlaylists(); }
  }

  async add(item: MediaItem, playlistIds: string[] = ["fav"]) {
    await this.load();
    const stableId = getStableId(item);
    const existingIdx = this.items.findIndex(b => b.stableId === stableId || b.id === item.id || getStableId(b) === stableId);
    if (existingIdx >= 0) {
      const existing = this.items[existingIdx];
      const merged = Array.from(new Set([...existing.playlistIds, ...playlistIds]));
      this.items[existingIdx] = { ...existing, ...item, stableId, id: existing.id, playlistIds: merged } as BookmarkItem;
      console.log(`[Bookmark] Updated ${item.title} -> ${merged.join(",")}`);
    } else {
      const bookmark: BookmarkItem = { ...item, bookmarkedAt: Date.now(), playlistIds, stableId, id: item.id } as BookmarkItem;
      this.items.unshift(bookmark);
      console.log(`[Bookmark] Added ${item.title} stableId=${stableId} to ${playlistIds.join(",")}`);
    }
    await this.save();
  }

  async remove(id: string) {
    await this.load();
    // FIX: hapus by stableId juga
    const stable = getStableId({ id } as any);
    this.items = this.items.filter(b => b.id !== id && b.stableId !== id && b.stableId !== stable);
    await this.save();
  }

  async removeFromPlaylist(itemId: string, playlistId: string) {
    await this.load();
    const stable = getStableId({ id: itemId } as any);
    const idx = this.items.findIndex(b => b.id === itemId || b.stableId === itemId || b.stableId === stable);
    if (idx >= 0) {
      this.items[idx].playlistIds = this.items[idx].playlistIds.filter(pid => pid !== playlistId);
      if (this.items[idx].playlistIds.length === 0) this.items.splice(idx, 1);
      await this.save();
    }
  }

  async toggle(item: MediaItem, playlistId: string = "fav") {
    await this.load();
    const stableId = getStableId(item);
    const exists = this.items.find(b => (b.stableId === stableId || b.id === item.id) && b.playlistIds.includes(playlistId));
    if (exists) {
      await this.removeFromPlaylist(exists.id, playlistId);
      return false;
    } else {
      await this.add(item, [playlistId]);
      return true;
    }
  }

  // FIX: isBookmarked pakai stableId biar sinkron pas refresh
  isBookmarked(id: string, playlistId?: string): boolean {
    const stable = getStableId({ id } as any);
    return this.items.some(b => {
      const match = b.id === id || b.stableId === id || b.stableId === stable || getStableId(b) === stable || b.uri === id || b.path === id;
      if (!match) return false;
      if (playlistId) return b.playlistIds.includes(playlistId);
      return true;
    });
  }

  // FIX: cek by MediaItem full object
  isBookmarkedItem(item: MediaItem, playlistId?: string): boolean {
    const stableId = getStableId(item);
    return this.items.some(b => {
      const match = b.stableId === stableId || b.id === item.id || b.uri === item.uri || b.path === item.path;
      if (!match) return false;
      if (playlistId) return b.playlistIds.includes(playlistId);
      return true;
    });
  }

  getAll(): BookmarkItem[] { return [...this.items]; }
  getByPlaylist(playlistId: string): BookmarkItem[] { return this.items.filter(b => b.playlistIds.includes(playlistId)); }
  getByType(mediaType: string): BookmarkItem[] { return this.items.filter(b => b.mediaType === mediaType); }
  async clear() { this.items = []; await this.save(); }

  // Debug
  async dump() {
    await this.load();
    console.log("[Bookmark] DUMP", JSON.stringify({ items: this.items.length, playlists: this.playlists.length, itemsDetail: this.items.map(i => ({ title: i.title, stableId: i.stableId, id: i.id, playlists: i.playlistIds })) }, null, 2));
    return { items: this.items, playlists: this.playlists };
  }
}

export const bookmarkManager = new BookmarkManager();

import { useEffect, useState } from "react";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    bookmarkManager.load().then(() => {
      if (mounted) {
        setBookmarks(bookmarkManager.getAll());
        setPlaylists(bookmarkManager.getPlaylists());
        setLoading(false);
      }
    });
    const unsub = bookmarkManager.subscribe(() => {
      if (mounted) {
        setBookmarks(bookmarkManager.getAll());
        setPlaylists(bookmarkManager.getPlaylists());
      }
    });
    return () => { mounted = false; unsub(); };
  }, []);

  return {
    bookmarks,
    playlists,
    loading,
    add: (item: MediaItem, playlistIds?: string[]) => bookmarkManager.add(item, playlistIds),
    remove: (id: string) => bookmarkManager.remove(id),
    removeFromPlaylist: (itemId: string, playlistId: string) => bookmarkManager.removeFromPlaylist(itemId, playlistId),
    toggle: (item: MediaItem, playlistId?: string) => bookmarkManager.toggle(item, playlistId),
    isBookmarked: (id: string, playlistId?: string) => bookmarkManager.isBookmarked(id, playlistId),
    isBookmarkedItem: (item: MediaItem, playlistId?: string) => bookmarkManager.isBookmarkedItem(item, playlistId),
    createPlaylist: (name: string) => bookmarkManager.createPlaylist(name),
    deletePlaylist: (id: string) => bookmarkManager.deletePlaylist(id),
    renamePlaylist: (id: string, name: string) => bookmarkManager.renamePlaylist(id, name),
    getByPlaylist: (id: string) => bookmarkManager.getByPlaylist(id),
    clear: () => bookmarkManager.clear(),
    dump: () => bookmarkManager.dump(),
    reload: () => bookmarkManager.reload(),
  };
}
