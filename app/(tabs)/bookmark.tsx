// FIXED Bookmark - hanya 1 export default, fix property is not configurable
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from "react-native";
import { colors } from "../../src/theme/colors";
import { useBookmarks, BookmarkItem } from "../../src/stores/bookmarkStore";
import { useVideoPlayer } from "../../src/context/VideoContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BookmarkScreen() {
  const { bookmarks, playlists, removeFromPlaylist, deletePlaylist, createPlaylist } = useBookmarks();
  const player = useVideoPlayer();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  function handlePlay(item: BookmarkItem, list: BookmarkItem[]) {
    if (item.mediaType === "manga") {
      router.push({ pathname: "/manga", params: { title: item.title, sourceId: item.sourceId, mangaId: item.id, cover: item.cover || item.thumbnail || "", path: item.path, extra: item.extra ? JSON.stringify(item.extra) : "" } } as any);
      return;
    }
    player.play(item, list);
  }

  function handleCreate() {
    if (!newPlaylistName.trim()) return Alert.alert("Nama kosong mon!");
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setShowCreateModal(false);
  }

  const displayedItems = selectedPlaylist ? bookmarks.filter(b => b.playlistIds.includes(selectedPlaylist)) : [];
  const currentPlaylist = playlists.find(p => p.id === selectedPlaylist);

  if (selectedPlaylist && currentPlaylist) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{currentPlaylist.name}</Text>
            <Text style={styles.headerSub}>{displayedItems.length} items</Text>
          </View>
        </View>

        <FlatList
          data={displayedItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => {
            const isCurrent = player.current?.id === item.id;
            const isPlaying = isCurrent && player.isPlaying;
            return (
              <View style={[styles.card, isCurrent && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                <TouchableOpacity style={{ flex: 1, flexDirection: "row", alignItems: "center" }} onPress={() => handlePlay(item, displayedItems)}>
                  <View style={[styles.icon, isCurrent && { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name={isPlaying ? "pause" : "musical-notes"} size={20} color={isCurrent ? colors.primary : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, isCurrent && { color: colors.primary }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.sub}>{isCurrent ? (isPlaying ? "• Playing" : "• Paused") : "music"} • {new Date(item.bookmarkedAt).toLocaleDateString()}</Text>
                  </View>
                  <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={isCurrent ? colors.primary : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromPlaylist(item.id, selectedPlaylist)} style={styles.removeBtn}><Ionicons name="close" size={14} color={colors.textMuted} /></TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Bookmark</Text>
          <Text style={styles.headerSub}>{playlists.length} playlists • {bookmarks.length} items</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}><Ionicons name="add" size={20} color="#000" /></TouchableOpacity>
      </View>

      <FlatList
        key="playlist-grid-2-fixed"
        data={playlists}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 120, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item: pl }) => {
          const count = bookmarks.filter(b => b.playlistIds.includes(pl.id)).length;
          const isPlayingInThis = player.queue.some((q:any) => bookmarks.filter(b => b.playlistIds.includes(pl.id)).some(bb => bb.id === q.id)) && player.isPlaying;
          return (
            <TouchableOpacity style={[styles.playlistCard, isPlayingInThis && { borderColor: colors.primary }]} onPress={() => setSelectedPlaylist(pl.id)} onLongPress={() => Alert.alert(pl.name, `${count} items`, [{ text: "Batal", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => deletePlaylist(pl.id) }])}>
              <View style={[styles.playlistCover, { backgroundColor: (pl.color || colors.primary) + "20", borderColor: pl.color || colors.primary }]}>
                <Ionicons name="musical-notes" size={28} color={pl.color || colors.primary} />
                {isPlayingInThis && <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: colors.primary, borderRadius: 10, padding: 4 }}><Ionicons name="play" size={10} color="#000" /></View>}
                <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>
              </View>
              <Text style={styles.playlistName} numberOfLines={1}>{pl.name}</Text>
              <Text style={styles.playlistSub}>{count} items {isPlayingInThis ? "• Playing" : ""}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buat Playlist Baru</Text>
            <TextInput style={styles.modalInput} placeholder="Nama playlist..." placeholderTextColor={colors.textMuted} value={newPlaylistName} onChangeText={setNewPlaylistName} autoFocus />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.card }]} onPress={() => setShowCreateModal(false)}><Text style={{ color: colors.text }}>Batal</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}><Text style={{ color: "#000", fontWeight: "700" }}>Buat</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  playlistCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12 },
  playlistCover: { width: "100%", height: 80, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center", marginBottom: 10, position: "relative" },
  countBadge: { position: "absolute", top: 6, right: 6, backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  countText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  playlistName: { color: colors.text, fontWeight: "700", fontSize: 13 },
  playlistSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 12 },
  title: { color: colors.text, fontWeight: "600", fontSize: 13 },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, fontSize: 14 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
});
