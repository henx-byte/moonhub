// app/(tabs)/setting/permission.tsx - THEME SAMA KAYAK RADIO
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Platform, Modal } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, ios } from '@/theme/colors';

type Perms = { battery: boolean; storage: boolean; notif: boolean };

export default function PermissionScreen() {
  const router = useRouter();
  const [perms, setPerms] = useState<Perms>({ battery: false, storage: false, notif: false });
  const [checking, setChecking] = useState(true);

  const checkPerms = async () => {
    setChecking(true);
    try {
      const { status: storageStatus } = await MediaLibrary.getPermissionsAsync();
      const { status: notifStatus } = await Notifications.getPermissionsAsync();
      const saved = await AsyncStorage.getItem('moonhub_perms');
      const savedPerms: Perms | null = saved ? JSON.parse(saved) : null;
      setPerms({
        storage: storageStatus === 'granted',
        notif: notifStatus === 'granted',
        battery: savedPerms?.battery ?? false,
      });
    } catch {}
    setChecking(false);
  };

  useEffect(() => { checkPerms(); }, []);
  useFocusEffect(useCallback(() => { checkPerms(); }, []));

  const [modal, setModal] = useState<{ visible: boolean; type: 'battery' | 'storage' | 'notif' | null; title: string; desc: string }>({
    visible: false,
    type: null,
    title: '',
    desc: '',
  });

  const requestStorage = async () => {
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const np = { ...perms, storage: true }; setPerms(np); AsyncStorage.setItem('moonhub_perms', JSON.stringify(np));
    } else if (!canAskAgain) {
      setModal({ visible: true, type: 'storage', title: 'Izin Penyimpanan Ditolak', desc: 'Kamu pilih "Don\'t ask again". Buka Settings sistem untuk aktifkan manual.' });
    }
  };
  const requestNotif = async () => {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      const np = { ...perms, notif: true }; setPerms(np); AsyncStorage.setItem('moonhub_perms', JSON.stringify(np));
    } else if (!canAskAgain) {
      setModal({ visible: true, type: 'notif', title: 'Notifikasi Ditolak', desc: 'Aktifkan notifikasi di Settings sistem biar kontrol radio muncul di lockscreen.' });
    }
  };
  const requestBattery = async () => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', { data: `package:${Application.applicationId}` });
        setModal({ visible: true, type: 'battery', title: 'Izin Baterai', desc: 'Pilih "Allow" / "Jangan optimalkan" biar radio tetap hidup pas layar mati.' });
      }
    } catch { Linking.openSettings(); }
  };

  const allGranted = perms.battery && perms.storage && perms.notif;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View>
            <Text style={s.title}>Izin Akses</Text>
            <Text style={s.sub}>Mastiin semua izin aktif</Text>
          </View>
        </View>

        {!allGranted && !checking && (
          <View style={s.banner}>
            <Ionicons name="warning" size={18} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Ada izin yang belum aktif</Text>
              <Text style={s.bannerSub}>
                {!perms.storage ? '• Penyimpanan\n' : ''}{!perms.notif ? '• Notifikasi\n' : ''}{!perms.battery ? '• Background' : ''}
              </Text>
            </View>
          </View>
        )}

        <Text style={s.section}>IZIN</Text>
        <PermRow icon="battery-charging-outline" title="Background Play" sub="Biar radio gak mati pas layar off. Wajib Allow." done={perms.battery} onPress={requestBattery} />
        <PermRow icon="folder-open-outline" title="Penyimpanan" sub="Cache artwork & data." done={perms.storage} onPress={requestStorage} />
        <PermRow icon="notifications-outline" title="Notifikasi" sub="Kontrol di notifikasi & lockscreen." done={perms.notif} onPress={requestNotif} />

        <Pressable style={s.secondaryBtn} onPress={() => Linking.openSettings()}>
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          <Text style={s.secondaryText}>Buka App Settings</Text>
        </Pressable>
        <Pressable style={s.secondaryBtn} onPress={checkPerms}>
          <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
          <Text style={s.secondaryText}>Cek Ulang</Text>
        </Pressable>

        <View style={s.statusCard}>
          <Text style={s.statusTitle}>STATUS</Text>
          <Text style={s.statusSub}>Batt: {perms.battery ? '✅' : '❌'} | Stor: {perms.storage ? '✅' : '❌'} | Notif: {perms.notif ? '✅' : '❌'}</Text>
        </View>
      </ScrollView>

      {/* CUSTOM MODAL - CAKep */}
      <Modal visible={modal.visible} transparent animationType="slide" statusBarTranslucent presentationStyle="overFullScreen">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons
                name={modal.type === 'battery' ? 'battery-charging-outline' : modal.type === 'storage' ? 'folder-open-outline' : 'notifications-outline'}
                size={28}
                color={colors.text}
              />
            </View>
            <Text style={s.modalTitle}>{modal.title}</Text>
            <Text style={s.modalDesc}>{modal.desc}</Text>
            <View style={s.modalActions}>
              <Pressable style={s.modalGhost} onPress={() => setModal(m => ({ ...m, visible: false }))}>
                <Text style={s.modalGhostText}>Nanti</Text>
              </Pressable>
              {modal.type === 'battery' ? (
                <Pressable
                  style={s.modalBtn}
                  onPress={() => {
                    const np = { ...perms, battery: true };
                    setPerms(np);
                    AsyncStorage.setItem('moonhub_perms', JSON.stringify(np));
                    setModal(m => ({ ...m, visible: false }));
                  }}
                >
                  <Text style={s.modalBtnText}>Sudah Allow</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={s.modalBtn}
                  onPress={() => {
                    setModal(m => ({ ...m, visible: false }));
                    Linking.openSettings();
                  }}
                >
                  <Text style={s.modalBtnText}>Buka Settings</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PermRow({ icon, title, sub, done, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={[s.permCard, done && s.permDone]}>
      <View style={[s.permIcon, done && { backgroundColor: colors.text }]}>
        <Ionicons name={icon as any} size={20} color={done ? colors.background : colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.permTitle}>{title}</Text>
          {done && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
        </View>
        <Text style={s.permSub}>{sub}</Text>
        <View style={[s.badge, done ? s.badgeDone : s.badgePending]}>
          <Text style={[s.badgeText, done ? { color: colors.background } : { color: colors.text }]}>{done ? 'Aktif' : 'Tap untuk aktifkan'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  banner: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.warning, padding: 14, borderRadius: ios.cornerRadius.medium, marginBottom: 20, alignItems: 'flex-start' },
  bannerTitle: { fontWeight: '700', color: colors.text, fontSize: 13, marginBottom: 4 },
  bannerSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  section: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
  permCard: {
    flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    padding: 16, borderRadius: ios.cornerRadius.medium, marginBottom: 12, alignItems: 'center',
  },
  permDone: { borderColor: colors.border },
  permIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  permTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  permSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 16, marginTop: 4 },
  badge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeDone: { backgroundColor: colors.text },
  badgePending: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    padding: 14, borderRadius: ios.cornerRadius.medium, alignItems: 'center', marginTop: 12,
  },
  secondaryText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  statusCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: ios.cornerRadius.medium, marginTop: 20 },
  statusTitle: { color: colors.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  statusSub: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', alignItems: 'center', padding: 16, paddingBottom: 34 },
  modalCard: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: ios.cornerRadius.large, borderBottomRightRadius: ios.cornerRadius.large, padding: 22, paddingBottom: 28, alignItems: 'center', ...ios.shadow.floating },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalGhost: { flex: 1, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 14, alignItems: 'center' },
  modalGhostText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  modalBtn: { flex: 1, backgroundColor: colors.text, padding: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { color: colors.background, fontWeight: '700', fontSize: 14 },
});

