
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, ios } from "../../theme/colors";

let useMp3Player: any = null;
let useUnifiedPlayer: any = null;
try {
  useMp3Player = require("../../context/Mp3Context").useMp3Player;
} catch {}
try {
  useUnifiedPlayer =
    require("../../context/UnifiedPlayerContext").useUnifiedPlayer;
} catch {}

function formatTime(sec: number) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function Mp3MiniPlayer({ onExpand }: { onExpand?: () => void }) {
  let player: any = null;
  try {
    if (useUnifiedPlayer) {
      const u = useUnifiedPlayer();
      player = u?.mp3 || (u?.activeType === "mp3" ? u : null);
    }
  } catch {}
  try {
    if (!player && useMp3Player) player = useMp3Player();
  } catch {}
  if (!player) return null;
  const current = player?.current;
  if (!current) return null;

  const isRadio = current.type === "radio"
  const hasQueue = player?.queue?.length > 1;
  const queuePos = isRadio ? player?.parsed?.artist :
    player?.currentIndex >= 0
      ? `${player.currentIndex + 1}/${player.queue.length}`
      : "";
  const safeDuration = player?.duration > 0 ? player.duration : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onExpand}
      style={styles.container}
    >
      <View style={styles.cover}>
        {current?.thumbnail ? (
          <Image
            source={{ uri: current.thumbnail }}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
        ) : (
          <Ionicons name="musical-notes" size={20} color={colors.textSecondary} />
        )}
        {hasQueue && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queuePos}</Text>
          </View>
        )}
      </View>
      {isRadio ? (
       <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {player?.parsed?.title || current?.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {player?.parsed?.artist || player?.current?.state || player?.current?.country || "Live"}
        </Text>
      </View>
      ) : (
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {player?.parsed?.title || current?.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {formatTime(player?.position)} / {formatTime(player?.duration)} • {queuePos}
        </Text>
        {safeDuration > 0 && (
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (player.position / safeDuration) * 100)}%`,
                },
              ]}
            />
          </View>
        )}
      </View>
      )}
      <TouchableOpacity
        onPress={() => player?.playPrev?.()}
        style={styles.btnSmall}
      >
        <Ionicons name="play-skip-back" size={18} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => player?.toggle?.()} style={styles.btn}>
        <Ionicons
          name={player?.isPlaying ? "pause" : "play"}
          size={20}
          color={colors.primaryText}
          style={{ marginLeft: player?.isPlaying ? 0 : 2 }}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => player?.playNext?.()}
        style={styles.btnSmall}
      >
        <Ionicons name="play-skip-forward" size={18} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 100,
    right: 16,
    bottom: 24,
    height: 76,
    backgroundColor: colors.card, // iOS mon - was #1a1a1a
    borderRadius: ios.cornerRadius.large, // 22 - iOS large
    borderWidth: 1,
    borderColor: colors.border, // #38383A
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    // iOS Shadow - beneran floating
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      }
    }),
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: ios.cornerRadius.medium, // 16
    backgroundColor: colors.card2, // #2C2C2E
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  badge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: colors.text, // putih mon
    borderRadius: ios.cornerRadius.small, // 10
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.background,
  },
  badgeText: { color: colors.background, fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  title: { color: colors.text, fontWeight: "700", fontSize: 13, letterSpacing: -0.2 },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontWeight: "500" },
  progressBg: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.text, borderRadius: 1.5 }, // putih mon
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.text, // putih mon - main action
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    // iOS button shadow kecil
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 2 }
    })
  },
  btnSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card2, // #2C2C2E
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
