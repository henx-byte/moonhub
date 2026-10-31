import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

type Props = {
  pages: string[];
  title: string;
  chapterTitle?: string;
  onClose?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
};

export default function ComicViewer({ pages, title, chapterTitle, onClose, onNextChapter, onPrevChapter }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const renderPage = ({ item, index }: { item: string; index: number }) => {
    return (
      <View style={styles.pageContainer}>
        <Image
          source={{ uri: item }}
          style={styles.pageImage}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        <View style={styles.pageNumber}>
          <Text style={styles.pageNumberText}>{index + 1} / {pages.length}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {chapterTitle && <Text style={styles.headerSub} numberOfLines={1}>{chapterTitle}</Text>}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.pageCounter}>{currentPage + 1} / {pages.length}</Text>
        </View>
      </View>

      {/* Reader - Vertical scroll book style */}
      <FlatList
        data={pages}
        keyExtractor={(item, idx) => `${idx}_${item}`}
        renderItem={renderPage}
        pagingEnabled={false}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          const pageHeight = height - 100;
          const page = Math.round(offsetY / pageHeight);
          setCurrentPage(page);
        }}
        getItemLayout={(data, index) => ({
          length: height - 80,
          offset: (height - 80) * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={onPrevChapter} style={styles.navBtn} disabled={!onPrevChapter}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={styles.navText}>Prev</Text>
        </TouchableOpacity>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(((currentPage + 1) / pages.length) * 100)}%` }]} />
        </View>

        <TouchableOpacity onPress={onNextChapter} style={styles.navBtn} disabled={!onNextChapter}>
          <Text style={styles.navText}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#111", borderBottomWidth: 1, borderBottomColor: "#222" },
  closeBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 20, backgroundColor: "#222" },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  headerSub: { color: "#888", fontSize: 11, marginTop: 2 },
  headerRight: { backgroundColor: "#222", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pageCounter: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pageContainer: { width: width, height: height - 100, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  pageImage: { width: width, height: height - 120 },
  pageNumber: { position: "absolute", bottom: 20, right: 20, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pageNumberText: { color: "#fff", fontSize: 10 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#111", borderTopWidth: 1, borderTopColor: "#222" },
  navBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#222", borderRadius: 20, gap: 4 },
  navText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  progressBar: { flex: 1, height: 4, backgroundColor: "#333", borderRadius: 2, marginHorizontal: 12, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary },
});
