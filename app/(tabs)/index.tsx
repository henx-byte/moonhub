// FIXED Home - pakai isBookmarkedItem biar sinkron walau id ganti pas refresh
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { colors } from "../../src/theme/colors";
import { useSources } from "../../src/hooks/useSources";
import { usePlayer } from "../../src/context/PlayerContext";
import { MediaItem, SourceConfig } from "../../src/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useBookmarks } from "../../src/stores/bookmarkStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function cleanSourceName(src: any): { name: string; type: string } {
  const config: SourceConfig = src.config || src;
  const id = src.id || config.id || "";
  const rawName = config.name || "";
  const cfg = config.config as any || {};
  const path = cfg.path || cfg.folderUri || cfg.url || "";
  let type = (config.type as string) || "unknown";
  if (type === "unknown" || !type) {
    if (id.includes("radio") || rawName.toLowerCase().includes("radio")) type = "radio";
    else if (id.includes("local") || path.includes("external") || path.includes("content://")) type = "local";
    else if (id.includes("cloud") || path.startsWith("http")) type = "cloud";
  }
  let name = rawName;
  if (!name || name === "Source" || name.startsWith("content://") || name.startsWith("http") || name.length > 30) {
    if (type === "radio") name = "Radio"; else if (type === "local") name = "Local"; else if (type === "cloud") name = "Cloud 1"; else name = "Source";
  }
  if (name.startsWith("content://")) name = "Moonhub";
  return { name, type };
}

