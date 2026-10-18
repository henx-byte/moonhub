import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { colors } from "../../src/theme/colors";
import { SourceConfig } from "../../src/types";
import { getSourceConfigs, addSourceConfig, removeSourceConfig, updateSourceConfig } from "../../src/stores/sourceStore";
import { Ionicons } from "@expo/vector-icons";
import { StorageAccessFramework } from "expo-file-system/legacy";

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// CLEAN TITLE - biar Moonhub bukan content://...
function cleanTitle(item: SourceConfig): string {
  const cfg = item.config as any;
  const rawName = item.name || "";
  
  // Kalo name udah bagus (bukan path), pakai langsung
  if (rawName && !rawName.startsWith("content://") && !rawName.startsWith("http") && rawName.length < 35) {
    return rawName;
  }

  const path = cfg?.path || cfg?.folderUri || cfg?.url || "";
  try {
    if (path.startsWith("content://")) {
      const decoded = decodeURIComponent(path);
      let folder = decoded.split("/").pop() || decoded.split(":").pop() || "";
      folder = folder.replace("primary:", "").replace("primary%3A", "");
      folder = folder.split("/")[0];
      if (folder && folder.length > 1 && folder.length < 25) return folder;
      if (decoded.toLowerCase().includes("moonhub")) return "Moonhub";
      if (decoded.toLowerCase().includes("music")) return "Music Folder";
      if (decoded.toLowerCase().includes("download")) return "Downloads";
      return "Local Folder";
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const url = new URL(path);
        if (url.hostname.startsWith("192.168.")) return `Cloud ${url.hostname.split(".").pop()}`;
        if (url.hostname.includes("drive.google")) return "Cloud GDrive";
        return url.hostname || "Cloud Server";
      } catch {
        return "Cloud Server";
      }
    }
  } catch {}

  if (item.type === "radio") return "Radio";
  if (item.type === "local") return "Local Folder";
  if (item.type === "gdrive" || item.type === "cloud") return item.name || "Cloud";

  return item.name || "Source";
}

export default function SourcesScreen() {
  const [configs, setConfigs] = useState<SourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudName, setCloudName] = useState("");
  const [showCloudInput, setShowCloudInput] = useState(false);
  const [picking, setPicking] = useState(false);

  async function refresh() {
    setLoading(true);
    const data = await getSourceConfigs();
    setConfigs(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function pickFolderSAF(): Promise<string | null> {
    try {
      setPicking(true);
      console.log("Picking SAF...");
      const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      setPicking(false);
      console.log("SAF perm:", perm);
      if (!perm.granted) {
        Alert.alert("Dibatalkan", "Lu gak kasih izin folder mon");
        return null;
      }
      return perm.directoryUri;
    } catch (e: any) {
      setPicking(false);
      console.log("SAF Error:", e);
      Alert.alert("Error SAF", String(e?.message || e));
      return null;
    }
  }

  async function handleAddLocal() {
    const folderUri = await pickFolderSAF();
    if (!folderUri) return;

    const displayName = folderUri.split("%2F").pop() || folderUri.split("/").pop() || "Local";
    const decoded = decodeURIComponent(displayName).replace("primary:", "");
    
    const newConfig: SourceConfig = {
      id: genId("local"),
      name: `${decoded || "Moonhub"} (${configs.filter(c => c.type === 'local').length + 1})`.replace("  (", " ("),
      type: "local",
      enabled: true,
      config: { 
        path: folderUri,
        folderUri: folderUri,
        displayPath: decoded,
        name: decoded,
      },
      libraries: [],
    };
    await addSourceConfig(newConfig);
    Alert.alert("Sukses mon!", `Folder ${decoded} ditambahkan.`);
    refresh();
  }

  async function handleAddCloud() {
    if (!cloudUrl.trim()) return Alert.alert("URL kosong mon");
    let url = cloudUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
    }

    const name = cloudName.trim() || `Cloud ${configs.filter(c => c.type === 'cloud' || c.type === 'gdrive').length + 1}`;

    const newConfig: SourceConfig = {
      id: genId("cloud"),
      name: name,
      type: "cloud", // universal, ganti dari gdrive
      enabled: true,
      config: { url: url, path: url, name: name },
      libraries: [],
    };
    await addSourceConfig(newConfig);
    setCloudUrl("");
    setCloudName("");
    setShowCloudInput(false);
    refresh();
  }

  async function handleToggle(id: string, enabled: boolean) {
    await updateSourceConfig(id, { enabled });
    refresh();
  }

  async function handleRemove(id: string) {
    Alert.alert("Hapus Source?", "Yakin mon?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
        console.log(`[Sources] Removing ${id}`);
        await removeSourceConfig(id); // PAKAI removeSourceConfig YANG BENER!
        refresh();
      }}
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sources</Text>
      <Text style={styles.subHeader}>SDK 57 • Atur dari mana musik lu diambil</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, picking && { opacity: 0.6 }]} onPress={handleAddLocal} disabled={picking}>
          <Ionicons name="folder-open" size={18} color={colors.background} />
          <Text style={styles.btnText}>{picking ? " Picking..." : " Local Folder (SAF)"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setShowCloudInput(!showCloudInput)}>
          <Ionicons name="cloud" size={18} color={colors.text} />
          <Text style={[styles.btnText, { color: colors.text }]}> Cloud</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleAddLocal} style={{ marginTop: 10 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>SAF error terus? Pencet sini pakai alternatif</Text>
      </TouchableOpacity>

      {showCloudInput && (
        <View style={{ marginTop: 12, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 6 }}>Nama Server (opsional)</Text>
          <TextInput
            style={styles.input}
            placeholder="GDrive 1, Server Rumah, Manga Server..."
            placeholderTextColor={colors.textMuted}
            value={cloudName}
            onChangeText={setCloudName}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 10, marginBottom: 6 }}>URL / Link</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="192.168.1.146:8080 atau https://..."
              placeholderTextColor={colors.textMuted}
              value={cloudUrl}
              onChangeText={setCloudUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddCloud}>
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 8 }}>Bisa HTTP lokal, GDrive, atau server manga/comic online</Text>
        </View>
      )}

      <FlatList
        data={configs}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isLocal = item.type === 'local';
          const isCloud = item.type === 'cloud' || item.type === 'gdrive';
          const displayPath = (item.config as any)?.displayPath || (item.config as any)?.folderUri || (item.config as any)?.path || (item.config as any)?.url || item.id.slice(0,12);
          const title = cleanTitle(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons 
                  name={isLocal ? 'phone-portrait' : isCloud ? 'cloud' : 'radio'} 
                  size={22} color={colors.primary} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.type} • {decodeURIComponent(String(displayPath)).slice(-35)}</Text>
              </View>
              <Switch value={item.enabled} onValueChange={(v) => handleToggle(item.id, v)} trackColor={{ true: colors.primary }} thumbColor={colors.background} />
              <TouchableOpacity onPress={() => handleRemove(item.id)} style={{ marginLeft: 12, width: 36, height: 36, justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="trash" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { fontSize: 28, fontWeight: "bold", color: colors.text },
  subHeader: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 12 },
  btn: { flexDirection: "row", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center", flex: 1, justifyContent: "center" },
  btnText: { color: colors.background, fontWeight: "700", fontSize: 13 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, color: colors.text, height: 44 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardTitle: { color: colors.text, fontWeight: "600", fontSize: 13 },
  cardSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
