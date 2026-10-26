import AsyncStorage from "@react-native-async-storage/async-storage";

let MIRROR = "https://de1.api.radio-browser.info";
const FALLBACK = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
];
export const getRadioMirror = async () => MIRROR;

export type RadioStation = {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  votes: number;
  homepage: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  [key: string]: any;
};
export type RadioCountry = { name: string; code: string; stationcount: number };
export type RadioGenre = { name: string; stationcount: number; color?: string };

const GENRE_COLORS: Record<string, string> = {
  pop: "#2a1a2e",
  dangdut: "#3b0a0a",
  news: "#0f2a2a",
  talk: "#0f2a2a",
  rock: "#2a1a0a",
  chill: "#1e293b",
  jazz: "#1a2a2a",
};

const fetchWithFallback = async (path: string) => {
  for (const m of FALLBACK) {
    try {
      const r = await fetch(`${m}${path}`, {
        headers: { "User-Agent": "MoonHub/1.0" },
      });
      if (r.ok) {
        MIRROR = m;
        return await r.json();
      }
    } catch {}
  }
  return [];
};
const fetchStations = async (path: string) => {
  try {
    const d = await fetchWithFallback(path);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
};
const getSearch = async (param: string) =>
  await fetchStations(
    `/json/stations/search?hidebroken=true&order=votes&reverse=true&${param}`,
  );

export async function fetchCountry(): Promise<RadioCountry[]> {
  try {
    const c = await AsyncStorage.getItem("radio_countries_cache");
    const t = await AsyncStorage.getItem("radio_countries_cache_time");
    if (c && t && Date.now() - parseInt(t) < 1000 * 60 * 60 * 6)
      return JSON.parse(c);
    const res = await fetchWithFallback(
      "/json/countries?order=stationcount&reverse=true&hidebroken=true",
    );
    const mapped = res
      .map((x: any) => ({
        name: x.name?.trim(),
        code: x.iso_3166_1?.trim(),
        stationcount: parseInt(x.stationcount || "0", 10),
      }))
      .filter((x: any) => x.name && x.code && x.stationcount > 5);
    if (mapped.length) {
      await AsyncStorage.setItem(
        "radio_countries_cache",
        JSON.stringify(mapped),
      );
      await AsyncStorage.setItem(
        "radio_countries_cache_time",
        Date.now().toString(),
      );
    }
    return mapped;
  } catch {
    return [];
  }
}

export const getTopGenresByCountry = async (
  code: string,
  limit = 10,
): Promise<RadioGenre[]> => {
  const cacheKey = `radio_genres_${code}`;
  try {
    const cc = await AsyncStorage.getItem(cacheKey);
    const ct = await AsyncStorage.getItem(`${cacheKey}_time`);
    if (cc && ct && Date.now() - parseInt(ct) < 1000 * 60 * 60 * 6)
      return JSON.parse(cc);
    const stations = await getStationsByCountry(code, 100);
    const counts: Record<string, number> = {};
    stations.forEach((s) => {
      (s.tags || "")
        .split(",")
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean)
        .forEach((tag: string) => {
          if (tag.length < 2 || tag.length > 20) return;
          if (["fm", "am", "radio", "music", "live", "hits"].includes(tag))
            return;
          if (/^\d+$/.test(tag)) return;
          counts[tag] = (counts[tag] || 0) + 1;
        });
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({
        name,
        stationcount: count,
        color: GENRE_COLORS[name] || "#1e1e1e",
      }));
    if (sorted.length) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(sorted));
      await AsyncStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    }
    return sorted;
  } catch {
    return [];
  }
};

export const getTopStations = async (limit = 50) =>
  await getSearch(`limit=${limit}`);
export const getStationsByCountry = async (code: string, limit = 50) => {
  if (code === "TOP" || code === "all") return await getTopStations(limit);
  return await getSearch(`countrycode=${code}&limit=${limit}`);
};
export const getStationsByTag = async (tag: string, limit = 50) =>
  await getSearch(`tag=${encodeURIComponent(tag)}&limit=${limit}`);
export const searchStations = async (
  country: string,
  query: string,
): Promise<RadioStation[]> => {
  if (!query.trim()) return [];
  const q = query.trim();
  try {
    let r: RadioStation[] = [];
    if (country && country !== "TOP" && country !== "all") {
      r = await getStationsByCountry(country, 100);
      r = r.filter(
        (s) =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.tags.toLowerCase().includes(q.toLowerCase()),
      );
    }
    if (r.length === 0) {
      r = await getSearch(`name=${encodeURIComponent(q)}&limit=100`);
    }
    return r.slice(0, 100).sort((a, b) => b.votes - a.votes);
  } catch {
    return [];
  }
};
export const resolveStream = async (uuid: string): Promise<string> => {
  try {
    const s = await fetchStations(`/json/stations/byuuid/${uuid}`);
    return s[0]?.url_resolved || s[0]?.url || "";
  } catch {
    return "";
  }
};
