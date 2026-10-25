import { useRef, useState, useCallback, useEffect } from "react";
import { useVideoPlayer, VideoPlayer, VideoSource } from "expo-video";
import { useEvent, useEventListener } from "expo";

function parseIcy(raw: string, fallback: string) {
  const c = raw.trim();
  if (c.includes(" - ")) {
    const [a, ...rest] = c.split(" - ");
    return { title: a.trim(), artist: rest.join(" - ").trim() };
  }
  return { title: c, artist: fallback };
}

async function fetchIcy(uri: string, title: string, artist: string) {
  const base = uri.split("/").slice(0, 3).join("/");

  const res = await fetch(`${base}/status-json.xsl`, {
    headers: { "Cache-Control": "no-cache", "Icy-MetaData": "1" },
  });
  const json = await res.json();
  const src = Array.isArray(json?.icestats?.source)
    ? json.icestats.source[0]
    : json?.icestats?.source;
  const raw = src?.title;
  // console.log(JSON.stringify(json, null, 2));
  if (raw) {
    const resIcy = parseIcy(raw, title);
    title = resIcy?.title || title;
    artist = resIcy?.artist || artist;
    return { title, artist, raw };
  }
  return { title, artist, raw };
}

export function useHls() {
  const playerRef = useRef<VideoPlayer | null>(null);
  const [current, setCurrent] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [parsed, setParsed] = useState<{
    title: string;
    artist: string;
  } | null>(null);

  const player: any = useVideoPlayer("", (p: any) => {
    p.loop = true;
    p.muted = false;
    p.showNowPlayingNotification = true;
  });

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "loading") setIsBuffering(true);
    if (status === "readyToPlay") setIsBuffering(false);
    if (status === "error") {
      console.log("Player status error: ", error.message);
      setIsBuffering(false);
    }
    console.log("statusChange: ", status);
  });

  useEventListener(player, "playingChange", (v: boolean) => {
    console.log("playingChange: " + JSON.stringify(v, null, 2));
    setIsPlaying(v);
  });

  useEventListener(player, "sourceLoad", (v: any) => {
    console.log("sourceLoad: " + JSON.stringify(v, null, 2));
    // if (v) setNowPlaying(v)
  });

  useEventListener(player, "videoTrackChange", (v: any) => {
    console.log("videoTrackChange: " + JSON.stringify(v, null, 2));
    // if (v) setNowPlaying(v)
  });

  useEffect(() => {
    const uri = current?.uri;
    if (!uri) return;

    const poll = async () => {
      try {
        const resIcy = await fetchIcy(uri, current?.title, "Live");
        if (!resIcy) return;

        // cek kalau berubah baru replaceAsync
        if (resIcy.raw !== nowPlaying) {
          console.log("[ICY POLL] Berubah:", resIcy.raw);
          setNowPlaying(resIcy.raw);
          setParsed({ title: resIcy.title, artist: resIcy.artist });
        }
      } catch {}
    };

    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [current?.uri, nowPlaying]);

  

  useEffect(() => {
    if (!parsed || !playerRef.current) return;

    const p: any = playerRef.current;

    // INI AJA, GAK PERLU replaceAsync
    p.title = parsed.title; // Olivia Rodrigo
    p.artist = parsed.artist; // less

    console.log(
      "[NOTIF UPDATE] tanpa replaceAsync:",
      parsed.title,
      "-",
      parsed.artist,
    );
  }, [parsed?.title, parsed?.artist]);

  const play = useCallback(async (item: any) => {
    const uri = item?.uri;
    if (!uri) return;

    let artwork = item?.thumbnail;
    let title = item?.title || item?.name || "Gen FM";
    let artist = "Online Stream";

    setCurrent(item);
    setIsBuffering(true);
    setNowPlaying(null);
    setParsed(null);

    // 1. FETCH DULU SEBELUM PLAY (biar notif langsung bener)
    try {
      const resIcy = await fetchIcy(uri, title, artist); // fetchIcy harus return { title, artist, raw }
      if (resIcy) {
        title = resIcy.title; // 【entity-Olivia Rodrigo¦canonical_name=Olivia Rodrigo】
        artist = resIcy.artist; // less
        setNowPlaying(resIcy.raw); // raw = "less - 【entity-Olivia Rodrigo¦canonical_name=Olivia Rodrigo】"
        setParsed({ title, artist });
      }
    } catch {}

    // 2. BARU PLAY DENGAN METADATA YANG UDAH BENER
    const source: VideoSource = {
      uri,
      metadata: { title, artist, artwork },
      headers: { "Icy-MetaData": "1" },
    };

    console.log("[Hls] Play dengan:", title, "-", artist);
    await (playerRef.current as any).replaceAsync?.(source);
    playerRef.current?.play();
  }, []);

  const pause = useCallback(async () => {
    try {
      playerRef.current?.pause();
    } catch {}
  }, []);
  const resume = useCallback(async () => {
    try {
      playerRef.current?.play();
    } catch {}
  }, []);
  const stop = useCallback(async () => {
    try {
      playerRef.current?.pause();
      setCurrent(null);
      setNowPlaying(null);
      setParsed(null);
    } catch {}
  }, []);

  return {
    current,
    isPlaying,
    isBuffering,
    nowPlaying,
    play,
    pause,
    resume,
    stop,
    player,
  };
}
