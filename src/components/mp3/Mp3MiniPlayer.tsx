import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

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

export function Mp3MiniPlayer({ onExpand }: { onExpand?: () => void }) {
  let player: any = null;
  try { if (useUnifiedPlayer) { const u = useUnifiedPlayer(); player = u?.mp3 || (u?.activeType === 'mp3' ? u : null); } } catch {}
  try { if (!player && useMp3Player) player = useMp3Player(); } catch {}
  if (!player) return null;
  const current = player?.current;
  if (!current) return null;

  const hasQueue = player?.queue?.length > 1;
  const queuePos = player?.currentIndex >= 0 ? `${player.currentIndex + 1}/${player.queue.length}` : '';
  const safeDuration = player?.duration > 0 ? player.duration : 0;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onExpand} style={styles.container}>
      <View style={styles.cover}>
        {current?.thumbnail ? <Image source={{ uri: current.thumbnail }} style={{ width: 44, height: 44, borderRadius: 10 }} /> : <Ionicons name="musical-notes" size={20} color={colors.primary} />}
        {hasQueue && <View style={styles.badge}><Text style={styles.badgeText}>{queuePos}</Text></View>}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>{current?.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{formatTime(player?.position)} / {formatTime(player?.duration)} • {queuePos}</Text>
        {safeDuration > 0 && <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${Math.min(100, (player.position / safeDuration) * 100)}%` }]} /></View>}
      </View>
      <TouchableOpacity onPress={() => player?.playPrev?.()} style={styles.btnSmall}><Ionicons name="play-skip-back" size={18} color={colors.text} /></TouchableOpacity>
      <TouchableOpacity onPress={() => player?.toggle?.()} style={styles.btn}><Ionicons name={player?.isPlaying ? "pause" : "play"} size={20} color="#fff" style={{ marginLeft: player?.isPlaying ? 0 : 2 }} /></TouchableOpacity>
      <TouchableOpacity onPress={() => player?.playNext?.()} style={styles.btnSmall}><Ionicons name="play-skip-forward" size={18} color={colors.text} /></TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, right: 12, bottom: 90, backgroundColor: '#1a1a1a', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a2a', flexDirection: 'row', alignItems: 'center', padding: 10, elevation: 8 },
  cover: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  badgeText: { color: '#000', fontSize: 8, fontWeight: '700' },
  title: { color: colors.text, fontWeight: '700', fontSize: 12 },
  sub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  progressBg: { height: 2, backgroundColor: colors.border, borderRadius: 1, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  btnSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
});