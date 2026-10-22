// app/(tabs)/index.tsx - REDIRECT KE RADIO
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/radio" />;
}