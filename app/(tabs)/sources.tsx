// FIXED Sources - SafeArea biar gak ketumpuk 07.12
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { useEffect, useState } from "react";
import { colors } from "../../src/theme/colors";
import { SourceConfig } from "../../src/types";
import { getSourceConfigs, addSourceConfig, removeSourceConfig, updateSourceConfig } from "../../src/stores/sourceStore";
import { Ionicons } from "@expo/vector-icons";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";

function genId(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function cleanTitle(item: SourceConfig): string {
  const cfg = item.config as any;
  const rawName = item.name || "";
  if (rawName && !rawName.startsWith("content://") && !rawName.startsWith("http") && rawName.length < 35) return rawName;
  const path = cfg?.path || cfg?.folderUri || cfg?.url || "";
  try {
    if (path.startsWith("content://")) {
      const decoded = decodeURIComponent(path);
      let folder = decoded.split("/").pop() || decoded.split(":").pop() || "";
      folder = folder.replace("primary:", "").replace("primary%3A", "").split("/")[0];
      if (!folder || folder.length < 2 || folder.length > 25) {
        if (decoded.toLowerCase().includes("moonhub")) return "Moonhub";
        if (decoded.toLowerCase().includes("music")) return "Music Folder";
        return "Local Folder";
      }
      return folder;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const url = new URL(path);
        if (url.hostname.startsWith("192.168.") || url.hostname === "localhost") return item.name && !item.name.startsWith("http") ? item.name : `Cloud ${url.hostname.split(".").pop()}`;
        return item.name || url.hostname.replace("www.", "") || "Cloud";
      } catch { return item.name || "Cloud"; }
    }
  } catch {}
  return item.name || "Source";
}

export default function SourcesScreen() {
  const [configs, setConfigs] = useState<SourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudName, setCloudName] = useState("");
  const [showCloudInput, setShowCloudInput] = useState(false);
  const [picking, setPicking] = useState(false);
  const insets = useSafeAreaInsets();

  async function refresh() { setLoading(true); const data = await getSourceConfigs(); setConfigs(data); setLoading(false); }
  useEffect(() => { refresh(); }, []);

  async function pickFolderSAF(): Promise<string | null> {
    try { setPicking(true); const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(); setPicking(false); if (!perm.granted) { Alert.alert("Dibatalkan", "Lu gak kasih izin folder mon"); return null; } return perm.directoryUri; } catch (e: any) { setPicking(false); Alert.alert("Error SAF", String(e?.message || e)); return null; }
  }

  async function handleAddLocal() {
    const folderUri = await pickFolderSAF();
    if (!folderUri) return;
    const displayName = folderUri.split("%2F").pop() || folderUri.split("/").pop() || "Local";
    const decoded = decodeURIComponent(displayName).replace("primary:", "");
    const newConfig: SourceConfig = { id: genId("local"), name: decoded.length > 20 ? "Moonhub" : decoded || "Local", type: "local", enabled: true, config: { path: folderUri, folderUri, displayPath: decoded, name: decoded }, libraries: [] };
    await addSourceConfig(newConfig); Alert.alert("Sukses mon!", `Folder ${decoded} ditambahkan.`); refresh();
  }

  async function handleAddCloud() {
    if (!cloudUrl.trim()) return Alert.alert("URL kosong mon");
    let url = cloudUrl.trim(); if (!url.startsWith("http://") && !url.startsWith("https://")) url = "http://" + url;
    const name = cloudName.trim() || `Cloud ${configs.filter(c => (c.type as string) === 'cloud').length + 1}`;
    const newConfig: SourceConfig = { id: genId("cloud"), name, type: "cloud", enabled: true, config: { url, path: url, name }, libraries: [] };
    await addSourceConfig(newConfig); setCloudUrl(""); setCloudName(""); setShowCloudInput(false); refresh();
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* FIX: SafeArea + paddingTop */}
      <View style={[styles.header, { paddingTop: insets.top - 4 }]}>
        <Text style={styles.headerTitle}>Sources</Text>
        <Text style={styles.headerSub}>SDK 57 • Atur dari mana musik lu diambil • generic type</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, picking && { opacity: 0.6 }]} onPress={handleAddLocal} disabled={picking}>
          <Ionicons name="folder-open" size={18} color="#000" />
          <Text style={styles.btnText}>{picking ? " Picking..." : " Local Folder (SAF)"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setShowCloudInput(!showCloudInput)}>
          <Ionicons name="cloud" size={18} color={colors.text} />
          <Text style={[styles.btnText, { color: colors.text }]}> Cloud</Text>
        </TouchableOpacity>
      </View>

      {showCloudInput && (
        <View style={{ marginTop: 12, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
          <TextInput style={styles.input} placeholder="Nama: Cloud 1, GDrive, Manga Server..." placeholderTextColor={colors.textMuted} value={cloudName} onChangeText={setCloudName} />
          <View style={[styles.inputRow, { marginTop: 8 }]}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="192.168.1.146:8080 atau https://..." placeholderTextColor={colors.textMuted} value={cloudUrl} onChangeText={setCloudUrl} autoCapitalize="none" />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddCloud}><Text style={styles.btnText}>Add</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={configs}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const title = cleanTitle(item);
          const isLocal = item.type === 'local';
          const displayPath = (item.config as any)?.displayPath || (item.config as any)?.url || (item.config as any)?.path || "";
          return (
            <View style={styles.card}>
              <View style={styles.cardIcon}><Ionicons name={isLocal ? 'phone-portrait' : item.type === 'radio' ? 'radio' : item.type === 'manga' ? 'book' : 'cloud'} size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.type} • {displayPath ? decodeURIComponent(String(displayPath)).slice(-40) : item.id.slice(0, 12)}</Text>
              </View>
              <Switch value={item.enabled} onValueChange={(v) => { updateSourceConfig(item.id, { enabled: v }); refresh(); }} trackColor={{ true: colors.primary }} thumbColor={colors.background} />
              <TouchableOpacity onPress={() => { Alert.alert("Hapus?", `Hapus ${title}?`, [{ text: "Batal" }, { text: "Hapus", style: "destructive", onPress: async () => { await removeSourceConfig(item.id); refresh(); } }]); }} style={{ marginLeft: 12, width: 36, height: 36, justifyContent: "center", alignItems: "center" }}><Ionicons name="trash" size={20} color={colors.textMuted} /></TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  actions: { flexDirection: "row", gap: 12 },
  btn: { flexDirection: "row", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center", flex: 1, justifyContent: "center" },
  btnText: { color: "#000", fontWeight: "700", fontSize: 13 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, color: colors.text, height: 44 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardTitle: { color: colors.text, fontWeight: "600", fontSize: 13 },
  cardSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
