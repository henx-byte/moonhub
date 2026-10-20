import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { Mp3ProgressBar } from "./Mp3ProgressBar";
import { Mp3Controls } from "./Mp3Controls";
import { Mp3CassetteCover } from "./Mp3CassetteCover";

let useMp3Player: any = null;
let useUnifiedPlayer: any = null;
try { useMp3Player = require("../../context/Mp3Context").useMp3Player; } catch {}
try { useUnifiedPlayer = require("../../context/UnifiedPlayerContext").useUnifiedPlayer; } catch {}

function formatTime(sec: number) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function Mp3FullPlayer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  let player: any = null;
  try { if (useUnifiedPlayer) { const u = useUnifiedPlayer(); player = u?.mp3 || (u?.activeType === 'mp3' ? u : null); } } catch {}
  try { if (!player && useMp3Player) player = useMp3Player(); } catch {}
  if (!player) return null;
  const current = player?.current;
  if (!current) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.bg}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>MP3 PLAYER • TAPE DECK</Text>
              <Text style={styles.headerSub}>{player?.isPlaying ? '● PLAYING' : '■ PAUSED'} • {player?.loopMode?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={styles.headerBtn}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* KASET BOLONG MUTER */}
          <Mp3CassetteCover thumbnail={current?.thumbnail} isPlaying={!!player?.isPlaying} title={current?.title || current?.name} />

          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={styles.bigTitle} numberOfLines={1}>{current?.title || current?.name}</Text>
            <Text style={styles.bigSub}>{current?.artist || 'Unknown'} • {formatTime(player?.position)} / {formatTime(player?.duration)}</Text>
          </View>

          <Mp3ProgressBar position={player?.position || 0} duration={player?.duration || 0} onSeek={(s) => player?.seek?.(s)} />

          <Mp3Controls
            isPlaying={!!player?.isPlaying}
            loopMode={player?.loopMode || 'all'}
            shuffle={!!player?.shuffle}
            onToggle={() => player?.toggle?.()}
            onPrev={() => player?.playPrev?.()}
            onNext={() => player?.playNext?.()}
            onLoop={() => player?.toggleLoop?.()}
            onShuffle={() => player?.toggleShuffle?.()}
          />

          <View style={{ marginTop: 16, flex: 1 }}>
            <Text style={styles.playlistHeader}>QUEUE • {player?.queue?.length} • TAP TO PLAY</Text>
            <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {(player?.queue || []).map((q: any, idx: number) => {
                const isCur = idx === player?.currentIndex;
                return (
                  <TouchableOpacity key={`${q.id}-${idx}`} onPress={() => player?.play?.(q, player?.queue)} style={[styles.queueRow, isCur && styles.queueRowActive]}>
                    <View style={[styles.queueNum, isCur && { backgroundColor: '#000' }]}><Text style={[styles.queueNumText, isCur && { color: colors.primary }]}>{idx + 1}</Text></View>
                    <View style={{ flex: 1 }}><Text style={[styles.queueTitle, isCur && { color: '#000' }]} numberOfLines={1}>{q.title}</Text><Text style={styles.queueSub} numberOfLines={1}>{q.artist || 'Local'}</Text></View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000', justifyContent: 'flex-end' },
  card: { backgroundColor: '#0f0f0f', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, height: '94%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { color: colors.text, fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  headerSub: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  bigTitle: { color: colors.text, fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  bigSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  playlistHeader: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  queueRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, gap: 10, marginBottom: 8 },
  queueRowActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  queueNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  queueNumText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  queueTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  queueSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});