import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Platform
} from "react-native";
import { useEffect, useState, useCallback, memo, useRef } from "react";
import {
  getTopStations,
  searchStations,
  RadioStation,
  getStationsByCountry,
  getSearch,
  fetchCountry,
  RadioCountry,
  voteStation,
  clickStation
} from "../../src/features/radio/radioBrowser";
import { MediaItem } from "../../src/types";
import { Ionicons } from "@expo/vector-icons";
import { colors, ios } from "../../src/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCorePlayer } from "../../src/context/PlayerCoreContext";

const default_thumbnail =
  "https://raw.githubusercontent.com/henx-byte/moonhub/refs/heads/main/assets/icon.png";

const SHORT_NAMES: Record<string, string> = {
  "The United States Of America": "United States",
  "The United Kingdom Of Great Britain And Northern Ireland": "United Kingdom",
  "United States Of America": "United States",
  "Russian Federation": "Russia",
  Indonesia: "Indonesia"
};
const getShortName = (full: string) => {
  if (!full) return "Radio";
  if (SHORT_NAMES[full]) return SHORT_NAMES[full];
  if (full.length > 24) {
    const w = full.split(" ");
    if (w.length > 3) return w.slice(0, 2).join(" ");
    return full.slice(0, 22) + "…";
  }
  return full;
};

const FLAG_EMOJI: Record<string, string> = {
  ID: "🇮🇩",
  US: "🇺🇸",
  GB: "🇬🇧",
  JP: "🇯🇵",
  KR: "🇰🇷",
  DE: "🇩🇪",
  FR: "🇫🇷",
  BR: "🇧🇷",
  IN: "🇮🇳",
  RU: "🇷🇺",
  TR: "🇹🇷",
  MX: "🇲🇽",
  MY: "🇲🇾",
  SG: "🇸🇬"
};

function StationLogo({ favicon, name, active }: any) {
  const [error, setError] = useState(false);
  const valid = favicon && favicon !== "null" && favicon.trim() !== "";
  const showFallback = !valid || error;
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: active ? colors.text : colors.card2,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: active ? colors.text : colors.border,
        overflow: "hidden"
      }}
    >
      <Image
        source={{ uri: showFallback ? default_thumbnail : (favicon as string) }}
        onError={() => setError(true)}
        style={{ width: 56, height: 56, borderRadius: 16 }}
      />
    </View>
  );
}

