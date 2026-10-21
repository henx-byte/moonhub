import { useMemo } from "react";
import { View, Text } from "react-native";
import { useUnifiedPlayer } from "../../src/context/UnifiedPlayerContext";

export default function HomeScreen() {
  const unified = useUnifiedPlayer();

  // FIX: cuma pake 1 player, jangan panggil useAudioPlayer lagi
  const isPlaying = unified?.isPlaying ?? false;
  const current = unified?.current ?? null;

  // memo biar gak trigger useEffect terus
  const player = useMemo(() => {
    return unified;
  }, [isPlaying, current?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 50, paddingHorizontal: 16 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>MoonHub</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>
        {current ? current.title || current.name : 'No track'}
      </Text>
      <Text style={{ color: '#555', marginTop: 4 }}>
        {isPlaying ? 'Playing' : 'Paused'}
      </Text>
    </View>
  );
}