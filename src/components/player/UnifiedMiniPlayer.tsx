// src/components/player/UnifiedMiniPlayer.tsx - FIX SIDE-BY-SIDE FAB
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { useCorePlayer } from "../../context/PlayerCoreContext";

export function UnifiedMiniPlayer({ onExpand }: { onExpand?: () => void }) {
  const player: any = useCorePlayer();
  const current = player?.current;
  if (!current) return null;

  const isRadio = current?.type === "radio" || current?.extra?.isLive;
  const isPlaying = !!player?.isPlaying;
  const isBuffering = !!player?.isBuffering;
  const mp3 = player?.mp3;

  const displayTitle = player?.parsed?.title || player?.nowPlaying || current?.title || current?.name || "Unknown";
  const displayArtist = isRadio 
    ? (player?.parsed?.artist || current?.state || current?.country || "LIVE")
    : (current?.artist || "Unknown");

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onExpand} style={styles.container}>
      <View style={styles.cover}>
        {current?.thumbnail ? (
          <Image source={{ uri: current.thumbnail }} style={{ width: 40, height: 40, borderRadius: 10 }} />
        ) : (
          <Ionicons name={isRadio ? "radio" : "musical-notes"} size={18} color={isRadio ? "#ffb000" : colors.primary} />
        )}
        {isRadio && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
        <Text style={styles.sub} numberOfLines={1}>{displayArtist}</Text>
      </View>

      <TouchableOpacity
        onPress={() => (isPlaying ? player?.pause?.() : player?.resume?.())}
        style={[styles.btn, isRadio && { backgroundColor: "#ffb000" }]}
      >
        {isBuffering ? (
          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#000", borderTopColor: "transparent" }} />
        ) : (
          <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={isRadio ? "#000" : "#000"} style={{ marginLeft: isPlaying ? 0 : 2 }} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    // FIX: sejajar sama FAB, bukan di atasnya
    left: 100, // FAB lebar 72 + left 22 + gap 6 = 100 pas
    right: 14,
    bottom: 28,
    height: 68,
    backgroundColor: "#1e1e1e",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    elevation: 12,
    zIndex: 19, // di bawah FAB (FAB zIndex 20) biar menu bubble bisa di atas
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  liveBadge: {
    position: "absolute",
    bottom: -5,
    right: -6,
    backgroundColor: "#ffb000",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#000",
  },
  liveText: { color: "#000", fontSize: 7, fontWeight: "900" },
  title: { color: "#fff", fontWeight: "700", fontSize: 12 },
  sub: { color: "#888", fontSize: 10, marginTop: 2 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffb000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});