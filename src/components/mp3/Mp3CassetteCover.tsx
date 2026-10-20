import { View, Text, Image, StyleSheet , Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export function Mp3CassetteCover({ thumbnail, isPlaying, title }: { thumbnail?: string; isPlaying: boolean; title?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 2000, // 2 detik 1 putaran, kayak kaset beneran
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
    }
    return () => animRef.current?.stop();
  }, [isPlaying]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.cassetteBody}>
      {/* Atas kaset - baut */}
      <View style={styles.screwRow}>
        <View style={styles.screw} /><View style={styles.screw} />
      </View>

      {/* Label tengah */}
      <View style={styles.labelArea}>
        <View style={styles.labelLeft}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={{ width: 56, height: 56, borderRadius: 6 }} />
          ) : (
            <Ionicons name="musical-notes" size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.labelRight}>
          <Text style={styles.cassetteTitle} numberOfLines={2}>{title || 'MOONHUB TAPE'}</Text>
          <Text style={styles.cassetteSub}>STEREO • TYPE I • 90</Text>
          <View style={styles.barcode} />
        </View>
      </View>

      {/* Tengah kaset - 2 reel bolong muter */}
      <View style={styles.reelsContainer}>
        {/* Reel kiri */}
        <View style={styles.reelOuter}>
          <Animated.View style={[styles.reelInner, { transform: [{ rotate }] }]}>
            <View style={styles.spoke} />
            <View style={[styles.spoke, { transform: [{ rotate: '60deg' }] }]} />
            <View style={[styles.spoke, { transform: [{ rotate: '120deg' }] }]} />
            <View style={styles.hole} />
          </Animated.View>
          {/* Tape yang kelilit */}
          <View style={[styles.tapeRoll, { width: isPlaying ? 52 : 48, height: isPlaying ? 52 : 48 }]} />
        </View>

        {/* Jendela tengah - tempat pita jalan */}
        <View style={styles.window}>
          <View style={styles.tapePath} />
        </View>

        {/* Reel kanan */}
        <View style={styles.reelOuter}>
          <Animated.View style={[styles.reelInner, { transform: [{ rotate }] }]}>
            <View style={styles.spoke} />
            <View style={[styles.spoke, { transform: [{ rotate: '60deg' }] }]} />
            <View style={[styles.spoke, { transform: [{ rotate: '120deg' }] }]} />
            <View style={styles.hole} />
          </Animated.View>
          <View style={[styles.tapeRoll, { width: isPlaying ? 48 : 52, height: isPlaying ? 48 : 52 }]} />
        </View>
      </View>

      {/* Bawah kaset - baut + tulisan */}
      <View style={styles.screwRow}>
        <Text style={styles.bottomText}>◀ A SIDE</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={styles.screw} /><View style={styles.screw} />
        </View>
        <Text style={styles.bottomText}>B SIDE ▶</Text>
      </View>

      {/* Efek muter indicator */}
      {isPlaying && <View style={styles.playIndicator}><View style={styles.blinkDot} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  cassetteBody: {
    width: '100%',
    height: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  screwRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screw: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
  labelArea: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 8, gap: 10, alignItems: 'center' },
  labelLeft: { width: 56, height: 56, borderRadius: 6, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  labelRight: { flex: 1 },
  cassetteTitle: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  cassetteSub: { color: '#666', fontSize: 8, marginTop: 2, fontWeight: '600' },
  barcode: { marginTop: 6, height: 12, backgroundColor: '#000', opacity: 0.1, borderRadius: 2, width: '60%' },
  reelsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f0f0f', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#222' },
  reelOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1f1f1f', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#2a2a2a' },
  reelInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  spoke: { position: 'absolute', width: 4, height: 20, backgroundColor: '#2a2a2a', borderRadius: 2 },
  hole: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#000', borderWidth: 2, borderColor: '#333', zIndex: 2 },
  tapeRoll: { position: 'absolute', borderRadius: 100, backgroundColor: '#3a2a1a', opacity: 0.4, borderWidth: 1, borderColor: '#4a3a2a' },
  window: { width: 60, height: 24, backgroundColor: '#000', borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  tapePath: { width: 48, height: 4, backgroundColor: '#3a2a1a', borderRadius: 2 },
  bottomText: { color: '#555', fontSize: 8, fontWeight: '700' },
  playIndicator: { position: 'absolute', top: 10, right: 12 },
  blinkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
});