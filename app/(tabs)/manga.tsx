import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { colors } from "../../src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSourceConfigs } from "../../src/stores/sourceStore";
import { MediaItem } from "../../src/types";

type PageImageProps = {
  uri: string;
  index: number;
  total: number;
};

function PageImage({ uri, index, total }: PageImageProps) {
  const [error, setError] = useState(false);
  return (
    <View style={styles.pageContainer}>
      {!error ? (
        <Image
          source={{ uri }}
          style={styles.pageImage}
          resizeMode="contain"
          onError={() => setError(true)}
        />
      ) : (
        <View style={[styles.pageImage, { justifyContent: "center", alignItems: "center", backgroundColor: "#111" }]}>
          <Ionicons name="image-outline" size={40} color="#444" />
          <Text style={{ color: "#666", fontSize: 10, marginTop: 8 }}>Gagal load {index + 1}</Text>
          <Text style={{ color: "#444", fontSize: 8, marginTop: 4 }} numberOfLines={2}>{uri.slice(-40)}</Text>
        </View>
      )}
      <View style={styles.pageNumber}>
        <Text style={styles.pageNumberText}>{index + 1} / {total}</Text>
      </View>
    </View>
  );
}

export default function MangaScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [chapters, setChapters] = useState<any[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [loading, setLoading] = useState(true);

  const mangaTitle = (params.title as string) || "Manga";
  const sourceId = params.sourceId as string;
  const cover = params.cover as string;
  const extraParam = params.extra as string;

  useEffect(() => {
    loadChapters();
  }, []);

  function loadChapters() {
    try {
      setLoading(true);
      console.log(`[Manga] params.extra length=${extraParam?.length}`);
      
      if (extraParam) {
        try {
          const extra = JSON.parse(extraParam);
          console.log(`[Manga] extra chapters=${extra.chapters?.length} pages=${extra.pages?.length}`);
          
          if (extra.chapters && extra.chapters.length > 0) {
            setChapters(extra.chapters);
            setLoading(false);
            return;
          }
          if (extra.pages && extra.pages.length > 0) {
            setChapters([{ title: mangaTitle, pages: extra.pages }]);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.log("[Manga] parse extra error", e);
        }
      }

      // Fallback: coba ambil dari title param yang mungkin berisi JSON string chapters
      const chaptersParam = params.chapters as string;
      if (chaptersParam) {
        try {
          const ch = JSON.parse(chaptersParam);
          if (Array.isArray(ch) && ch.length > 0) {
            setChapters(ch);
            setLoading(false);
            return;
          }
        } catch {}
      }

      setChapters([]);
    } catch (e) {
      console.log("Load chapters error", e);
    } finally {
      setLoading(false);
    }
  }

  function resolvePageUrl(p: any): string {
    if (typeof p === "string") {
      if (p.startsWith("http")) return p;
      return p;
    }
    if (p?.path) return p.path.startsWith("http") ? p.path : `http://192.168.1.146:8080${p.path.startsWith("/") ? "" : "/"}${p.path}`;
    if (p?.url) return p.url;
    return String(p);
  }

  function openChapter(idx: number) {
    const chapter = chapters[idx];
    if (!chapter) return;
    
    let pg = chapter.pages || [];
    if (typeof pg === "string") {
      try { pg = JSON.parse(pg); } catch { pg = []; }
    }
    
    const resolved = pg.map((p: any) => resolvePageUrl(p));
    console.log(`[Manga] Chapter ${idx} ${chapter.title} pages=${resolved.length}`);
    
    if (resolved.length === 0) {
      Alert.alert("Kosong", "Chapter ini gak ada halaman, cek server index.json");
      return;
    }
    
    setPages(resolved);
    setCurrentChapter(idx);
    setReading(true);
  }

  if (reading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={styles.readerHeader}>
          <TouchableOpacity onPress={() => setReading(false)} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{mangaTitle}</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{chapters[currentChapter]?.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.pageCounter}>{pages.length} pages</Text>
          </View>
        </View>

        <FlatList
          data={pages}
          keyExtractor={(item, idx) => `${idx}_${item}`}
          renderItem={({ item, index }) => <PageImage uri={item} index={index} total={pages.length} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={() => currentChapter > 0 && openChapter(currentChapter - 1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
            <Text style={styles.navText}>Prev</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentChapter + 1) / Math.max(1, chapters.length)) * 100}%` }]} />
          </View>
          <TouchableOpacity onPress={() => currentChapter < chapters.length - 1 && openChapter(currentChapter + 1)} style={styles.navBtn}>
            <Text style={styles.navText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.header}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : 
            <View style={[styles.cover, { backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }]}>
              <Ionicons name="book" size={40} color={colors.primary} />
            </View>
          }
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.title}>{mangaTitle}</Text>
            <Text style={styles.sub}>{chapters.length} chapters • {sourceId || "Server"}</Text>
            <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
              <View style={styles.badge}><Text style={styles.badgeText}>MANGA</Text></View>
              <View style={[styles.badge, { backgroundColor: "#1a2a4a" }]}><Text style={[styles.badgeText, { color: "#60a5fa" }]}>BETA</Text></View>
            </View>
            {chapters.length > 0 && (
              <TouchableOpacity style={styles.readFirstBtn} onPress={() => openChapter(0)}>
                <Ionicons name="book-outline" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 6 }}>Baca Chapter 1</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chapters ({chapters.length})</Text>
        
        {loading ? (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>Loading chapters...</Text>
        ) : chapters.length > 0 ? (
          <View>
            {chapters.map((item, index) => (
              <TouchableOpacity key={`${index}_${item.title}`} style={styles.chapterCard} onPress={() => openChapter(index)}>
                <View style={styles.chapterIcon}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chapterTitle} numberOfLines={1}>{item.title || `Chapter ${index + 1}`}</Text>
                  <Text style={styles.chapterSub}>{Array.isArray(item.pages) ? `${item.pages.length} pages` : "Chapter"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="book-outline" size={48} color="#333" />
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 12 }}>Belum ada chapter. Cek server index.json</Text>
            <Text style={{ color: "#444", fontSize: 10, marginTop: 8, textAlign: "center" }}>Pastikan server return manga dengan chapters: [{`{ title, chapters: [{title, pages: [url]}] }`}]</Text>
            {extraParam && <Text style={{ color: "#333", fontSize: 9, marginTop: 12 }}>extra: {extraParam.slice(0, 100)}...</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { flexDirection: "row", alignItems: "center", padding: 16, gap: 8 },
  backText: { color: colors.text, fontWeight: "600" },
  header: { flexDirection: "row", marginBottom: 24 },
  cover: { width: 100, height: 140, borderRadius: 12, backgroundColor: colors.card },
  title: { color: colors.text, fontSize: 20, fontWeight: "bold" },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  badge: { backgroundColor: colors.primary + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  readFirstBtn: { flexDirection: "row", backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, alignItems: "center", marginTop: 12, alignSelf: "flex-start" },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  chapterCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  chapterIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: colors.border },
  chapterTitle: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chapterSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  readerHeader: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#111", borderBottomWidth: 1, borderBottomColor: "#222" },
  closeBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 20, backgroundColor: "#222" },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  headerSub: { color: "#888", fontSize: 11, marginTop: 2 },
  headerRight: { backgroundColor: "#222", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pageCounter: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pageContainer: { width: "100%", height: 600, justifyContent: "center", alignItems: "center", backgroundColor: "#000", marginBottom: 4 },
  pageImage: { width: "100%", height: 600 },
  pageNumber: { position: "absolute", bottom: 20, right: 20, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pageNumberText: { color: "#fff", fontSize: 10 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#111", borderTopWidth: 1, borderTopColor: "#222" },
  navBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#222", borderRadius: 20, gap: 4 },
  navText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  progressBar: { flex: 1, height: 4, backgroundColor: "#333", borderRadius: 2, marginHorizontal: 12, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary },
});
