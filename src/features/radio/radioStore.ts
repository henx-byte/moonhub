import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAV_KEY = "radio_favorites_v1";

export function useRadioFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadFavorites = async () => {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    if (raw) setFavorites(JSON.parse(raw));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const toggleFavorite = async (uuid: string) => {
    const updated = favorites.includes(uuid) ? favorites.filter(f => f !== uuid) : [...favorites, uuid];
    setFavorites(updated);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(updated));
  };

  return { favorites, toggleFavorite, isFavorite: (uuid: string) => favorites.includes(uuid) };
}