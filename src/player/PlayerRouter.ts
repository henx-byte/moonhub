import { MediaItem } from "../types";

export type PlayerType = 'mp3' | 'hls' | 'webview' | 'reader';

export function getPlayerType(item: MediaItem): PlayerType {
  const uri = (item.uri || (item as any).url || "").toLowerCase();
  // reader
  if (item.mediaType === 'comic' || (item as any).type === 'comic' || item.extra?.iscomic) return 'reader';
  // mp3 only - local files, .mp3, .m4a, .wav, .flac, .ogg
  if (uri.endsWith('.mp3') || uri.endsWith('.m4a') || uri.endsWith('.wav') || uri.endsWith('.flac') || uri.endsWith('.ogg') || item.mediaType === 'music' && !uri.includes('m3u8')) {
    return 'mp3';
  }
  // hls - .m3u8, radio live, video
  if (uri.includes('.m3u8') || uri.includes('m3u8') || item.extra?.isLive || item.extra?.isRadio || item.mediaType === 'radio' || item.mediaType === 'video') {
    return 'hls';
  }
  // fallback webview
  return 'webview';
}

export function shouldFallbackToWebView(error:any): boolean {
  const msg = String(error||"").toLowerCase();
  return msg.includes('exoplayer') || msg.includes('source error') || msg.includes('format unsupported') || msg.includes('decoder');
}
