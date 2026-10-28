// src/components/player/UnifiedFullPlayer.tsx
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { useCorePlayer } from "../../context/PlayerCoreContext";
import { Mp3CassetteCover } from "../mp3/Mp3CassetteCover";
import { Mp3Controls } from "../mp3/Mp3Controls";
import { Mp3ProgressBar } from "../mp3/Mp3ProgressBar";

function formatTime(sec: number) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function UnifiedFullPlayer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const player: any = useCorePlayer();
  const current = player?.current;
  if (!current) return null;

  const isRadio = current?.type === "radio" || current?.extra?.isLive;
  const mp3 = player?.mp3;
  const displayTitle = player?.parsed?.title || player?.nowPlaying || current?.title || current?.name;
  const displayArtist = isRadio
    ? (player?.parsed?.artist || current?.state || current?.country || "LIVE Radio")
    : (current?.artist || "Unknown");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.headerTitle}>{isRadio ? "RADIO • LIVE" : "PLAYING • QUEUE"}</Text>
              <Text style={styles.headerSub}>{isRadio ? player?.nowPlaying ? "ICY Metadata" : "FM Stream" : `${mp3?.queue?.length || 0} tracks`}</Text>
            </View>
            <TouchableOpacity onPress={() => player?.stop?.()} style={styles.headerBtn}>
              <Ionicons name="stop" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Mp3CassetteCover thumbnail={current?.thumbnail} isPlaying={!!player?.isPlaying} title={displayTitle} />

          <View style={{ marginTop: 16, alignItems: "center" }}>
            <Text style={styles.bigTitle} numberOfLines={1}>{displayTitle}</Text>
            <Text style={styles.bigSub} numberOfLines={1}>
              {isRadio ? `${displayArtist} • ${player?.isPlaying ? "LIVE" : "Paused"}` : `${displayArtist} • ${formatTime(mp3?.position)} / ${formatTime(mp3?.duration)}`}
            </Text>
            {isRadio && player?.parsed?.raw && (
              <Text style={{ color: "#ffb000", fontSize: 11, marginTop: 6, textAlign: "center" }} numberOfLines={2}>
                {player.parsed.raw}
              </Text>
            )}
          </View>

          {isRadio ? (
            <View style={{ marginTop: 20, alignItems: "center" }}>
              <View style={{ backgroundColor: "#1e1e1e", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: player?.isPlaying ? "#ffb000" : "#555" }} />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{player?.isBuffering ? "Buffering..." : player?.isPlaying ? "Streaming Live" : "Paused"}</Text>
              </View>
              <TouchableOpacity onPress={() => (player?.isPlaying ? player?.pause?.() : player?.resume?.())} style={{ marginTop: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: "#ffb000", justifyContent: "center", alignItems: "center" }}>
                <Ionicons name={player?.isPlaying ? "pause" : "play"} size={28} color="#000" style={{ marginLeft: player?.isPlaying ? 0 : 3 }} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Mp3ProgressBar position={mp3?.position || 0} duration={mp3?.duration || 0} onSeek={(s) => mp3?.seek?.(s)} />
              <Mp3Controls
                isPlaying={!!player?.isPlaying}
                loopMode={mp3?.loopMode || "all"}
                shuffle={!!mp3?.shuffle}
                onToggle={() => (player?.isPlaying ? player?.pause?.() : player?.resume?.())}
                onPrev={() => mp3?.playPrev?.()}
                onNext={() => mp3?.playNext?.()}
                onLoop={() => mp3?.toggleLoop?.()}
                onShuffle={() => mp3?.toggleShuffle?.()}
              />
              <View style={{ marginTop: 16, flex: 1 }}>
                <Text style={styles.playlistHeader}>QUEUE • {mp3?.queue?.length} • TAP TO PLAY</Text>
                <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
                  {(mp3?.queue || []).map((q: any, idx: number) => {
                    const isCur = idx === mp3?.currentIndex;
                    return (
                      <TouchableOpacity key={`${q.id}-${idx}`} onPress={() => mp3?.play?.(q, mp3?.queue)} style={[styles.queueRow, isCur && styles.queueRowActive]}>
                        <View style={[styles.queueNum, isCur && { backgroundColor: "#000" }]}><Text style={[styles.queueNumText, isCur && { color: colors.primary }]}>{idx + 1}</Text></View>
                        <View style={{ flex: 1 }}><Text style={[styles.queueTitle, isCur && { color: "#000" }]} numberOfLines={1}>{q.title}</Text><Text style={styles.queueSub} numberOfLines={1}>{q.artist || "Local"}</Text></View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#000", justifyContent: "flex-end" },
  card: { backgroundColor: "#0f0f0f", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, height: "94%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  headerTitle: { color: colors.text, fontWeight: "800", fontSize: 10, letterSpacing: 1 },
  headerSub: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  bigTitle: { color: colors.text, fontWeight: "bold", fontSize: 16, textAlign: "center" },
  bigSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  playlistHeader: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  queueRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 8 },
  queueRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  queueNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  queueNumText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  queueTitle: { color: colors.text, fontSize: 12, fontWeight: "600" },
  queueSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});