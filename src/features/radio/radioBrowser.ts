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

// CACHE LAYER
const CACHE_TTL = 10 * 60 * 1000;
const memoryCache = new Map<string, { data: any; ts: number }>();

const getCacheKey = (path: string) => `radio_cache:${path}`;

const getCached = async (path: string) => {
  const mem = memoryCache.get(getCacheKey(path));
  if (mem && Date.now() - mem.ts < CACHE_TTL) {
    console.log(`[Cache] HIT memory ${path}`);
    return mem.data;
  }
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(path));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < CACHE_TTL) {
        console.log(`[Cache] HIT storage ${path}`);
        memoryCache.set(getCacheKey(path), parsed);
        return parsed.data;
      }
    }
  } catch {}
  return null;
};

const setCached = async (path: string, data: any) => {
  const entry = { data, ts: Date.now() };
  memoryCache.set(getCacheKey(path), entry);
  await AsyncStorage.setItem(getCacheKey(path), JSON.stringify(entry));
};

const fetchStations = async (path: string, useCache = true) => {
  // if (useCache) {
  //   const cached = await getCached(path);
  //   if (cached) return cached;
  // }
  // console.log(`[Fetch] ${path}`);
  const res = await fetch(`${MIRROR}${path}`, { headers: { "User-Agent": "MoonHub/1.0" } });
  const data = await res.json();
  const result = Array.isArray(data) ? data : [];
  // if (result.length > 0 && useCache) await setCached(path, result);
  return result;
};

const getSearch = async (parameter:string) => {
  return await fetchStations(`/json/stations/search?hls=0&reverse=true&nameExact=false&hidebroken=true&${parameter}`)
}

const fuzzyMatch = (name: string, query: string): boolean => {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  if (n.includes(q)) return true;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.every(p => n.includes(p));
  if (n.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) return true;
  return false;
};

export const getTopStations = async (limit = 50) => {
  return await getSearch(`order=votes&limit=${limit}`)
  // return fetchStations(`/json/stations/topclick/${limit}?hidebroken=true&order=votes&reverse=true`);
};

export const getIndoStations = async (limit = 10) => {
  return await getSearch(`countrycode=ID&limit=${limit}`)
  // return fetchStations(`/json/stations/bycountrycodeexact/ID?hidebroken=true&order=votes&reverse=true&limit=${limit}`);
};

export const getStationsByCountry = async (code: string, limit = 10) => {
  if (code === "TOP") return await getTopStations(limit);
  return await getSearch(`countrycode=${code}&limit=${limit}&order=votes`)
  // return fetchStations(`/json/stations/bycountrycodeexact/${code}?hidebroken=true&order=votes&reverse=true&limit=${limit}`);
};

export const searchStations = async (country:string, query: string): Promise<RadioStation[]> => {
  if (!query.trim()) return [];
  const q = query.trim();
  const [byCountry] = await Promise.all([
   getStationsByCountry(country, 500)
  ]);
  const merged = [...byCountry];
  const map = new Map<string, RadioStation>();
  merged.forEach(s => { if (!map.has(s.stationuuid)) map.set(s.stationuuid, s); });
  let results = Array.from(map.values());
  if (results.length === 0) {
    const indo = await getIndoStations(500);
    results = indo.filter(s => fuzzyMatch(s.name, q));
  } else {
    const fuzzyFiltered = results.filter(s => fuzzyMatch(s.name, q) || fuzzyMatch(s.tags, q) || fuzzyMatch(s.state, q));
    if (fuzzyFiltered.length > 0) results = fuzzyFiltered;
  }
  results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const qq = q.toLowerCase();
    const aStarts = aName.startsWith(qq) ? 0 : aName.includes(qq) ? 1 : 2;
    const bStarts = bName.startsWith(qq) ? 0 : bName.includes(qq) ? 1 : 2;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return b.votes - a.votes;
  });
  return results.slice(0, 100);
};

export const resolveStream = async (uuid: string): Promise<string> => {
  const stations = await fetchStations(`/json/stations/byuuid/${uuid}`, false);
  return stations[0]?.url_resolved || stations[0]?.url || "";
};

export const clearRadioCache = async () => {
  memoryCache.clear();
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter(k => k.startsWith('radio_cache:')));
};