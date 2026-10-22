
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const hasSeen = await AsyncStorage.getItem('hasSeenWelcome');
      console.log('hasSeenWelcome:', hasSeen);
      if (!hasSeen) {
        router.replace('/welcome');
      } else {
        router.replace('/(tabs)/radio');
      }
    };
    check();
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#0D0A07' }} />;
}