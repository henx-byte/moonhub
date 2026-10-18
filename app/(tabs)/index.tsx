import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../../src/theme/colors";
import { usePlayer } from "../../src/context/PlayerContext";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const { current, isPlaying, toggle, stop } = usePlayer();

  if (!current) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Moonhub</Text>
        <Text style={styles.sub}>Your personal radio & media hub</Text>
        
        <View style={styles.emptyBox}>
          <View style={styles.bigIcon}>
            <Ionicons name="radio" size={40} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Belum ada yang diputar</Text>
          <Text style={styles.emptySub}>Buka tab Library, pilih Prambors / Gen FM, langsung bunyi. Player bakal tetep hidup di background.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>4</Text>
            <Text style={styles.statLabel}>Radio Stations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>∞</Text>
            <Text style={styles.statLabel}>Background Play</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>expo</Text>
            <Text style={styles.statLabel}>video</Text>
          </View>
        </View>

        <Text style={styles.tip}>💡 Tip: Mini player di bawah udah sinkron sama Library</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Now Playing</Text>
      
      <View style={styles.artworkBox}>
        <View style={styles.artwork}>
          <Ionicons name="radio" size={84} color={colors.primary} />
          {isPlaying && <View style={styles.liveDot} />}
        </View>
        <View style={styles.wave}>
          <Ionicons name={isPlaying ? "radio" : "pause-circle"} size={18} color={colors.primary} />
          <Text style={styles.waveText}>{isPlaying ? "LIVE • Playing" : "Paused"} • {current.artist || "radio_default"}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{current.title}</Text>
      <Text style={styles.artist} numberOfLines={2}>{current.url}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideBtn} onPress={stop}>
          <Ionicons name="stop" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.playBtn} onPress={toggle}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={36} color={colors.background} style={{ marginLeft: isPlaying ? 0 : 4 }} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sideBtn}>
          <Ionicons name="heart-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by expo-video • replaceAsync • Background enabled</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { fontSize: 28, fontWeight: "bold", color: colors.text },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  emptyBox: { marginTop: 32, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 24, alignItems: 'center' },
  bigIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, alignItems: 'center' },
  statNum: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
  tip: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
  artworkBox: { alignItems: 'center', marginTop: 28 },
  artwork: { width: 230, height: 230, borderRadius: 32, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  liveDot: { position: 'absolute', top: 16, right: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff3b30' },
  wave: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  waveText: { color: colors.textSecondary, fontSize: 12, marginLeft: 6 },
  title: { color: colors.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 24, paddingHorizontal: 10 },
  artist: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 32 },
  sideBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  footer: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 36, opacity: 0.6 },
});
