import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { colors } from "../../src/theme/colors";
import { useSources } from "../../src/hooks/useSources";
import { usePlayer } from "../../src/context/PlayerContext";
import { MediaItem } from "../../src/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useBookmarks } from "../../src/stores/bookmarkStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { getSourceConfigs, saveSourceConfigs } from "../../src/stores/sourceStore";

export default function HomeScreen() {
  const { sources, loading: sourcesLoading, refresh: refreshSources } = useSources() as any;
  const player = usePlayer();
  const router = useRouter();
  const { isBookmarkedItem } = useBookmarks();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAllSources = useCallback(async () => {
    if (sources.length === 0) { setSections([]); setLoading(false); return; }
    setLoading(true);
    const allSections: any[] = [];
    for (const src of sources) {
      try {
        if (src.id === "radio_default") continue;
        const libs = await src.getLibraries();
        const allItems: MediaItem[] = [];
        for (const lib of libs) { try { const items = await src.getItems(lib.id); allItems.push(...items); } catch {} }
        if (allItems.length > 0) allSections.push({ sourceId: src.id, sourceName: "Musik HP", sourceType: "local", items: allItems });
      } catch {}
    }
    setSections(allSections);
    setLoading(false);
  }, [sources]);

  // AUTO SETUP: kalau belum ada folder lokal, langsung minta izin
  useEffect(() => {
    (async () => {
      const cfgs = await getSourceConfigs();
      const local = cfgs.find((c: any) => c.type === "local");
      if (!local || !local.config?.folderUri) {
        // Tampilkan dialog dulu biar user ngerti
        Alert.alert(
          "Scan Musik HP?",
          "Biar Home langsung nampilin lagu di HP kamu, pilih folder Music / Download ya mon",
          [
            { text: "Nanti", style: "cancel" },
            { 
              text: "Pilih Folder", 
              onPress: async () => {
                try {
                  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
                  if (perm.granted) {
                    const updated = cfgs.map((c: any) => c.type === "local" ? { ...c, config: { ...c.config, folderUri: perm.directoryUri, path: perm.directoryUri } } : c);
                    await saveSourceConfigs(updated);
                    if (refreshSources) await refreshSources();
                  }
                } catch (e) { console.log(e); }
              }
            }
          ]
        );
      }
    })();
  }, []);

  useEffect(() => { loadAllSources(); }, [loadAllSources]);
  const onRefresh = async () => { setRefreshing(true); if (refreshSources) await refreshSources(); await loadAllSources(); setRefreshing(false); };

  function handlePlay(item: MediaItem, sectionItems: MediaItem[]) {
    if (item.mediaType === "manga") {
      router.push({ pathname: "/manga", params: { title: item.title, sourceId: item.sourceId, mangaId: item.id, cover: item.cover || item.thumbnail || "", path: item.path } } as any);
      return;
    }
    player.play(item, sectionItems);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>Home</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{sections.length} sources • {sections.reduce((a, s) => a + s.items.length, 0)} items</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: colors.card, padding: 10, borderRadius: 12 }}>
          <Ionicons name="refresh" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {sourcesLoading || loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textMuted, marginTop: 8 }}>Scanning musik di HP...</Text></View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 30 }}>
          <Ionicons name="folder-open-outline" size={56} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 12, textAlign: "center" }}>Belum ada folder musik</Text>
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 6, fontSize: 12 }}>Pencet tombol di bawah buat pilih folder Music / Download di HP kamu, nanti langsung auto-scan</Text>
          <TouchableOpacity onPress={async () => {
            try {
              const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (perm.granted) {
                const cfgs = await getSourceConfigs();
                const updated = cfgs.map((c: any) => c.type === "local" ? { ...c, config: { ...c.config, folderUri: perm.directoryUri, path: perm.directoryUri } } : c);
                await saveSourceConfigs(updated);
                if (refreshSources) await refreshSources();
              }
            } catch {}
          }} style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 16 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Pilih Folder Musik</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.sourceId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item: section }) => (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                  <Ionicons name="phone-portrait" size={16} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text, fontWeight: "600" }}>{section.sourceName} • {section.items.length} lagu</Text>
              </View>
              <FlatList
                data={section.items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id + i.uri}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const isCurrent = player.current?.id === item.id;
                  return (
                    <TouchableOpacity style={{ width: 120, backgroundColor: colors.card, borderRadius: 12, padding: 10, borderWidth: isCurrent ? 1 : 0, borderColor: colors.primary }} onPress={() => handlePlay(item, section.items)}>
                      <View style={{ width: 100, height: 100, backgroundColor: colors.background, borderRadius: 8, justifyContent: "center", alignItems: "center" }}><Ionicons name="musical-notes" size={28} color={colors.primary} /></View>
                      <Text style={{ color: isCurrent ? colors.primary : colors.text, fontWeight: "600", fontSize: 12, marginTop: 8 }} numberOfLines={2}>{item.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }} numberOfLines={1}>{item.artist || "Unknown"}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}