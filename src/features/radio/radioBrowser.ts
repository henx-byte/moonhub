import AsyncStorage from "@react-native-async-storage/async-storage";

let MIRROR = "https://de1.api.radio-browser.info";
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

// FIX: Timeout 20 detik untuk stations, 10 detik untuk stats
// limit kecil biar gak timeout dari Indonesia
const fetchWithTimeout = async (url: string, timeoutMs = 20000) => {
  const fetchPromise = fetch(url, {
    headers: { "User-Agent": "MoonHub/1.0" }
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout ${timeoutMs / 1000}s`)),
      timeoutMs
    )
  );
  return Promise.race([fetchPromise, timeoutPromise]) as Promise<Response>;
};

const fetchStations = async (
  path: string,
  timeoutMs = 20000,
  cacheKey?: string
) => {
  // 1. Coba cache dulu kalau ada
  if (cacheKey) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      const t = await AsyncStorage.getItem(`${cacheKey}_time`);
      if (cached && t && Date.now() - parseInt(t) < 1000 * 60 * 60 * 6) {
        console.log(`[radio] using cache ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch {}
  }

  try {
    const res = await fetchWithTimeout(`${MIRROR}${path}`, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    console.log(`[radio] OK ${path} -> ${arr.length}`);
    // simpan cache
    if (cacheKey && arr.length > 0) {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(arr));
      await AsyncStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    }
    return arr;
  } catch (e: any) {
    console.log(`[radio] fetch fail ${path} -> ${e.message}`);
    // 2. Kalau fail, coba pakai cache lama (meski expired)
    if (cacheKey) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          console.log(`[radio] fail -> using cache ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch {}
    }
    return [];
  }
};

export const getSearch = async (param: string, limit = 10, offset = 0) => {
  // offset = jumlah record yang di-skip! 0,10,20 bukan 0,1,2
  const cacheKey =
    offset === 0 ? `radio_cache_${param}_limit${limit}` : undefined; // cache cuma offset 0
  return await fetchStations(
    `/json/stations/search?hidebroken=true&order=votes&reverse=true&limit=${limit}&offset=${offset}&${param}`,
    20000,
    cacheKey
  );
};

export async function fetchCountry(): Promise<RadioCountry[]> {
  try {
    const c = await AsyncStorage.getItem("radio_countries_cache");
    const t = await AsyncStorage.getItem("radio_countries_cache_time");
    if (c && t && Date.now() - parseInt(t) < 1000 * 60 * 60 * 6)
      return JSON.parse(c);
    const res = await fetchStations(
      "/json/countries?order=stationcount&reverse=true&hidebroken=true",
      15000,
      "radio_countries_cache"
    );
    const mapped = res
      .map((x: any) => ({
        name: x.name?.trim(),
        code: x.iso_3166_1?.trim(),
        stationcount: parseInt(x.stationcount || "0", 10)
      }))
      .filter((x: any) => x.name && x.code && x.stationcount > 5);
    if (mapped.length) {
      await AsyncStorage.setItem(
        "radio_countries_cache",
        JSON.stringify(mapped)
      );
      await AsyncStorage.setItem(
        "radio_countries_cache_time",
        Date.now().toString()
      );
    }
    return mapped;
  } catch {
    try {
      const c = await AsyncStorage.getItem("radio_countries_cache");
      if (c) return JSON.parse(c);
    } catch {}
    return [];
  }
}

export const computeGenresFromStations = (
  stationsList: RadioStation[],
  limit = 12
): RadioGenre[] => {
  const uniqueTags = new Set<string>();
  stationsList.forEach(s => {
    (s.tags || "")
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(t => {
        if (t.length < 2 || t.length > 20) return false;
        if (/^\d+$/.test(t)) return false;
        if (
          ["fm", "am", "radio", "music", "live", "hits", "online"].includes(t)
        )
          return false;
        return true;
      })
      .forEach(t => uniqueTags.add(t));
  });
  const counts: Record<string, number> = {};
  uniqueTags.forEach(tag => {
    counts[tag] = stationsList.filter(s =>
      (s.tags || "").toLowerCase().includes(tag)
    ).length;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, stationcount: count, color: "#1C1C1E" }));
};

// LIMIT KECIL MON! Default 10 biar enteng, More pakai offset!
export const getTopStations = async (offset = 0, limit = 10) =>
  await getSearch("", limit, offset);
export const getStationsByCountry = async (
  code: string,
  offset = 0,
  limit = 10
) => {
  if (code === "TOP" || code === "all")
    return await getTopStations(offset, limit);
  return await getSearch(`countrycode=${code}`, limit, offset);
};
export const getStationsByTag = async (tag: string, offset = 0, limit = 10) =>
  await getSearch(`tag=${encodeURIComponent(tag)}`, limit, offset);

export const searchStations = async (
  country: string,
  query: string,
  offset = 0,
  limit = 10
): Promise<RadioStation[]> => {
  if (!query.trim()) return [];
  const qString = query.trim();
  try {
    // Search by name langsung pakai offset biar bisa pagination! Default 10 enteng
    const r = await getSearch(
      `name=${encodeURIComponent(qString)}${country}`,
      limit,
      offset
    );
    return r.sort((a, b) => b.votes - a.votes);
  } catch {
    return [];
  }
};

export const voteStation = async (uuid: string) => {
  try {
    await fetchWithTimeout(`${MIRROR}/json/vote/${uuid}`, 10000);
  } catch {}
  return true;
};
export const clickStation = async (uuid: string) => {
  try {
    await fetchWithTimeout(`${MIRROR}/json/url/${uuid}`, 10000);
  } catch {}
};
export const resolveStream = async (uuid: string): Promise<string> => {
  try {
    const s = await fetchStations(`/json/stations/byuuid/${uuid}`, 15000);
    return s[0]?.url_resolved || s[0]?.url || "";
  } catch {
    return "";
  }
};
export const getServerStats = async () => {
  try {
    const res = await fetchWithTimeout(`${MIRROR}/json/stats`, 10000);
    if (!res.ok) throw new Error("not ok");
    return await res.json();
  } catch {
    return null;
  }
};
