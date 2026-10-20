// src/features/radio/types.ts
// Interface mengikuti response resmi radio-browser.info
// Docs: https://de1.api.radio-browser.info/#

export interface RadioStation {
  changeuuid: string;
  stationuuid: string; // PRIMARY KEY - gunakan ini untuk fav & resolve
  serveruuid?: string;
  name: string; // "Prambors FM"
  url: string; // may be outdated, JANGAN langsung play - resolve dulu via /json/url/{uuid}
  url_resolved: string; // sometimes outdated too, still resolve
  homepage: string;
  favicon: string;
  tags: string; // comma separated: "pop,indonesia,jakarta"
  country: string; // "Indonesia"
  countrycode: string; // "ID"
  state: string; // "DKI Jakarta"
  language: string; // "indonesian"
  languagecodes: string; // "id"
  votes: number;
  lastchangetime: string;
  lastchangetime_iso8601: string;
  codec: string; // "MP3", "AAC"
  bitrate: number; // 128
  hls: number; // 0/1 - if 1, use HLS player
  lastcheckok: number; // 1 = ok, 0 = broken
  lastchecktime: string;
  lastcheckoktime: string;
  clicktimestamp: string;
  clickcount: number; // total clicks - naik setiap resolveStream
  clicktrend: number; // positive if trending
  ssl_error: number;
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info?: boolean;
}

export type RadioApiResponse = RadioStation[];

export interface RadioUrlResolveResponse {
  ok: boolean;
  message: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string; // <-- PLAY THIS
}

export enum RadioTab {
  TOP = "top",
  INDONESIA = "id",
  FAVORITES = "fav",
  SEARCH = "search",
}