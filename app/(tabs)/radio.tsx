import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image } from "react-native";
import { useEffect, useState, useCallback, memo } from "react";
import { colors } from "../../src/theme/colors";
import { getTopStations, getIndoStations, searchStations, resolveStream, getRadioMirror, RadioStation } from "../../src/features/radio/radioBrowser";
import { usePlayer } from "../../src/context/PlayerContext";
import { MediaItem } from "../../src/types";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RadioCard = memo(({ item, onPlay, isActive }: { item: RadioStation; onPlay: (s: RadioStation) => void; isActive: boolean }) => {
  return (
    <TouchableOpacity onPress={() => onPlay(item)} style={{ backgroundColor: isActive ? colors.primary + "20" : colors.card, padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: isActive ? 1 : 0, borderColor: colors.primary }}>
      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.card2, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
        {item.favicon ? <Image source={{ uri: item.favicon }} style={{ width: 40, height: 40, borderRadius: 8 }} /> : <Ionicons name="radio" size={20} color={colors.textMuted} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: isActive ? colors.primary : colors.text, fontWeight: "600" }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{item.country || item.countrycode} • {item.votes} votes</Text>
      </View>
      <Ionicons name={isActive ? "volume-high" : "play"} size={18} color={isActive ? colors.primary : colors.textMuted} />
    </TouchableOpacity>
  );
});