export default function RadioScreen() {
  const [rawStations, setRawStations] = useState<RadioStation[]>([]);
  const [displayStations, setDisplayStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ID");
  const [countryCode, setCountryCode] = useState("ID");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [query, setQuery] = useState("");
  const [searchByName, setSearchByName] = useState(true);
  const [searchByTag, setSearchByTag] = useState(false);
  const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [bufferingId, setBufferingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countries, setCountries] = useState<RadioCountry[]>([]);
  const [selected, setSelected] = useState<RadioCountry | null>({
    name: "Indonesia",
    code: "ID",
    stationcount: 616
  } as any);
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [showLoveSheet, setShowLoveSheet] = useState(false);
  const [loveStation, setLoveStation] = useState<RadioStation | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [showRemoveStationConfirm, setShowRemoveStationConfirm] =
    useState(false);
  const [removeStationTarget, setRemoveStationTarget] = useState<any>(null);

  const [serverStats, setServerStats] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<
    "checking" | "ok" | "server_down" | "network_down"
  >("checking");

  const fetchServerStats = async () => {
    setServerStatus("checking");
    try {
      const res = await fetch("https://de1.api.radio-browser.info/json/stats", {
        headers: { "User-Agent": "MoonHub/1.0" }
      });
      if (!res.ok) {
        setServerStatus("server_down");
        return;
      }
      const data = await res.json();
      setServerStats(data);
      if (data.status === "OK" && data.stations > 100) {
        setServerStatus("ok");
      } else {
        setServerStatus("server_down");
      }
    } catch (e: any) {
      // bedain network vs server
      if (
        e?.name === "AbortError" ||
        e?.message?.includes("Network") ||
        e?.message?.includes("Failed to fetch")
      ) {
        try {
          await fetch("https://www.google.com", {
            method: "HEAD",
            mode: "no-cors"
          } as any);
          setServerStatus("server_down");
        } catch {
          setServerStatus("network_down");
        }
      } else {
        setServerStatus("server_down");
      }
    }
  };

  const player: any = useCorePlayer();

  const CATEGORIES = [
    {
      id: selected?.code || countryCode || "ID",
      label: `${FLAG_EMOJI[selected?.code || countryCode || "ID"] || "🌍"} ${selected?.code || countryCode || "ID"}`
    },
    { id: "TOP", label: "Top Global" },
    { id: "FAV", label: "Favorites" },
    ...customCats.map(name => ({ id: `custom:${name}`, label: name })),
    { id: "ADD", label: "+" }
  ];

  useEffect(() => {
    (async () => {
      try {
        const c = await AsyncStorage.getItem("radio:custom_categories");
        if (c) setCustomCats(JSON.parse(c));
        const f = await AsyncStorage.getItem("radio:favorites");
        if (f) setFavorites(JSON.parse(f));
        const cs = await fetchCountry();
        setCountries(cs);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    initialLoad();
    fetchServerStats();
  }, []);

  const safeFetch = async (fn: () => Promise<RadioStation[]>) => {
    try {
      const res = await fn();
      return res;
    } catch (e: any) {
      console.log("[radio] safeFetch error", e?.message);
      return [];
    }
  };

  const initialLoad = async () => {
    setLoading(true);
    setActiveCategory("ID");
    try {
      const data = await getStationsByCountry("ID");
      const sorted = [...data].sort((a, b) => b.votes - a.votes);
      setRawStations(sorted);
      setDisplayStations(sorted);
    } catch {}
    setLoading(false);
    setVisibleCount(10);
  };

  const handlePlay = useCallback(
    async (s: RadioStation) => {
      const isSame = currentRadio?.url_resolved === s.url_resolved;

      if (isSame && isPlaying) {
        try {
          await player?.pause?.();
          setIsPlaying(false);
        } catch {}
        return;
      }
      
      setCurrentRadio(s);
      setBufferingId(s.stationuuid);
      setIsPlaying(false);
      try {
        const item: MediaItem = {
          id: s.stationuuid,
          sourceId: "radio_permanent",
          name: s.name,
          title: s.name,
          path: s.url,
          uri: s.url_resolved,
          country: s.country,
          state: s.state,
          mediaType: "radio",
          type: "radio",
          size: 0,
          duration: 0,
          thumbnail: s.favicon,
          extra: { isLive: true }
        };
        await player?.play?.(item, { useIcy: true });
        setIsPlaying(true);
      } catch {}
      setBufferingId(null);
    },
    [currentRadio, player, isPlaying, bufferingId]
  );

  const handleSelectCountry = async (country: RadioCountry) => {
    setShowCountryModal(false);
    setCountryCode(country.code);
    setSelected(country);
    setActiveCategory(country.code);
    setLoading(true);
    const data = await safeFetch(() => getStationsByCountry(country.code));
    if (!data) {
      setLoading(false);
      return;
    }
    const sorted = [...data].sort((a, b) => b.votes - a.votes);
    setRawStations(sorted);
    setDisplayStations(sorted);
    setLoading(false);
    setVisibleCount(10);
  };

  const handleSelectCategory = async (catId: string) => {
    if (catId === "ADD") {
      setShowAddCatModal(true);
      return;
    }
    setQuery("");
    setActiveCategory(catId);
    setLoading(true);
    setPage(0);
    setHasMore(true);
    const res = await safeFetch(async () => {
      if (catId === "TOP") return await getTopStations(0, 10);
      if (catId === "FAV") {
        const f = await AsyncStorage.getItem("radio:favorites");
        return f ? JSON.parse(f) : favorites;
      }
      if (catId.startsWith("custom:")) {
        const catName = catId.replace("custom:", "");
        const raw = await AsyncStorage.getItem(`radio:cat:${catName}`);
        return raw ? JSON.parse(raw) : [];
      }
      return await getStationsByCountry(catId, 0, 10);
    });

    if (!res) {
      setLoading(false);
      return;
    }
    if (res.length === 0) {
      if (catId === "FAV" || catId.startsWith("custom:")) {
        setRawStations([]);
        setDisplayStations([]);
        setLoading(false);
        setHasMore(false);
        return;
      }
      setLoading(false);
      return;
    }

    setRawStations(res);
    setDisplayStations(res);
    setPage(1);
    setHasMore(res.length >= 10);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    if (activeCategory === "FAV" || activeCategory.startsWith("custom:"))
      return;
    setLoadingMore(true);
    const nextPage = Math.floor(rawStations.length / 10);
    const nextOffset = nextPage * 10;
    const more = await safeFetch(async () => {
      if (query.trim()) {
        let isName = searchByName;
        let isTag = searchByTag;
        if (!isName && !isTag) isName = true;
        const parts: string[] = [];
        if (
          activeCategory &&
          activeCategory !== "TOP" &&
          activeCategory !== "all" &&
          activeCategory !== "FAV" &&
          !activeCategory.startsWith("custom:")
        ) {
          parts.push(`countrycode=${encodeURIComponent(activeCategory)}`);
        }
        if (isName) parts.push(`name=${encodeURIComponent(query.trim())}`);
        if (isTag) parts.push(`tag=${encodeURIComponent(query.trim())}`);
        const fullParam = parts.join("&");
        return await getSearch(fullParam, 10, nextOffset);
      }
      if (activeCategory === "TOP") return await getTopStations(nextOffset, 10);
      return await getStationsByCountry(activeCategory, nextOffset, 10);
    });
    if (more && more.length > 0) {
      const existingIds = new Set(rawStations.map(s => s.stationuuid));
      const filteredMore = more.filter(s => !existingIds.has(s.stationuuid));
      if (filteredMore.length === 0) {
        console.log("[radio] duplicate, stop");
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      const combined = [...rawStations, ...filteredMore];
      setRawStations(combined);
      setDisplayStations(combined);
      setPage(nextPage + 1);
      setHasMore(more.length >= 10);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setDisplayStations(rawStations);
      setHasMore(true);
      setPage(Math.floor(rawStations.length / 10));
      return;
    }
    setLoading(true);
    setPage(0);
    setHasMore(true);
    let isName = searchByName;
    let isTag = searchByTag;
    if (!isName && !isTag) {
      isName = true; // default name
    }
    const parts: string[] = [];
    if (
      activeCategory &&
      activeCategory !== "TOP" &&
      activeCategory !== "all" &&
      activeCategory !== "FAV" &&
      !activeCategory.startsWith("custom:")
    ) {
      parts.push(`countrycode=${encodeURIComponent(activeCategory)}`);
    }
    if (isName) {
      parts.push(`name=${encodeURIComponent(text.trim().toLowerCase())}`);
    }
    if (isTag) {
      parts.push(`tag=${encodeURIComponent(text.trim().toLowerCase())}`);
    }
    const fullParam = parts.join("&");
    console.log(
      `[radio] SEARCH MODE name=${isName} tag=${isTag} fullParam=${fullParam}`
    );
    const res = await safeFetch(async () => await getSearch(fullParam, 10, 0));
    if (res) {
      setDisplayStations(res);
      setRawStations(res);
      setPage(1);
      setHasMore(res.length >= 10);
    }
    setLoading(false);
  };

  const handleCreateCustomCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (customCats.includes(name)) {
      setShowAddCatModal(false);
      return;
    }
    const newCats = [...customCats, name];
    setCustomCats(newCats);
    await AsyncStorage.setItem(
      "radio:custom_categories",
      JSON.stringify(newCats)
    );
    await AsyncStorage.setItem(`radio:cat:${name}`, JSON.stringify([]));
    setShowAddCatModal(false);
    setNewCatName("");
  };

  const handleDeleteCustomCat = (name: string) => {
    setDeleteTarget(name);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCustomCat = async () => {
    const name = deleteTarget;
    const newCats = customCats.filter(c => c !== name);
    setCustomCats(newCats);
    await AsyncStorage.setItem(
      "radio:custom_categories",
      JSON.stringify(newCats)
    );
    await AsyncStorage.removeItem(`radio:cat:${name}`);
    if (activeCategory === `custom:${name}`) {
      setActiveCategory(selected?.code || "ID");
      const res = await getStationsByCountry(selected?.code || "ID");
      setRawStations(res);
      setDisplayStations(res);
    }
    setShowDeleteConfirm(false);
    setDeleteTarget("");
  };

  const handleRemoveStation = (station: any) => {
    if (activeCategory === "FAV" || activeCategory.startsWith("custom:")) {
      setRemoveStationTarget(station);
      setShowRemoveStationConfirm(true);
    }
  };

  const confirmRemoveStation = async () => {
    const station = removeStationTarget;
    if (!station) return;
    if (activeCategory === "FAV") {
      const newFavs = favorites.filter(
        (f: any) => f.stationuuid !== station.stationuuid
      );
      setFavorites(newFavs);
      await AsyncStorage.setItem("radio:favorites", JSON.stringify(newFavs));
      setRawStations(newFavs);
      setDisplayStations(newFavs);
    } else if (activeCategory.startsWith("custom:")) {
      const catName = activeCategory.replace("custom:", "");
      const key = `radio:cat:${catName}`;
      const raw = await AsyncStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const newArr = arr.filter(
        (s: any) => s.stationuuid !== station.stationuuid
      );
      await AsyncStorage.setItem(key, JSON.stringify(newArr));
      setRawStations(newArr);
      setDisplayStations(newArr);
    }
    setShowRemoveStationConfirm(false);
    setRemoveStationTarget(null);
  };

  const handleLove = (item: RadioStation) => {
    setLoveStation(item);
    setShowLoveSheet(true);
  };
  const addToFavorites = async () => {
    if (!loveStation) return;
    const exists = favorites.find(
      f => f.stationuuid === loveStation.stationuuid
    );
    let newFav = exists
      ? favorites.filter(f => f.stationuuid !== loveStation.stationuuid)
      : [...favorites, loveStation];
    if (!exists) voteStation(loveStation.stationuuid);
    setFavorites(newFav);
    await AsyncStorage.setItem("radio:favorites", JSON.stringify(newFav));
    setShowLoveSheet(false);
  };
  const addToCustomCat = async (catName: string) => {
    if (!loveStation) return;
    const key = `radio:cat:${catName}`;
    const raw = await AsyncStorage.getItem(key);
    const arr: RadioStation[] = raw ? JSON.parse(raw) : [];
    if (!arr.find(s => s.stationuuid === loveStation.stationuuid)) {
      arr.push(loveStation);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
      voteStation(loveStation.stationuuid);
    }
    setShowLoveSheet(false);
  };

  const listData = displayStations;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* HEADER CAKep */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 26,
                  fontWeight: "900",
                  letterSpacing: 1.2
                }}
              >
                MoonHub
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  fontWeight: "700",
                  marginTop: 2
                }}
              >
                {getShortName(selected?.name || "Indonesia")}
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <Ionicons name="radio" size={20} color={colors.text} />
            </View>
          </View>

          {/* SERVER STATS UI - biar tau server down atau jaringan down */}
          <View
            style={{
              marginTop: 16,
              backgroundColor:
                serverStatus === "ok"
                  ? colors.card
                  : serverStatus === "network_down"
                    ? "#FF453A15"
                    : "#FFD60A15",
              borderWidth: 1,
              borderColor:
                serverStatus === "ok"
                  ? colors.border
                  : serverStatus === "network_down"
                    ? "#FF453A40"
                    : "#FFD60A40",
              borderRadius: 16,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor:
                    serverStatus === "checking"
                      ? "#FFD60A"
                      : serverStatus === "ok"
                        ? "#30D158"
                        : "#FF453A"
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 12
                  }}
                >
                  {serverStatus === "checking"
                    ? "Checking de1..."
                    : serverStatus === "ok"
                      ? `de1 OK • ${serverStats?.stations || 62641} stations`
                      : serverStatus === "network_down"
                        ? "Jaringan kamu down 📵"
                        : "Server de1 down ⚠️"}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 10,
                    marginTop: 2
                  }}
                >
                  {serverStatus === "ok"
                    ? `${serverStats?.stations_broken || 7127} broken • ${serverStats?.clicks_last_hour || 10855} clicks/jam • v${serverStats?.software_version || "0.7.45"}`
                    : serverStatus === "network_down"
                      ? "Cek WiFi/Data kamu."
                      : serverStatus === "server_down"
                        ? "Pakai cache, coba lagi nanti"
                        : "Mengecek de1.api.radio-browser.info..."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={fetchServerStats}
              style={{
                backgroundColor: colors.card2,
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              <Ionicons name="refresh" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* DETAIL STATS COLLAPSIBLE - kalau OK */}
          {serverStats && serverStatus === "ok" && (
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 9,
                    fontWeight: "800"
                  }}
                >
                  TAGS
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "800",
                    marginTop: 2
                  }}
                >
                  {serverStats.tags}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 9,
                    fontWeight: "800"
                  }}
                >
                  COUNTRIES
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "800",
                    marginTop: 2
                  }}
                >
                  {serverStats.countries}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 9,
                    fontWeight: "800"
                  }}
                >
                  TODAY CLICKS
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "800",
                    marginTop: 2
                  }}
                >
                  {(serverStats.clicks_last_day / 100).toFixed(1)}k
                </Text>
              </View>
            </View>
          )}

          {/* SEARCH CAKep */}
          <View
            style={{
              marginTop: 18,
              backgroundColor: colors.card,
              borderRadius: 18,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              height: 48,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Cari di ${getShortName(selected?.name || "Indonesia")}`}
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                marginLeft: 10,
                color: colors.text,
                fontSize: 14,
                fontWeight: "500"
              }}
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(query)}
            />
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  const newVal = !searchByName;
                  if (!newVal && !searchByTag) {
                    setSearchByName(true);
                  } else {
                    setSearchByName(newVal);
                  }
                }}
                style={{
                  backgroundColor: searchByName ? colors.text : "transparent",
                  borderWidth: 1,
                  borderColor: searchByName ? colors.text : colors.border,
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 15,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Text
                  style={{
                    color: searchByName ? colors.background : colors.text,
                    fontSize: 11,
                    fontWeight: "700"
                  }}
                >
                  NAME
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const newVal = !searchByTag;
                  if (!newVal && !searchByName) {
                    setSearchByName(true);
                    setSearchByTag(false);
                  } else {
                    setSearchByTag(newVal);
                  }
                }}
                style={{
                  backgroundColor: searchByTag ? colors.text : "transparent",
                  borderWidth: 1,
                  borderColor: searchByTag ? colors.text : colors.border,
                  paddingHorizontal: 10,
                  height: 30,
                  borderRadius: 15,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Text
                  style={{
                    color: searchByTag ? colors.background : colors.text,
                    fontSize: 11,
                    fontWeight: "700"
                  }}
                >
                  GENRE
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CATEGORY CHIPS CAKep */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 18 }}
            contentContainerStyle={{ gap: 10 }}
          >
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              const isAdd = cat.id === "ADD";
              const isCustom = cat.id.startsWith("custom:");
              const customName = isCustom ? cat.id.replace("custom:", "") : "";
              return (
                <TouchableOpacity
                  key={cat.id}
                  disabled={loading}
                  onPress={() => handleSelectCategory(cat.id)}
                  onLongPress={() => {
                    if (isCustom) handleDeleteCustomCat(customName);
                  }}
                  delayLongPress={600}
                  style={{
                    backgroundColor: isActive
                      ? colors.text
                      : isAdd
                        ? colors.background
                        : colors.card,
                    borderWidth: 1,
                    borderColor: isActive ? colors.text : colors.border,
                    paddingHorizontal: isAdd ? 16 : 18,
                    paddingVertical: 11,
                    borderRadius: 22,
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? colors.background : colors.text,
                      fontWeight: isActive ? "800" : "600",
                      fontSize: 13
                    }}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* COUNTRY CAKep */}
          <View
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.card2,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Ionicons
                  name="globe-outline"
                  size={14}
                  color={colors.textMuted}
                />
              </View>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}
              >
                Country
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {countries.length} negara
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowCountryModal(true)}
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 8
              }}
            >
              <Text style={{ fontSize: 14 }}>
                {FLAG_EMOJI[selected?.code || "ID"] || "🌍"}
              </Text>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}
              >
                {getShortName(selected?.name || "Indonesia")}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST CAKep */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              paddingHorizontal: 4
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 1
              }}
            >
              STATIONS
            </Text>
            {loading && (
              <ActivityIndicator size="small" color={colors.textMuted} />
            )}
          </View>

          {displayStations.length === 0 && !loading ? (
            <View
              style={{
                paddingVertical: 60,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16
                }}
              >
                <Ionicons
                  name={
                    activeCategory === "FAV"
                      ? "heart-outline"
                      : "folder-open-outline"
                  }
                  size={32}
                  color={colors.textMuted}
                />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "800",
                  fontSize: 16,
                  textAlign: "center"
                }}
              >
                {activeCategory === "FAV"
                  ? "Belum ada favorit"
                  : activeCategory.startsWith("custom:")
                    ? `Kategori ${activeCategory.replace("custom:", "")} kosong`
                    : "Gak ada stasiun"}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 6,
                  paddingHorizontal: 24
                }}
              >
                {activeCategory === "FAV"
                  ? "Tap ♡ di stasiun radio buat simpan ke favorit!"
                  : activeCategory.startsWith("custom:")
                    ? "Tap ♡ terus pilih kategori ini buat isi!"
                    : "Coba ganti negara atau kategori lain"}
              </Text>
            </View>
          ) : (
            listData.map((item, idx) => {
              const isActive = currentRadio?.stationuuid === item.stationuuid;
              const isBuffering = bufferingId === item.stationuuid;
              const location = item.state || item.country || "Online";
              const isFav = favorites.some(
                f => f.stationuuid === item.stationuuid
              );
              const isTop = idx < 3;
              const topColors: any = ["#FFD60A", "#C7C7CC", "#CD7F32"]; // gold, silver, bronze
              const topIcons = ["👑", "🥈", "🥉"];
              return (
                <TouchableOpacity
                  key={item.stationuuid}
                  onPress={() => handlePlay(item)}
                  onLongPress={() => handleRemoveStation(item)}
                  delayLongPress={500}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: isActive ? colors.text : colors.card,
                    borderRadius: 20,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isActive ? colors.text : colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: isActive ? 0.15 : 0,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: isActive ? 4 : 0
                  }}
                >
                  {/* LOGO + RANK BADGE RAPI */}
                  <View style={{ position: "relative" }}>
                    <StationLogo
                      favicon={item.favicon}
                      name={item.name}
                      active={isActive}
                    />
                    {isTop && (
                      <View
                        style={{
                          position: "absolute",
                          top: -6,
                          left: -6,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: topColors[idx],
                          borderWidth: 2,
                          borderColor: isActive ? colors.text : colors.card,
                          justifyContent: "center",
                          alignItems: "center"
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "900",
                            color: "#000"
                          }}
                        >
                          {idx + 1}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 14, marginRight: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      {isTop && (
                        <Text style={{ fontSize: 12 }}>{topIcons[idx]}</Text>
                      )}
                      <Text
                        style={{
                          color: isActive ? colors.background : colors.text,
                          fontWeight: "800",
                          fontSize: 14,
                          flex: 1
                        }}
                        numberOfLines={1}
                      >
                        {getShortName(item.name)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                        gap: 6
                      }}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? colors.background + "99"
                            : colors.textSecondary,
                          fontSize: 12,
                          fontWeight: "500"
                        }}
                        numberOfLines={1}
                      >
                        {location}
                      </Text>
                      <View
                        style={{
                          backgroundColor: isActive
                            ? colors.background + "20"
                            : colors.card2,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8
                        }}
                      >
                        <Text
                          style={{
                            color: isActive
                              ? colors.background
                              : colors.textMuted,
                            fontSize: 10,
                            fontWeight: "700"
                          }}
                        >
                          {(item.tags?.split(",")[0] || "Radio")
                            .trim()
                            .slice(0, 12)}
                        </Text>
                      </View>
                      {item.votes > 0 && (
                        <Text
                          style={{
                            color: isActive
                              ? colors.background + "70"
                              : colors.textMuted,
                            fontSize: 10
                          }}
                        >
                          • {item.votes} ♥
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleLove(item)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isActive
                        ? colors.background + "15"
                        : colors.background,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isActive
                        ? colors.background + "20"
                        : colors.border,
                      marginRight: 8
                    }}
                  >
                    <Ionicons
                      name={isFav ? "heart" : "heart-outline"}
                      size={16}
                      color={
                        isFav
                          ? "#FF375F"
                          : isActive
                            ? colors.background
                            : colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: isActive
                        ? colors.background
                        : colors.text,
                      justifyContent: "center",
                      alignItems: "center"
                    }}
                  >
                    {isBuffering ? (
                      <ActivityIndicator
                        size="small"
                        color={isActive ? colors.text : colors.background}
                      />
                    ) : (
                      <Ionicons
                        name={isActive && isPlaying ? "pause" : "play"}
                        size={16}
                        color={isActive ? colors.text : colors.background}
                        style={{ marginLeft: isActive && isPlaying ? 0 : 2 }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {hasMore && displayStations.length > 0 && (
            <TouchableOpacity
              onPress={handleLoadMore}
              style={{
                backgroundColor: colors.card2,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 20,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 8,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}
              >
                {loadingMore
                  ? "Loading..."
                  : `Page ${page === 0 ? 1 : page} / ${page * 10} Station`}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
          {rawStations.length > 10 &&
            !hasMore &&
            displayStations.length > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  setPage(0);
                  setHasMore(true);
                  await handleSelectCategory(activeCategory);
                }}
                style={{ paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Show Less ↑
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </ScrollView>

      <Modal visible={showAddCatModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}
              >
                Buat Kategori Baru ✨
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddCatModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.card2,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginBottom: 12
              }}
            >
              Nama kategori custom :
            </Text>
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                height: 48,
                flexDirection: "row",
                alignItems: "center"
              }}
            >
              <Ionicons
                name="folder-outline"
                size={18}
                color={colors.textMuted}
              />
              <TextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="Nama kategori..."
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600"
                }}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateCustomCat}
              />
            </View>
            <TouchableOpacity
              onPress={handleCreateCustomCat}
              disabled={!newCatName.trim()}
              style={{
                backgroundColor: newCatName.trim() ? colors.text : colors.card2,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                marginTop: 16
              }}
            >
              <Text
                style={{
                  color: newCatName.trim()
                    ? colors.background
                    : colors.textMuted,
                  fontWeight: "800",
                  fontSize: 14
                }}
              >
                Buat Kategori
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteConfirm} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FF375F15",
                justifyContent: "center",
                alignItems: "center",
                alignSelf: "center",
                marginBottom: 12
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#FF375F" />
            </View>
            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                fontSize: 16,
                textAlign: "center"
              }}
            >
              Yakin hapus?
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                textAlign: "center",
                marginTop: 6
              }}
            >
              Kategori "{deleteTarget}" bakal dihapus permanen.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget("");
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.card2,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 14
                  }}
                >
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDeleteCustomCat}
                style={{
                  flex: 1,
                  backgroundColor: "#FF375F",
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center"
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}
                >
                  Yes, Hapus
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemoveStationConfirm}
        animationType="slide"
        transparent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FF375F15",
                justifyContent: "center",
                alignItems: "center",
                alignSelf: "center",
                marginBottom: 12
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#FF375F" />
            </View>
            <Text
              style={{
                color: colors.text,
                fontWeight: "800",
                fontSize: 16,
                textAlign: "center"
              }}
            >
              Hapus stasiun?
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                textAlign: "center",
                marginTop: 6
              }}
            >
              {removeStationTarget?.name} bakal dihapus dari{" "}
              {activeCategory === "FAV"
                ? "Favorites"
                : activeCategory.replace("custom:", "")}
              .
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowRemoveStationConfirm(false);
                  setRemoveStationTarget(null);
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.card2,
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 14
                  }}
                >
                  Batal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRemoveStation}
                style={{
                  flex: 1,
                  backgroundColor: "#FF375F",
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: "center"
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}
                >
                  Yes, Hapus
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end"
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "80%",
              paddingBottom: 20
            }}
          >
            <View
              style={{
                padding: 20,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "900", fontSize: 18 }}
              >
                Pilih Country 🌍
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.card2,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={c => c.code}
              renderItem={({ item }) => {
                const isSel = selected?.code === item.code;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectCountry(item)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: isSel ? colors.card : "transparent"
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>
                        {FLAG_EMOJI[item.code] || "🌍"}
                      </Text>
                      <View>
                        <Text
                          style={{
                            color: isSel ? colors.text : colors.text,
                            fontWeight: isSel ? "800" : "600",
                            fontSize: 14
                          }}
                        >
                          {getShortName(item.name)}
                        </Text>
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 11,
                            marginTop: 2
                          }}
                        >
                          {item.code} • {item.stationcount} stasiun
                        </Text>
                      </View>
                    </View>
                    {isSel ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.text}
                      />
                    ) : (
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {item.stationcount}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showLoveSheet} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end"
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
                alignSelf: "center",
                marginBottom: 20
              }}
            />
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                fontSize: 18,
                marginBottom: 4
              }}
            >
              {loveStation?.name}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginBottom: 16
              }}
            >
              {loveStation?.state || loveStation?.country}
            </Text>
            <TouchableOpacity
              onPress={addToFavorites}
              style={{
                padding: 16,
                backgroundColor: colors.card,
                borderRadius: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#FF375F20",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Ionicons name="heart" size={18} color="#FF375F" />
              </View>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                ❤️ Favorites
              </Text>
            </TouchableOpacity>
            {customCats.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => addToCustomCat(cat)}
                style={{
                  padding: 16,
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: colors.border
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  📁 {cat}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowLoveSheet(false)}
              style={{ padding: 16, alignItems: "center", marginTop: 4 }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                Batal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
