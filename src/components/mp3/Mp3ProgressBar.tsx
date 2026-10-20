import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import { useState } from "react";
import Slider from "@react-native-community/slider";
import { colors } from "../../theme/colors";

function formatTime(sec: number) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function Mp3ProgressBar({ position, duration, onSeek }: { position: number; duration: number; onSeek: (s: number) => void }) {
  const [width, setWidth] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slidePos, setSlidePos] = useState(0);

  const safePos = isNaN(position) ? 0 : position;
  const safeDur = isNaN(duration) || duration <= 0 ? 0 : duration;
  const displayPos = isSliding ? slidePos : safePos;
  const progress = safeDur > 0 ? Math.min(1, displayPos / safeDur) : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const handleTap = (evt: any) => {
    if (width === 0 || safeDur === 0) return;
    const x = evt.nativeEvent.locationX;
    const percent = Math.max(0, Math.min(1, x / width));
    onSeek(percent * safeDur);
  };

  return (
    <View style={styles.container}>
      {/* SLIDER - logic lama isSliding */}
      <Slider
        style={{ width: '100%', height: 20, marginTop: 4 }}
        minimumValue={0}
        maximumValue={safeDur > 0 ? safeDur : 1}
        value={displayPos}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        onSlidingStart={() => setIsSliding(true)}
        onValueChange={(v) => setSlidePos(v)}
        onSlidingComplete={(v) => { setIsSliding(false); onSeek(v); }}
      />

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayPos)}</Text>
        <Text style={styles.timeText}>{formatTime(safeDur)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginTop: 8 },
  tapArea: { width: '100%', paddingVertical: 6 },
  bg: { height: 4, backgroundColor: colors.border, borderRadius: 2, justifyContent: 'center' },
  fill: { height: 4, backgroundColor: colors.primary, borderRadius: 2, position: 'absolute', left: 0, top: 0, bottom: 0 },
  thumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, position: 'absolute', top: -4, marginLeft: -6, borderWidth: 1, borderColor: '#000' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  timeText: { color: colors.textMuted, fontSize: 11 },
});