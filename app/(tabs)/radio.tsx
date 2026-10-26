import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  ScrollView
} from "react-native";
import { useEffect, useState, useCallback, memo } from "react";
import {
  getTopStations,
  searchStations,
  RadioStation,
  getStationsByCountry,
  fetchCountry,
  RadioCountry,
  getTopGenresByCountry,
  RadioGenre,
  getStationsByTag
} from "../../src/features/radio/radioBrowser";
import { MediaItem } from "../../src/types";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCorePlayer } from "../../src/context/PlayerCoreContext";

const extractFreq = (name: string) => {
  const m = name.match(/(\d+\.?\d*)\s*FM/i);
  return m ? parseFloat(m[1]) : 88;
};

const SHORT_NAMES: Record<string, string> = {
  "The United States Of America": "United States",
  "The United Kingdom Of Great Britain And Northern Ireland": "United Kingdom",
  "United States Of America": "United States",
  "Russian Federation": "Russia"
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

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "ID", label: "Indonesia" },
  { id: "TOP", label: "Top Global" },
  { id: "fav", label: "Favorites" }
];

const QuickCard = memo(
  ({ item, isActive, isPlaying, isBuffering, onPlay }: any) => {
    const freq = extractFreq(item.name);
    const letter = item.name?.charAt(0)?.toUpperCase() || "R";
    const location = item.state || item.country || item.countrycode || "Online";
    const votes =
      item.votes > 1000
        ? `${(item.votes / 1000).toFixed(1)}k`
        : `${item.votes}`;
    const tag = (item.tags?.split(",")[0] || "News/Talk").trim();
    const showLive = isPlaying && !isBuffering;

    return (
      <TouchableOpacity
        onPress={() => onPlay(item)}
        activeOpacity={0.9}
        style={{
          width: 300,
          backgroundColor: "#131313",
          borderRadius: 28,
          padding: 12,
          marginRight: 12,
          borderWidth: 1.5,
          borderColor: isActive ? "#ffb000" : "#232323"
        }}
      >
        <View
          style={{
            backgroundColor: "#0e0c09",
            borderRadius: 22,
            padding: 14,
            borderWidth: 1,
            borderColor: "#1f1a14"
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <Text
              style={{
                color: "#6b6256",
                fontSize: 11,
                letterSpacing: 2,
                fontWeight: "600"
              }}
            >
              FM 87.5 - 108.0 MHz
            </Text>
            <View
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: "#2a2a2a",
                flexDirection: "row",
                alignItems: "center"
              }}
            >
              {showLive ? (
                <>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: "#ffb000",
                      marginRight: 6
                    }}
                  />
                  <Text
                    style={{
                      color: "#ffb000",
                      fontSize: 11,
                      fontWeight: "800"
                    }}
                  >
                    LIVE
                  </Text>
                </>
              ) : (
                <Text
                  style={{
                    color: "#555",
                    fontSize: 10,
                    fontWeight: "700"
                  }}
                >
                  STEREO
                </Text>
              )}
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 14,
            paddingHorizontal: 4
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: isActive ? "#ffb000" : "#6aa8ff",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {item.favicon ? (
              <Image
                source={{ uri: item.favicon }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 15
                }}
              />
            ) : (
              <Text
                style={{
                  color: "#000",
                  fontWeight: "900",
                  fontSize: 24
                }}
              >
                {letter}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                color: "#fff",
                fontWeight: "800",
                fontSize: 16
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: "#666",
                fontSize: 13,
                marginTop: 2
              }}
              numberOfLines={1}
            >
              {location}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 6,
                gap: 8
              }}
            >
              <Ionicons name="heart-outline" size={14} color="#666" />
              <Text style={{ color: "#666", fontSize: 12 }}>{votes}</Text>
              <View
                style={{
                  backgroundColor: "#1e1e1e",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#2a2a2a"
                }}
              >
                <Text
                  style={{
                    color: "#888",
                    fontSize: 11,
                    textTransform: "capitalize"
                  }}
                >
                  {tag.slice(0, 14)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onPlay(item)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#ffb000",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: 8
            }}
          >
            {isBuffering ? (
              <ActivityIndicator color="#000" />
            ) : isPlaying ? (
              <Ionicons name="pause" size={20} color="#000" />
            ) : (
              <Ionicons
                name="play"
                size={20}
                color="#000"
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }
);

