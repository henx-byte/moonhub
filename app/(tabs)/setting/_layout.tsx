// app/(tabs)/setting/_layout.tsx
import { Stack } from "expo-router";
import { colors } from "../../../src/theme/colors";

export default function SettingLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
        animation: "slide_from_right"
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="permission" options={{ title: "Izin Akses" }} />
    </Stack>
  );
}
