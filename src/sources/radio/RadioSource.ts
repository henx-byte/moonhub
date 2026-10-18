import { Source } from "../base/Source";
import { MediaItem, Library, SourceConfig } from "../../types";

const RADIO_STATIONS = [
  {
    id: "prambors-jkt",
    name: "Prambors FM",
    stream: "https://stream.rcs.revma.com/q6nx17h26mpwv",
    thumbnail: "",
  },
  {
    id: "genfm-jkt",
    name: "Gen FM 98.7 (Jakarta)",
    stream: "https://wz.mari.co.id:1936/noice_genfm/genfm/playlist.m3u8",
    thumbnail: "",
  },
  {
    id: "genfm-sby",
    name: "Gen FM 103.1 (Surabaya)",
    stream: "https://wz.mari.co.id:1936/noice_genfmsby/gensbyic.stream/chunklist_w925449887.m3u8",
    thumbnail: "",
  },
  {
    id: "suarasurabaya",
    name: "Suara Surabaya 100 FM",
    stream: "https://c5.siar.us/proxy/ssfm/stream",
    thumbnail: "",
  },
];

export class RadioSource extends Source {
  constructor(config: SourceConfig) {
    super(config);
  }

  async getLibraries(): Promise<Library[]> {
    return [
      {
        id: `radio_${this.id}`,
        name: "Radio",
        path: "radio",
        mediaType: "music",
      },
    ];
  }

  async getItems(): Promise<MediaItem[]> {
    return RADIO_STATIONS.map((s) => ({
      id: `radio_${s.id}`,
      sourceId: this.id,
      name: s.name,
      title: s.name,
      path: s.id,
      uri: s.stream,
      mediaType: "music",
      type: "song",
      thumbnail: s.thumbnail,
    }));
  }

  async getItem(itemId: string): Promise<MediaItem | null> {
    const items = await this.getItems();
    return items.find((i) => i.id === itemId) || null;
  }

  async getStreamUrl(itemId: string): Promise<string | null> {
    const item = await this.getItem(itemId);
    return item?.uri || null;
  }

  async search(query: string): Promise<MediaItem[]> {
    const items = await this.getItems();
    const lower = query.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(lower));
  }
}