const CountryCard = memo(({ c, index, isActive, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      width: 180,
      backgroundColor: isActive ? "#2c1a0f" : "#141414",
      borderRadius: 16,
      padding: 14,
      marginRight: 10,
      borderWidth: 1.5,
      borderColor: isActive ? "#ffb000" : "#262626"
    }}
  >
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isActive ? "#ffb000" : "#1e1e1e",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8
      }}
    >
      <Text
        style={{
          color: isActive ? "#000" : "#888",
          fontWeight: "800",
          fontSize: 13
        }}
      >
        {index + 1}
      </Text>
    </View>
    <Text
      style={{
        color: isActive ? "#ffb000" : "#fff",
        fontWeight: "700",
        fontSize: 13
      }}
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      {getShortName(c.name)}
    </Text>
    <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
      {c.stationcount} stations
    </Text>
  </TouchableOpacity>
));

export default function RadioScreen() {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("ID");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [query, setQuery] = useState("");
  const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [bufferingId, setBufferingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countries, setCountries] = useState<RadioCountry[]>([]);
  const [selected, setSelected] = useState<RadioCountry | null>(null);
  const [genres, setGenres] = useState<RadioGenre[]>([]);
  const [genreLoading, setGenreLoading] = useState(true);
  const player: any = useCorePlayer();

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("radio_fav_objects");
      if (raw) setFavorites(JSON.parse(raw));
    })();
    (async () => {
      const data = await fetchCountry();
      const filtered = data
        .filter((c: any) => (c.stationcount || 0) > 5)
        .sort(
          (a: any, b: any) => (b.stationcount || 0) - (a.stationcount || 0)
        );
      setCountries(filtered);
      const init = filtered.find((c: any) => c.code === "ID") || filtered[0];
      if (init) {
        setSelected(init);
        setCountryCode(init.code);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setGenreLoading(true);
      const g = await getTopGenresByCountry(countryCode, 10);
      setGenres(g);
      setGenreLoading(false);
    })();
  }, [countryCode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeCategory === "fav") {
        setLoading(false);
        return;
      }
      let base: RadioStation[] = [];
      if (activeCategory === "TOP" || countryCode === "TOP")
        base = await getTopStations(100);
      else base = await getStationsByCountry(countryCode, 100);

      if (activeGenre) {
        try {
          const byTag = await getStationsByTag(activeGenre, 50);
          if (countryCode !== "TOP" && activeCategory !== "TOP") {
            const filteredByCountry = byTag.filter(
              (s: any) => s.countrycode === countryCode
            );
            base = filteredByCountry.length ? filteredByCountry : byTag;
          } else base = byTag;
        } catch {
          const tag = activeGenre.toLowerCase();
          const filtered = base.filter((s: any) =>
            s.tags?.toLowerCase().includes(tag)
          );
          base = filtered.length ? filtered : base;
        }
      }
      setStations(base.slice(0, 50));
    } catch {}
    setLoading(false);
  }, [activeCategory, countryCode, activeGenre]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const i = setInterval(
      () =>
        setIsPlaying(
          player?.isPlaying || player?.playbackState === "playing" || false
        ),
      300
    );
    return () => clearInterval(i);
  }, [player]);

  const handlePlay = useCallback(
    async (s: RadioStation) => {
      const isSame = currentRadio?.url_resolved === s.url_resolved;
      if (isSame) {
        if (isPlaying) {
          try {
            await player?.pause?.();
            setIsPlaying(false);
          } catch {}
          return;
        } else {
          console.log(JSON.stringify(s, null, 2));
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

          return;
        }
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

  const handleSearch = async () => {
    if (!query.trim()) {
      load();
      return;
    }
    setLoading(true);
    setStations(await searchStations(countryCode, query.trim()));
    setLoading(false);
  };

  const displayData = activeCategory === "fav" ? favorites : stations;
  const selectedCountry =
    selected || countries.find(c => c.code === countryCode) || countries[0];

  return (
    <View style={{ flex: 1, backgroundColor: "#080808" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingTop: 50, paddingHorizontal: 14 }}>
          <Text
            style={{
              color: "#fff",
              fontWeight: "900",
              fontSize: 22
            }}
          >
            Radio
          </Text>
          <Text
            style={{ color: "#666", fontSize: 12, marginTop: 2 }}
            numberOfLines={1}
          >
            {getShortName(selectedCountry?.name || "Mood & Countries")} •{" "}
            {countries.length} negara {activeGenre ? `• ${activeGenre}` : ""}
          </Text>
        </View>

        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c.id}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 16,
            gap: 8
          }}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <TouchableOpacity
                onPress={() => {
                  setActiveCategory(item.id);
                  if (item.id === "ID") setCountryCode("ID");
                  if (item.id === "TOP") setCountryCode("TOP");
                  if (item.id === "all") setCountryCode(selected?.code || "ID");
                  setActiveGenre(null);
                }}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 20,
                  backgroundColor: isActive ? "#ffb000" : "#1e1e1e",
                  borderWidth: 1,
                  borderColor: isActive ? "#ffb000" : "#2a2a2a"
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#000" : "#aaa",
                    fontWeight: "700",
                    fontSize: 13
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View
          style={{
            marginHorizontal: 14,
            marginTop: 14,
            backgroundColor: "#1a1510",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#2a231c",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12
          }}
        >
          <Ionicons name="search" size={16} color="#6d5a4e" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder={`Cari di ${getShortName(selectedCountry?.name || "radio")}...`}
            placeholderTextColor="#6d5a4e"
            style={{
              flex: 1,
              color: "#efebe9",
              padding: 12,
              fontSize: 13
            }}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={18} color="#ffb000" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              marginBottom: 10
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "800",
                fontSize: 16
              }}
            >
              Quick Picks {activeGenre ? `• ${activeGenre}` : ""}
            </Text>
            {activeGenre && (
              <TouchableOpacity onPress={() => setActiveGenre(null)}>
                <Text style={{ color: "#ffb000", fontSize: 12 }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <ActivityIndicator color="#ffb000" />
          ) : (
            <FlatList
              data={displayData.slice(0, 10)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={s => s.stationuuid}
              contentContainerStyle={{ paddingHorizontal: 14 }}
              renderItem={({ item }) => {
                const isThisActive =
                  currentRadio?.stationuuid === item.stationuuid;
                return (
                  <QuickCard
                    item={item}
                    isActive={isThisActive}
                    isPlaying={isThisActive && isPlaying}
                    isBuffering={bufferingId === item.stationuuid}
                    onPlay={handlePlay}
                  />
                );
              }}
            />
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              marginBottom: 10
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "800",
                fontSize: 16
              }}
            >
              Choose Your Country
            </Text>
            <TouchableOpacity onPress={() => setShowCountryModal(true)}>
              <Text style={{ color: "#ffb000", fontSize: 12 }}>
                {countries.length} negara
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={countries.slice(0, 12)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={c => c.code}
            contentContainerStyle={{ paddingHorizontal: 14 }}
            renderItem={({ item, index }) => (
              <CountryCard
                c={item}
                index={index}
                isActive={countryCode === item.code}
                onPress={() => {
                  setSelected(item);
                  setCountryCode(item.code);
                  setActiveCategory("all");
                  setActiveGenre(null);
                }}
              />
            )}
          />
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 14 }}>
          <Text
            style={{
              color: "#fff",
              fontWeight: "800",
              fontSize: 16,
              marginBottom: 10
            }}
          >
            Mood & Genres • {getShortName(selectedCountry?.name || "")}
          </Text>
          {genreLoading ? (
            <ActivityIndicator color="#ffb000" />
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8
              }}
            >
              {genres.map(m => {
                const isActive = activeGenre === m.name;
                return (
                  <TouchableOpacity
                    key={m.name}
                    onPress={() => setActiveGenre(isActive ? null : m.name)}
                    style={{
                      backgroundColor: isActive
                        ? "#ffb000"
                        : m.color || "#1e1e1e",
                      borderWidth: 1.5,
                      borderColor: isActive ? "#ffb000" : "#2a2a2a",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 12,
                      minWidth: "48%",
                      flexDirection: "row",
                      justifyContent: "space-between"
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? "#000" : "#fff",
                        fontWeight: "700",
                        fontSize: 13,
                        textTransform: "capitalize"
                      }}
                    >
                      {m.name}
                    </Text>
                    <Text
                      style={{
                        color: isActive ? "#000" : "#666",
                        fontSize: 11
                      }}
                    >
                      {m.stationcount}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCountryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "flex-end"
          }}
        >
          <View
            style={{
              backgroundColor: "#141414",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: "75%"
            }}
          >
            <View
              style={{
                padding: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: "#262626"
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 16
                }}
              >
                Pilih Negara • {countries.length} negara
              </Text>
              <TouchableOpacity
                onPress={() => setShowCountryModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#262626",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countries}
              keyExtractor={c => c.code}
              initialNumToRender={20}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelected(item);
                    setCountryCode(item.code);
                    setActiveCategory("all");
                    setActiveGenre(null);
                    setShowCountryModal(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    marginHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor:
                      countryCode === item.code ? "#2c1a0f" : "transparent",
                    borderWidth: 1,
                    borderColor:
                      countryCode === item.code ? "#ffb000" : "transparent",
                    marginBottom: 6
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor:
                        countryCode === item.code ? "#ffb000" : "#1e1e1e",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12
                    }}
                  >
                    <Text
                      style={{
                        color: countryCode === item.code ? "#000" : "#888",
                        fontWeight: "800"
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700"
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getShortName(item.name)}
                    </Text>
                    <Text
                      style={{
                        color: "#666",
                        fontSize: 11
                      }}
                    >
                      {item.stationcount} stations
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
