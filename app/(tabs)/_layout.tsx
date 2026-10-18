import { Tabs } from "expo-router";
import { colors } from "../../src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { MiniPlayer } from "../../src/components/MiniPlayer";

export default function TabsLayout() {
 return (
  <>
   <Tabs
    screenOptions={{
     headerStyle: { backgroundColor: colors.background },
     headerTintColor: colors.text,
     tabBarStyle: {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
     },
     tabBarActiveTintColor: colors.primary,
     tabBarInactiveTintColor: colors.textMuted,
    }}
   >
    <Tabs.Screen
     name="index"
     options={{
      title: "Home",
      tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
     }}
    />
    <Tabs.Screen
     name="library"
     options={{
      title: "Library",
      tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
     }}
    />
    <Tabs.Screen
     name="sources"
     options={{
      title: "Sources",
      tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
     }}
    />
   </Tabs>
   <MiniPlayer />
  </>
 );
}
