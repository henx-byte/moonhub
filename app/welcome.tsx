// app/welcome.tsx - MOONHUB GLOBAL ONBOARDING - THEME RADIO DEFAULT (iOS Monochrome)
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  AppState,
  Linking,
  Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Application from 'expo-application';
import { colors, ios } from '../src/theme/colors';

const STEPS = [
  { key: 'intro', title: 'MoonHub', sub: 'GLOBAL' },
  { key: 'radio', title: 'Radio Dunia', sub: 'RADIO' },
  { key: 'player', title: 'Media Player', sub: 'PLAYER' },
  { key: 'perm', title: 'Izin Akses', sub: 'PERMISSION' },
];

export default function Welcome() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [perms, setPerms] = useState({
    battery: false,
    storage: false,
    notif: false,
  });
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const requestStorage = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') setPerms(p => ({ ...p, storage: true }));
  };

  const [modal, setModal] = useState<{ visible: boolean; title: string; desc: string; onConfirm?: () => void; confirmText?: string }>({
    visible: false,
    title: '',
    desc: '',
  });

  const requestBattery = async () => {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
        { data: `package:${Application.applicationId}` }
      );
      setModal({
        visible: true,
        title: 'Izin Baterai',
        desc: 'Pilih "Allow" / "Jangan optimalkan" biar radio tetap hidup di background.',
        confirmText: 'Sudah Allow',
        onConfirm: () => {
          setPerms(p => ({ ...p, battery: true }));
          setModal(m => ({ ...m, visible: false }));
        },
      });
    } catch {
      await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', { data: `package:${Application.applicationId}` });
    }
  };

  const requestNotif = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') setPerms(p => ({ ...p, notif: true }));
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    await AsyncStorage.setItem('moonhub_perms', JSON.stringify(perms));
    router.replace('/(tabs)/radio');
  };

  return (
    <View style={s.container}>
      {/* Progress - iOS style */}
      <View style={s.progressWrap}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.dot, i <= step && s.dotActive, i === step && s.dotCurrent]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Vinyl - Monochrome */}
        <Animated.View style={[s.vinyl, vinylStyle]}>
          <View style={s.groove} />
          <View style={s.groove2} />
          <View style={s.label}>
            <Text style={s.labelText}>{STEPS[step].sub}</Text>
          </View>
        </Animated.View>

        {step === 0 && (
          <>
            <Text style={s.title}>MoonHub Radio</Text>
            <Text style={s.desc}>
              Bukan cuma Indonesia — <Text style={{ color: colors.text, fontWeight: '800' }}>50.000+ Radio dari 200+ negara</Text>. Dari Radio Sby sampai BBC London, semua ada.
            </Text>
            <View style={s.cards}>
              <View style={s.card}>
                <Ionicons name="globe-outline" size={20} color={colors.text} />
                <Text style={s.cardText}>Global • Indonesia, US, UK, Japan...</Text>
              </View>
              <View style={s.card}>
                <Ionicons name="radio-outline" size={20} color={colors.text} />
                <Text style={s.cardText}>Live • No ads, low battery</Text>
              </View>
              <View style={s.card}>
                <Ionicons name="heart-outline" size={20} color={colors.text} />
                <Text style={s.cardText}>Favorit • Simpan & buat kategori</Text>
              </View>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.title}>Radio Dunia</Text>
            <Text style={s.desc}>Jelajahi ribuan stasiun. Filter by country, genre, bahasa.</Text>
            <View style={s.cards}>
              <View style={s.card}><Text style={s.emoji}>🇮🇩</Text><Text style={s.cardText}>Indonesia • 1000+ stasiun</Text></View>
              <View style={s.card}><Text style={s.emoji}>🇺🇸</Text><Text style={s.cardText}>US • 15.000+ stasiun</Text></View>
              <View style={s.card}><Text style={s.emoji}>🇬🇧</Text><Text style={s.cardText}>UK • BBC, Capital, dll</Text></View>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.title}>Player Cakep</Text>
            <Text style={s.desc}>Background play, notifikasi kontrol, artwork otomatis.</Text>
            <View style={s.cards}>
              <View style={s.card}><Ionicons name="play-circle-outline" size={20} color={colors.text} /><Text style={s.cardText}>Tap untuk play, background tetap jalan</Text></View>
              <View style={s.card}><Ionicons name="notifications-outline" size={20} color={colors.text} /><Text style={s.cardText}>Kontrol dari lockscreen & notif</Text></View>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.title}>Izin Akses</Text>
            <Text style={s.desc}>Aktifkan 3 izin ini biar MoonHub maksimal. Bisa skip, nanti bisa aktifkan di Settings.</Text>

            <Pressable onPress={requestBattery} style={[s.permCard, perms.battery && s.permDone]}>
              <View style={[s.permIcon, perms.battery && s.permIconDone]}>
                <Ionicons name="battery-charging-outline" size={20} color={perms.battery ? colors.background : colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.permTitle}>Background Play {perms.battery ? '✓' : ''}</Text>
                <Text style={s.permSub}>Biar radio gak mati pas layar off. Wajib Allow.</Text>
              </View>
              <Ionicons name={perms.battery ? "checkmark-circle" : "chevron-forward"} size={20} color={perms.battery ? colors.success : colors.textTertiary} />
            </Pressable>

            <Pressable onPress={requestStorage} style={[s.permCard, perms.storage && s.permDone]}>
              <View style={[s.permIcon, perms.storage && s.permIconDone]}>
                <Ionicons name="folder-open-outline" size={20} color={perms.storage ? colors.background : colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.permTitle}>Penyimpanan {perms.storage ? '✓' : ''}</Text>
                <Text style={s.permSub}>Cache artwork & data.</Text>
              </View>
              <Ionicons name={perms.storage ? "checkmark-circle" : "chevron-forward"} size={20} color={perms.storage ? colors.success : colors.textTertiary} />
            </Pressable>

            <Pressable onPress={requestNotif} style={[s.permCard, perms.notif && s.permDone]}>
              <View style={[s.permIcon, perms.notif && s.permIconDone]}>
                <Ionicons name="notifications-outline" size={20} color={perms.notif ? colors.background : colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.permTitle}>Notifikasi {perms.notif ? '✓' : ''}</Text>
                <Text style={s.permSub}>Kontrol play di notifikasi.</Text>
              </View>
              <Ionicons name={perms.notif ? "checkmark-circle" : "chevron-forward"} size={20} color={perms.notif ? colors.success : colors.textTertiary} />
            </Pressable>
          </>
        )}

        <View style={s.nav}>
          {step > 0 && (
            <Pressable style={s.btnGhost} onPress={() => setStep(s => s - 1)}>
              <Text style={s.btnGhostText}>Kembali</Text>
            </Pressable>
          )}
          <Pressable style={s.btn} onPress={() => (step < 3 ? setStep(s => s + 1) : handleDone())}>
            <Text style={s.btnText}>{step === 3 ? 'Masuk Radio' : 'Lanjut'}</Text>
            <Ionicons name={step === 3 ? 'checkmark' : 'arrow-forward'} size={18} color={colors.background} />
          </Pressable>
        </View>

        <Text style={s.version}>v1.0 • iOS Dark • {perms.battery ? 'Batt OK' : 'Batt belum'} | {perms.storage ? 'Stor OK' : 'Stor belum'} | {perms.notif ? 'Notif OK' : 'Notif belum'}</Text>
      </ScrollView>

      {/* CUSTOM MODAL - CAKep, gak pakai Alert */}
      <Modal visible={modal.visible} transparent animationType="slide" statusBarTranslucent presentationStyle="overFullScreen">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons name="battery-charging-outline" size={28} color={colors.text} />
            </View>
            <Text style={s.modalTitle}>{modal.title}</Text>
            <Text style={s.modalDesc}>{modal.desc}</Text>
            <View style={s.modalActions}>
              <Pressable style={s.modalGhost} onPress={() => setModal(m => ({ ...m, visible: false }))}>
                <Text style={s.modalGhostText}>Nanti</Text>
              </Pressable>
              <Pressable style={s.modalBtn} onPress={modal.onConfirm}>
                <Text style={s.modalBtnText}>{modal.confirmText || 'OK'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progressWrap: { flexDirection: 'row', gap: 8, paddingTop: 60, paddingHorizontal: 24, zIndex: 10 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card2 },
  dotActive: { backgroundColor: colors.textTertiary },
  dotCurrent: { backgroundColor: colors.text },
  content: { padding: 24, paddingTop: 32, alignItems: 'center', minHeight: '100%' },
  vinyl: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: '#0F0F0F',
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    ...ios.shadow.floating,
  },
  groove: { ...StyleSheet.absoluteFillObject, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', margin: 10 },
  groove2: { ...StyleSheet.absoluteFillObject, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', margin: 24 },
  label: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontWeight: '900', fontSize: 11, color: colors.background },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  desc: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24, fontWeight: '400' },
  cards: { width: '100%', gap: 12, marginBottom: 24 },
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    padding: 14, borderRadius: ios.cornerRadius.medium, alignItems: 'center',
  },
  cardText: { color: colors.text, fontSize: 14, fontWeight: '500', flex: 1 },
  emoji: { fontSize: 18 },
  permCard: {
    flexDirection: 'row', gap: 14, width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    padding: 16, borderRadius: ios.cornerRadius.medium, marginBottom: 12, alignItems: 'center',
  },
  permDone: { borderColor: colors.text, borderWidth: 1 },
  permIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  permIconDone: { backgroundColor: colors.text },
  permTitle: { color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  permSub: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  nav: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
  btn: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.text, padding: 16, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', gap: 8, ...ios.shadow.button,
  },
  btnText: { color: colors.background, fontWeight: '700', fontSize: 15 },
  btnGhost: {
    padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, minWidth: 90, alignItems: 'center',
    backgroundColor: colors.card,
  },
  btnGhostText: { color: colors.textSecondary, fontWeight: '600' },
  version: { marginTop: 20, color: colors.textTertiary, fontSize: 11 },
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

