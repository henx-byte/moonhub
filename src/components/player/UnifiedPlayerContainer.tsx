// src/components/player/UnifiedPlayerContainer.tsx
import { useState } from "react";
import { View } from "react-native";
import { UnifiedMiniPlayer } from "./UnifiedMiniPlayer";
import { UnifiedFullPlayer } from "./UnifiedFullPlayer";

export function UnifiedPlayerContainer() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, zIndex: 19 }}>
      <UnifiedMiniPlayer onExpand={() => setExpanded(true)} />
      <UnifiedFullPlayer visible={expanded} onClose={() => setExpanded(false)} />
    </View>
  );
}