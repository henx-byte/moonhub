import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { colors } from "../../src/theme/colors";
import { MediaItem } from "../../src/types";
import { getSourceConfigs } from "../../src/stores/sourceStore";
import { createAllSources } from "../../src/sources/factory";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { usePlayer } from "../../src/context/PlayerContext";

function cleanTitle(input: string): string {
  if (!input) return "Unknown";
  try {
    let t = decodeURIComponent(input);
    t = t.split("/").pop() || t;
    t = t.replace(/^primary:/, "");
    t = t.replace(/^.*Moonhub\//, "");
    t = t.replace(/\.[^/.]+$/, "");
    t = t.replace(/_/g, " ").trim();
    try { t = decodeURIComponent(t); } catch {}
    return t || "Unknown";
  } catch {
    return input.split("/").pop()?.replace(/\.[^/.]+$/, "") || input;
  }
}

export default function LibraryScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [libraries, setLibraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const { current, isPlaying, playUrl, toggle } = usePlayer();

  async function loadLibrary() {
    setLoading(true);
    try {
      const configs = await getSourceConfigs();
      const sources = createAllSources(configs.filter(c => c.enabled));
      let all: MediaItem[] = [];
      let allLibs: any[] = [];
      for (const src of sources) {
        const libs = await src.getLibraries();
        allLibs.push(...libs.map((l: any) => ({ ...l, sourceId: src.id })));
        for (const lib of libs) {
          const its = await src.getItems(lib.id);
          // Inject tab info
          const enriched = its.map((it: any) => ({
            ...it,
            _tab: lib.name.toLowerCase(),
            _tabId: lib.id,
          }));
          all.push(...enriched);
        }
      }
      setItems(all);
      setLibraries(allLibs);
    } finally { setLoading(false); }
  }

  useFocusEffect(useCallback(() => { loadLibrary(); }, []));

  const isThisPlaying = (item: MediaItem) => current?.url === item.uri && isPlaying;
  const isThisCurrent = (item: MediaItem) => current?.url === item.uri;

  const tabs = useMemo(() => {
    const unique = new Map<string, { id: string; name: string; count: number }>();
    unique.set("all", { id: "all", name: "All", count: items.length });
    for (const lib of libraries) {
      const key = lib.name.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, { id: key, name: lib.name, count: 0 });
      }
      unique.get(key)!.count = items.filter((it: any) => it._tab === key).length;
    }
    return Array.from(unique.values()).filter(t => t.count > 0).sort((a, b) => {
      if (a.id === "all") return -1;
      if (b.id === "all") return 1;
      return b.count - a.count;
    });
  }, [libraries, items]);

  const filteredItems = useMemo(() => {
    if (selectedTab === "all") return items;
    return items.filter((it: any) => it._tab === selectedTab);
  }, [items, selectedTab]);

  const renderItem = ({ item }: { item: MediaItem }) => {
    const playing = isThisPlaying(item);
    const isCurrent = isThisCurrent(item);
    const title = cleanTitle(item.title || item.name);
    const subPath = cleanTitle(item.path.split('/').pop() || item.path);

    return (
      <View style={[styles.card, isCurrent && styles.cardActive]}>
        <View style={[styles.iconBox, isCurrent && { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={isCurrent ? "radio" : "musical-notes"} size={20} color={isCurrent ? colors.primary : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, isCurrent && { color: colors.primary }]} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub} numberOfLines={1}>{(item as any)._tab || item.type} • {subPath}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.playBtn, playing && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }]} 
          onPress={() => {
            if (isCurrent) toggle();
            else playUrl(item.uri, title, item.sourceId);
          }}
        >
          <Ionicons name={playing ? "pause" : "play"} size={18} color={playing ? colors.primary : colors.background} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Library</Text>
      <Text style={styles.subHeader}>{filteredItems.length} items • {libraries.length} libs • {tabs.length} tabs</Text>

      {/* Flexible Tabs */}
      <View style={{ height: 48, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, gap: 8, alignItems: "center" }}>
          {tabs.map(tab => {
            const isActive = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setSelectedTab(tab.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: isActive ? colors.background : colors.textSecondary, fontWeight: isActive ? "600" : "400", fontSize: 13 }}>
                  {tab.name} • {tab.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadLibrary}
        contentContainerStyle={{ paddingBottom: 140 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { fontSize: 28, fontWeight: "bold", color: colors.text },
  subHeader: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.card },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 12 },
  title: { color: colors.text, fontWeight: "600", fontSize: 14 },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginLeft: 8 },
});