export default function HomeScreen() {
  const { sources, loading: sourcesLoading, refresh: refreshSources } = useSources() as any;
  const player = usePlayer();
  const router = useRouter();
  const { bookmarks, playlists, toggle, isBookmarkedItem, createPlaylist } = useBookmarks();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [pickerItem, setPickerItem] = useState<MediaItem | null>(null);

  const loadAllSources = useCallback(async () => {
    if (sources.length === 0) { setSections([]); setLoading(false); return; }
    setLoading(true);
    const allSections: any[] = [];
    for (const src of sources) {
      try {
        const { name, type } = cleanSourceName(src);
        const libs = await src.getLibraries();
        const allItems: MediaItem[] = [];
        for (const lib of libs) { try { const items = await src.getItems(lib.id); allItems.push(...items); } catch {} }
        if (allItems.length > 0) allSections.push({ sourceId: src.id, sourceName: name, sourceType: type, items: allItems });
      } catch {}
    }
    setSections(allSections);
    setLoading(false);
  }, [sources]);

  useEffect(() => { loadAllSources(); }, [loadAllSources]);
  const onRefresh = async () => { setRefreshing(true); if (refreshSources) await refreshSources(); await loadAllSources(); setRefreshing(false); };

  function handlePlay(item: MediaItem, sectionItems: MediaItem[]) {
    if (item.mediaType === "manga") {
      router.push({ pathname: "/manga", params: { title: item.title, sourceId: item.sourceId, mangaId: item.id, cover: item.cover || item.thumbnail || "", path: item.path, extra: item.extra ? JSON.stringify(item.extra) : "" } } as any);
      return;
    }
    player.play(item, sectionItems);
  }

  function handleLongPress(item: MediaItem) { setPickerItem(item); setShowPlaylistPicker(true); }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.singleHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>{sections.length} sources • {sections.reduce((a, s) => a + s.items.length, 0)} items • {bookmarks.length} bookmarked</Text>
      </View>

      {sourcesLoading || loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.sourceId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: section }) => (
            <View style={styles.sourceSection}>
              <View style={styles.sourceHeader}>
                <View style={styles.sourceIcon}><Ionicons name={section.sourceType === "local" ? "phone-portrait" : section.sourceType === "cloud" ? "cloud" : "radio"} size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}><Text style={styles.sourceName}>{section.sourceName}</Text><Text style={styles.sourceMeta}>{section.sourceType} • {section.items.length} items</Text></View>
              </View>
              <FlatList
                data={section.items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id + i.uri}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 8 }}
                renderItem={({ item }) => {
                  // FIX: pakai isBookmarkedItem biar sinkron walau id berubah pas refresh
                  const bookmarked = isBookmarkedItem(item);
                  const isCurrent = player.current?.id === item.id || player.current?.uri === item.uri;
                  const isPlaying = isCurrent && player.isPlaying;
                  return (
                    <TouchableOpacity style={[styles.card, isCurrent && { borderColor: colors.primary, borderWidth: 1.5 }, bookmarked && !isCurrent && { borderColor: colors.primary + "60" }]} onPress={() => handlePlay(item, section.items)} onLongPress={() => handleLongPress(item)}>
                      <View style={[styles.cardThumb, isCurrent && { backgroundColor: colors.primary + "20" }]}>
                        <Ionicons name={isPlaying ? "pause" : "musical-notes"} size={22} color={isCurrent ? colors.primary : colors.primary} />
                        {bookmarked && <View style={styles.bookmarkedDot}><Ionicons name="bookmark" size={10} color="#000" /></View>}
                        {isCurrent && <View style={styles.playingBadge}><Ionicons name={isPlaying ? "pause" : "play"} size={8} color="#000" /></View>}
                      </View>
                      <Text style={[styles.cardTitle, isCurrent && { color: colors.primary }]} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>{isCurrent ? (isPlaying ? "• Playing" : "• Paused") : bookmarked ? "• Bookmarked" : item.artist || item.mediaType}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        />
      )}

      <Modal visible={showPlaylistPicker} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Tambah ke Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistPicker(false)}><Ionicons name="close" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
            {pickerItem && <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }} numberOfLines={1}>{pickerItem.title}</Text>}
            <ScrollView style={{ maxHeight: 300 }}>
              {playlists.map((pl) => {
                const isIn = pickerItem ? isBookmarkedItem(pickerItem, pl.id) : false;
                return (
                  <TouchableOpacity key={pl.id} style={[styles.playlistRow, isIn && { backgroundColor: colors.primary + "20", borderColor: colors.primary }]} onPress={async () => { if (!pickerItem) return; await toggle(pickerItem, pl.id); setShowPlaylistPicker(false); }}>
                    <View style={[styles.playlistDot, { backgroundColor: pl.color || colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playlistRowName}>{pl.name}</Text>
                      <Text style={styles.playlistRowSub}>{bookmarks.filter(b => b.playlistIds.includes(pl.id)).length} items</Text>
                    </View>
                    {isIn ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.createRow, { marginTop: 12 }]} onPress={() => {
              Alert.prompt("Buat Playlist Baru", "Nama playlist:", [{ text: "Batal" }, { text: "Buat", onPress: async (name?: string) => { if (!name?.trim()) return; const pl = await createPlaylist(name.trim()); if (pickerItem) await toggle(pickerItem, pl.id); setShowPlaylistPicker(false); } }], "plain-text");
            }}>
              <Ionicons name="add" size={20} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8 }}>Buat Playlist Baru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  singleHeader: { padding: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "bold", color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sourceSection: { marginBottom: 16 },
  sourceHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  sourceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  sourceName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  sourceMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  card: { width: 110, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10 },
  cardThumb: { width: "100%", height: 64, backgroundColor: colors.background, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  bookmarkedDot: { position: "absolute", top: 4, right: 4, backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  playingBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: colors.primary, width: 14, height: 14, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  cardTitle: { color: colors.text, fontSize: 11, fontWeight: "600", lineHeight: 14 },
  cardSub: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, maxWidth: 400 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: "bold" },
  playlistRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, gap: 12 },
  playlistDot: { width: 12, height: 12, borderRadius: 6 },
  playlistRowName: { color: colors.text, fontWeight: "600", fontSize: 13 },
  playlistRowSub: { color: colors.textMuted, fontSize: 11 },
  createRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, borderStyle: "dashed" },
});