function RadioPlayer({ currentRadio, isPlaying, onToggle, isFav, onLike, onVote, voteLoading }: { currentRadio: RadioStation | null; isPlaying: boolean; onToggle: () => void; isFav: boolean; onLike: () => void; onVote: () => void; voteLoading: boolean; }) {
  if (!currentRadio) {
    return (
      <View style={{ backgroundColor: colors.card, margin: 16, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" }}>
        <Ionicons name="radio-outline" size={32} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>Pilih radio untuk diputar</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: colors.card, margin: 16, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.card2, justifyContent: "center", alignItems: "center" }}>
          {currentRadio.favicon ? <Image source={{ uri: currentRadio.favicon }} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <Ionicons name="radio" size={28} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>LIVE</Text></View>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{currentRadio.bitrate ? `${currentRadio.bitrate}k` : "LIVE"} • {currentRadio.votes} votes</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>{currentRadio.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{currentRadio.tags || currentRadio.country}</Text>
        </View>
        <TouchableOpacity onPress={onToggle} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" }}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" style={{ marginLeft: isPlaying ? 0 : 2 }} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <TouchableOpacity onPress={onLike} style={{ flex: 1, backgroundColor: isFav ? "#ef4444" + "20" : colors.card2, borderWidth: 1, borderColor: isFav ? "#ef4444" : colors.border, padding: 10, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#ef4444" : colors.text} />
          <Text style={{ color: isFav ? "#ef4444" : colors.text, fontWeight: "600", fontSize: 13 }}>{isFav ? "Disukai" : "Suka"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onVote} disabled={voteLoading} style={{ flex: 1, backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary, padding: 10, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, opacity: voteLoading ? 0.6 : 1 }}>
          <Ionicons name="thumbs-up" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>{voteLoading ? "Voting..." : "Vote"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RadioScreen() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"top" | "indo" | "fav" | "search">("indo");
  const [query, setQuery] = useState("");
  const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [voteLoading, setVoteLoading] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("radio_fav_objects");
      if (raw) setFavorites(JSON.parse(raw));
      else {
        // migrasi dari versi lama yang cuma simpan id
        const old = await AsyncStorage.getItem("radio_favorites");
        if (old) {
          // biarkan kosong, user like ulang
        }
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (tab === "fav") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (tab === "top") setStations(await getTopStations(100));
      else if (tab === "indo") setStations(await getIndoStations(100));
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const isFav = currentRadio ? favorites.some(f => f.stationuuid === currentRadio.stationuuid) : false;

  const handleLike = async () => {
    if (!currentRadio) return;
    let updated: RadioStation[];
    if (isFav) updated = favorites.filter(f => f.stationuuid !== currentRadio.stationuuid);
    else updated = [...favorites, currentRadio];
    setFavorites(updated);
    await AsyncStorage.setItem("radio_fav_objects", JSON.stringify(updated));
  };

  const handleVote = async () => {
    if (!currentRadio) return;
    setVoteLoading(true);
    try {
      const mirror = await getRadioMirror();
      await fetch(`${mirror}/json/stations/${currentRadio.stationuuid}/vote`, { method: "POST", headers: { "User-Agent": "MoonHub/1.0" } });
      const bump = (s: RadioStation) => s.stationuuid === currentRadio.stationuuid ? { ...s, votes: s.votes + 1 } : s;
      setStations(prev => prev.map(bump));
      setFavorites(prev => prev.map(bump));
      setCurrentRadio(prev => prev ? { ...prev, votes: prev.votes + 1 } : null);
    } catch (e) { console.log("[Radio] vote fail", e); }
    setVoteLoading(false);
  };

  const handlePlay = useCallback(async (s: RadioStation) => {
    setCurrentRadio(s);
    try {
      const freshUrl = await resolveStream(s.stationuuid);
      const item: MediaItem = { id: s.stationuuid, sourceId: "radio_permanent", name: s.name, title: s.name, path: freshUrl, uri: freshUrl, mediaType: "music", type: "song", size: 0, duration: 0, thumbnail: s.favicon, extra: { isLive: true, stationuuid: s.stationuuid, isRadio: true } };
      player.play(item, [item]);
    } catch (e) { console.log(e); }
  }, [player]);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setStations(await searchStations(query.trim()));
    setLoading(false);
  };

  const displayData = tab === "fav" ? favorites : stations;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 50 }}>
        <RadioPlayer currentRadio={currentRadio} isPlaying={player.isPlaying} onToggle={() => player.isPlaying ? player.pause() : player.resume()} isFav={isFav} onLike={handleLike} onVote={handleVote} voteLoading={voteLoading} />
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom:16 ,gap: 8 }}>
        <TouchableOpacity onPress={() => setTab("top")} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: tab==="top"?colors.primary:colors.card, borderRadius: 20 }}><Text style={{ color: tab==="top" ? "white" : colors.text, fontWeight: "600", fontSize: 13 }}>Top</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("indo")} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: tab==="indo"?colors.primary:colors.card, borderRadius: 20 }}><Text style={{ color: tab==="indo" ? "white" : colors.text, fontWeight: "600", fontSize: 13 }}>Indonesia</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("fav")} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: tab==="fav"? "#ef4444" : colors.card, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name={tab==="fav" ? "heart" : "heart-outline"} size={12} color={tab==="fav" ? "white" : colors.text} /><Text style={{ color: tab==="fav" ? "white" : colors.text, fontWeight: "600", fontSize: 13 }}>Suka {favorites.length > 0 ? `(${favorites.length})` : ""}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("search")} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: tab==="search"?colors.primary:colors.card, borderRadius: 20 }}><Text style={{ color: tab==="search" ? "white" : colors.text, fontWeight: "600", fontSize: 13 }}>Cari</Text></TouchableOpacity>
      </View>
      {tab==="search" && <TextInput value={query} onChangeText={setQuery} onSubmitEditing={handleSearch} returnKeyType="search" placeholder="Cari Saluran ..." placeholderTextColor={colors.textMuted} style={{ marginTop:0, margin: 16, backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }} />}
      {tab === "fav" && favorites.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 12, textAlign: "center" }}>Belum ada radio favorit{"\n"}Like dulu di player atas</Text>
        </View>
      ) : loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList data={displayData} keyExtractor={(s) => s.stationuuid} initialNumToRender={15} windowSize={7} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} renderItem={({ item }) => <RadioCard item={item} onPlay={handlePlay} isActive={currentRadio?.stationuuid === item.stationuuid} />} getItemLayout={(_, index) => ({ length: 66, offset: 66 * index, index })} />
      )}
    </View>
  );
}