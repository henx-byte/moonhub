import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/colors";
import { Mp3Provider } from "@/context/Mp3Context";
import { HlsProvider } from "@/context/HlsContext";
import { Player } from "@/context/PlayerCoreContext";
import { Mp3PlayerContainer } from "@/components/mp3/Mp3PlayerContainer";
// import '@/locales/i18n'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Mp3Provider>
        <HlsProvider>
          <Player>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.background },
                headerShown: false,
                animation: "slide_from_bottom"
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <Mp3PlayerContainer />
          </Player>
        </HlsProvider>
      </Mp3Provider>
    </>
  );
}
