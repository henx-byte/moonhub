export type RadioStation = {
 stationuuid: string;
 name: string;
 url: string;
 url_resolved?: string;
 favicon?: string;
 tags?: string;
 country?: string;
 countrycode?: string;
 votes: number;
 bitrate?: number;
 codec?: string;
 lastcheckok?: number;
};

let cachedMirror: string | null = null;
let mirrorCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24;

export async function getRadioMirror(): Promise<string> {
 const now = Date.now();
 if (cachedMirror && now - mirrorCacheTime < CACHE_TTL) {
  return cachedMirror;
 }
 try {
  const res = await fetch("https://all.api.radio-browser.info/json/servers", {
   headers: { "User-Agent": "MoonHub/1.0" },
  });
  const servers: any[] = await res.json();
  const httpsServers = servers.filter((s: any) => s.url?.startsWith("https://"));
  const selected: string | undefined = httpsServers[0]?.url || servers[0]?.url;
  if (!selected) throw new Error("No mirror");
  cachedMirror = selected.replace(/\/$/, "");
  mirrorCacheTime = now;
  return cachedMirror;
 } catch (e) {
  cachedMirror = "https://de1.api.radio-browser.info";
  mirrorCacheTime = now;
  return cachedMirror;
 }
}

export async function resolveStream(stationUuid: string): Promise<string> {
 const mirror = await getRadioMirror();
 const url = `${mirror}/json/url/${stationUuid}`;
 const res = await fetch(url, { headers: { "User-Agent": "MoonHub/1.0" } });
 if (!res.ok) throw new Error("Failed resolve");
 const data = await res.json();
 return data.url_resolved || data.url;
}

export async function getTopStations(limit = 100): Promise<RadioStation[]> {
 const mirror = await getRadioMirror();
 const res = await fetch(`${mirror}/json/stations/topvote/${limit}?hidebroken=true&order=votes&reverse=true`);
 return res.json();
}

export async function getIndoStations(limit = 100): Promise<RadioStation[]> {
 const mirror = await getRadioMirror();

 // Coba 3 cara, karena data Indonesia di DB kadang berantakan
 const tries = [`${mirror}/json/stations/search?countrycode=ID&hidebroken=true&order=votes&reverse=true&limit=${limit}`, `${mirror}/json/stations/bycountry/Indonesia?hidebroken=true&order=votes&reverse=true&limit=${limit}`, `${mirror}/json/stations/bycountrycodeexact/ID?hidebroken=true&order=votes&reverse=true&limit=${limit}`, `${mirror}/json/stations/search?country=Indonesia&hidebroken=true&limit=${limit}`];

 for (const url of tries) {
  try {
   console.log("[Radio] trying Indo:", url);
   const res = await fetch(url, { headers: { "User-Agent": "MoonHub/1.0" } });
   const data = await res.json();
   if (Array.isArray(data) && data.length > 0) {
    // filter lagi biar bener-bener Indonesia
    const filtered = data.filter((s: any) => s.countrycode === "ID" || s.country?.toLowerCase().includes("indonesia"));
    if (filtered.length > 0) {
     console.log(`[Radio] Indo found ${filtered.length} stations`);
     return filtered;
    }
    // kalau gak ada filter, return semua dari endpoint itu
    if (data.length > 0) return data;
   }
  } catch (e) {
   console.log("[Radio] Indo try failed", e);
   continue;
  }
 }

 // Last resort: search manual dengan tag
 try {
  const fallbackUrl = `${mirror}/json/stations/search?tag=indonesia&hidebroken=true&limit=${limit}`;
  const res = await fetch(fallbackUrl);
  const data = await res.json();
  if (data.length > 0) return data;
 } catch {}

 return [];
}

export async function searchStations(query: string): Promise<RadioStation[]> {
 const mirror = await getRadioMirror();
 const res = await fetch(`${mirror}/json/stations/search?name=${encodeURIComponent(query)}&hidebroken=true&limit=50`);
 return res.json();
}
