import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export function Mp3Controls({ isPlaying, loopMode, shuffle, onToggle, onPrev, onNext, onLoop, onShuffle }: any) {
  const isLoopOff = loopMode === 'off';
  const isLoopAll = loopMode === 'all';
  const isLoopOne = loopMode === 'one';

  return (
    <View style={styles.container}>
      {/* SHUFFLE */}
      <TouchableOpacity onPress={onShuffle} style={[styles.iconBtn, shuffle && styles.activeShuffle]}>
        <Ionicons name="shuffle" size={20} color={shuffle ? "#000" : colors.textMuted} />
      </TouchableOpacity>

      {/* PREV */}
      <TouchableOpacity onPress={onPrev} style={styles.mainBtn}>
        <Ionicons name="play-skip-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* PLAY/PAUSE */}
      <TouchableOpacity onPress={onToggle} style={styles.playBtn}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#000" style={{ marginLeft: isPlaying ? 0 : 3 }} />
      </TouchableOpacity>

      {/* NEXT */}
      <TouchableOpacity onPress={onNext} style={styles.mainBtn}>
        <Ionicons name="play-skip-forward" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* LOOP - BEDA JELAS OFF / ALL / ONE */}
      <TouchableOpacity onPress={onLoop} style={[
        styles.iconBtn,
        isLoopOff && styles.loopOff,
        isLoopAll && styles.loopAll,
        isLoopOne && styles.loopOne,
      ]}>
        {/* ICON BEDA */}
        {isLoopOne ? (
          <>
            <Ionicons name="repeat" size={18} color="#000" />
            <View style={styles.oneBadge}>
              <Text style={styles.oneText}>1</Text>
            </View>
          </>
        ) : (
          <Ionicons name="repeat" size={20} color={isLoopOff ? colors.textMuted : "#000"} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingHorizontal: 10 },
  
  iconBtn: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: colors.card, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 1, borderColor: colors.border 
  },
  mainBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

  // LOOP OFF = abu abu
  loopOff: { backgroundColor: colors.card, borderColor: colors.border },
  // LOOP ALL = kuning primary + dot hijau
  loopAll: { backgroundColor: colors.primary, borderColor: colors.primary },
  // LOOP ONE = kuning + badge 1, beda dari ALL
  loopOne: { backgroundColor: colors.primary, borderColor: colors.primary },

  activeShuffle: { backgroundColor: colors.primary, borderColor: colors.primary },

  // badge angka 1 untuk mode ONE
  oneBadge: { 
    position: 'absolute', top: -2, right: -2, 
    backgroundColor: '#000', borderRadius: 8, 
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary
  },
  oneText: { color: colors.primary, fontSize: 9, fontWeight: '900' },

  // label kecil ALL / ONE di bawah icon
  loopLabel: { 
    position: 'absolute', bottom: 2, 
    fontSize: 7, fontWeight: '700', 
    color: '#000', letterSpacing: 0.5 
  },

  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#000' },
  dotAll: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#000' },
});