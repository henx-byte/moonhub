// app/(tabs)/setting/index.tsx - THEME SAMA KAYAK RADIO (iOS Monochrome)
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { colors, ios } from "../../../src/theme/colors";

export default function SettingIndex() {
  const router = useRouter();
  const [permStatus, setPermStatus] = useState({
    battery: false,
    storage: false,
    notif: false,
    all: true
  });

  const checkPerms = async () => {
    try {
      const { status: storageStatus } =
        await MediaLibrary.getPermissionsAsync();
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      const saved = await AsyncStorage.getItem("moonhub_perms");
      const savedPerms = saved ? JSON.parse(saved) : { battery: false };
      setPermStatus({
        storage: storageStatus === "granted",
        notif: notifStatus === "granted",
        battery: savedPerms.battery ?? false,
        all:
          storageStatus === "granted" &&
          notifStatus === "granted" &&
          savedPerms.battery
      });
    } catch {}
  };

  useEffect(() => {
    checkPerms();
  }, []);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER KAYAK RADIO */}
        <View style={s.header}>
          <Text style={s.title}>Settings</Text>
          <Text style={s.sub}>Kelola MoonHub</Text>
        </View>

        {/* PERMISSION CARD - PAKAI THEMA RADIO */}
        <Pressable
          onPress={() => router.push("/(tabs)/setting/permission")}
          style={[s.bigCard, !permStatus.all && s.bigCardWarn]}
        >
          <View
            style={[
              s.bigIcon,
              !permStatus.all && { backgroundColor: colors.warning }
            ]}
          >
            <Ionicons
              name={permStatus.all ? "shield-checkmark" : "warning"}
              size={22}
              color={colors.primaryText}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bigTitle}>
              Izin Akses {permStatus.all ? "" : "• Perlu Dicek"}
            </Text>
            <Text style={s.bigSub}>
              {permStatus.all
                ? "Semua izin aktif"
                : "Ada izin yang belum aktif, tap untuk cek"}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
              <Badge ok={permStatus.battery} label="Battery" />
              <Badge ok={permStatus.storage} label="Storage" />
              <Badge ok={permStatus.notif} label="Notif" />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={s.section}>UMUM</Text>
        <SettingRow
          icon="musical-notes-outline"
          title="Kualitas Audio"
          sub="High • 128kbps"
          onPress={() => {}}
        />
        <SettingRow
          icon="language-outline"
          title="Bahasa"
          sub="Indonesia"
          onPress={() => {}}
        />
        <SettingRow
          icon="moon-outline"
          title="Tampilan"
          sub="Dark • iOS"
          onPress={() => {}}
        />

        <Text style={[s.section, { marginTop: 20 }]}>TENTANG</Text>
        <SettingRow
          icon="information-circle-outline"
          title="Versi"
          sub="v1.0 • Surabaya"
          onPress={() => Alert.alert("MoonHub", "v1.0 • Surabaya • 2026")}
        />
        <SettingRow
          icon="paper-plane-outline"
          title="Feedback"
          sub="@moonhub_serverbot"
          onPress={async () => {
            const appUrl = `tg://resolve?domain=moonhub_serverbot&start=feedback`;
            const webUrl = `https://t.me/moonhub_serverbot?start=feedback`;
            try {
              const ok = await Linking.canOpenURL(appUrl);
              if (ok)
                await Linking.openURL(appUrl);
              else await Linking.openURL(webUrl); 
            } catch {
              await Linking.openURL(webUrl);
            }
          }}
        />

        <Text style={s.version}>Theme sama kayak Radio • Default iOS Dark</Text>
      </ScrollView>
    </View>
  );
}

function Badge({ ok, label }: any) {
  return (
    <View style={[s.badge, ok ? s.badgeOk : s.badgeNo]}>
      <Text
        style={[
          s.badgeText,
          { color: ok ? colors.text : colors.textSecondary }
        ]}
      >
        {label} {ok ? "✓" : "!"}
      </Text>
    </View>
  );
}

function SettingRow({ icon, title, sub, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 60, paddingBottom: 100 },
  header: { marginBottom: 20, paddingHorizontal: 4 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5
  },
  sub: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "500"
  },
  bigCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    borderRadius: ios.cornerRadius.large,
    alignItems: "center",
    marginBottom: 24,
    ...ios.shadow.card
  },
  bigCardWarn: { borderColor: colors.warning, borderWidth: 1.5 },
  bigIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center"
  },
  bigTitle: { fontWeight: "700", fontSize: 15, color: colors.text },
  bigSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.card2
  },
  badgeOk: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border
  },
  badgeNo: {
    backgroundColor: colors.warning + "20",
    borderWidth: 1,
    borderColor: colors.warning
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  section: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
    textTransform: "uppercase"
  },
  row: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: ios.cornerRadius.medium,
    marginBottom: 10,
    alignItems: "center"
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card2,
    alignItems: "center",
    justifyContent: "center"
  },
  rowTitle: { color: colors.text, fontWeight: "600", fontSize: 15 },
  rowSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  version: {
    marginTop: 24,
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: "center"
  }
});
