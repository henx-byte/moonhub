import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { usePlayer } from "../context/PlayerContext";

export function MiniPlayer() {
 const { current, isPlaying, toggle, stop } = usePlayer();
 if (!current) return null;

 return (
  <View style={styles.container}>
   <View style={styles.iconBox}>
    <Ionicons name="radio" size={20} color={colors.primary} />
   </View>
   <View style={{ flex: 1 }}>
    <Text style={styles.title} numberOfLines={1}>
     {current.title}
    </Text>
    <Text style={styles.sub}>
     {isPlaying ? "• Playing" : "• Paused"} {current.artist ? `• ${current.artist}` : ""}
    </Text>
   </View>
   <TouchableOpacity onPress={toggle} style={styles.btn}>
    <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={colors.background} />
   </TouchableOpacity>
   <TouchableOpacity onPress={stop} style={[styles.btn, { backgroundColor: colors.card, marginLeft: 8 }]}>
    <Ionicons name="close" size={18} color={colors.text} />
   </TouchableOpacity>
  </View>
 );
}

const styles = StyleSheet.create({
 container: { position: "absolute", bottom: 75, left: 12, right: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", elevation: 10 },
 iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 10 },
 title: { color: colors.text, fontWeight: "700", fontSize: 13 },
 sub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
 btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
});
