import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../src/theme/colors";
import { Mp3Provider } from "../src/context/Mp3Context";
import { HlsProvider } from "../src/context/HlsContext";
import { Player } from "../src/context/PlayerCoreContext";
import { Mp3PlayerContainer } from "../src/components/mp3/Mp3PlayerContainer";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Mp3Provider>
        <HlsProvider>
          <Player>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.background },
                headerShown: false
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
