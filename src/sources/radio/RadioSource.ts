import { Source } from "../base/Source";
import { MediaItem, Library } from "../../types";
import { RADIO_SERVER } from "./radioServers";

export class RadioSource extends Source {
 constructor(config: any) {
  super(config);
 }

 async getLibraries(): Promise<Library[]> {
  return [{ id: `${this.id}_radio`, name: "Radio", path: "radio", mediaType: "music" as any }];
 }

 async getItems(): Promise<MediaItem[]> {
  const stations = RADIO_SERVER;

  // FIX: tambahin size: 0 biar gak error MediaItem requires size
  return stations.map(
   (s, idx) =>
    ({
     id: `radio_${this.id}_${idx}`,
     sourceId: this.id,
     name: s.name,
     title: s.name,
     path: s.url,
     uri: s.url,
     mediaType: "music" as any,
     type: "song" as any,
     thumbnail: s.thumb,
     size: 0, 
     duration: 0,
    }) as MediaItem,
  );
 }

 async getItem(): Promise<MediaItem | null> {
  return null;
 }
 async getStreamUrl(itemId: string): Promise<string | null> {
  return itemId;
 }
 async search(): Promise<MediaItem[]> {
  return [];
 }
}
