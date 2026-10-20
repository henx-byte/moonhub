import { useState } from "react";
import { View } from "react-native";
import { Mp3MiniPlayer } from "./Mp3MiniPlayer";
import { Mp3FullPlayer } from "./Mp3FullPlayer";

export function Mp3PlayerContainer() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <Mp3MiniPlayer onExpand={() => setExpanded(true)} />
      <Mp3FullPlayer visible={expanded} onClose={() => setExpanded(false)} />
    </View>
  );
}