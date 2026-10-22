// app/welcome.tsx - MOONHUB GLOBAL ONBOARDING
import {
	View,
	Text,
	Pressable,
	StyleSheet,
	ScrollView,
	Alert,
	Platform,
	AppState,
	Linking,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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

	const requestBattery = async () => {
		const result = await IntentLauncher.startActivityAsync(
			'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
			{ data: `package:${Application.applicationId}` },
		);

		if (result.resultCode === -1 || result.resultCode === 0) {
			const result = await IntentLauncher.startActivityAsync(
				'android.settings.APPLICATION_DETAILS_SETTINGS',
				{ data: `package:${Application.applicationId}` },
			);
   if (result?.resultCode === 0) setPerms(p => ({ ...p, battery: true }));
		} else {
			setPerms(p => ({ ...p, battery: true }));
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
			<BlurView
				intensity={50}
				tint='dark'
				style={StyleSheet.absoluteFill}
			/>

			{/* Progress */}
			<View style={s.progressWrap}>
				{STEPS.map((_, i) => (
					<View
						key={i}
						style={[s.dot, i <= step && s.dotActive, i === step && s.dotCurrent]}
					/>
				))}
			</View>

			<ScrollView
				contentContainerStyle={s.content}
				showsVerticalScrollIndicator={false}>
				{/* Vinyl */}
				<Animated.View style={[s.vinyl, vinylStyle]}>
					<View style={s.groove} />
					<View style={s.label}>
						<Text style={s.labelText}>{STEPS[step].sub}</Text>
					</View>
				</Animated.View>

				{step === 0 && (
					<>
						<Text style={s.title}>MoonHub Radio</Text>
						<Text style={s.desc}>
							Bukan cuma Indonesia wkwk —{' '}
							<Text style={{ color: '#ffb000', fontWeight: '800' }}>
								50.000+ Radio dari 200+ negara
							</Text>
							. Dari Radio Kasih Sby sampai 【entity-BBC¦canonical_name=BBC】 London,
							semua ada.
						</Text>
						<View style={s.cards}>
							<View style={s.card}>
								<Ionicons
									name='globe'
									size={20}
									color='#ffb000'
								/>
								<Text style={s.cardText}>Global • Indonesia, US, UK, Japan...</Text>
							</View>
							<View style={s.card}>
								<Ionicons
									name='radio'
									size={20}
									color='#ffb000'
								/>
								<Text style={s.cardText}>88 FM - 108 FM + Streaming</Text>
							</View>
						</View>
					</>
				)}

				{step === 1 && (
					<>
						<Text style={s.title}>Fitur Utama Radio</Text>
						<Text style={s.desc}>
							Yang lu udah bikin di screenshot pertama — tuner retro, vote, suka, cari
							by negara.
						</Text>
						<View style={s.cards}>
							<View style={s.card}>
								<Text style={s.emoji}>📻</Text>
								<Text style={s.cardText}>Live Tuner + No Signal detection</Text>
							</View>
							<View style={s.card}>
								<Text style={s.emoji}>❤️</Text>
								<Text style={s.cardText}>Suka, Vote 480+ , Top list</Text>
							</View>
							<View style={s.card}>
								<Text style={s.emoji}>🇮🇩</Text>
								<Text style={s.cardText}>Filter Indonesia & Global</Text>
							</View>
						</View>
					</>
				)}

				{step === 2 && (
					<>
						<Text style={s.title}>Media Player Lokal</Text>
						<Text style={s.desc}>
							MoonHub gak cuma radio — bisa scan folder HP lu buat musik, komik, buku.
						</Text>
						<View style={s.cards}>
							<View style={s.card}>
								<Ionicons
									name='musical-notes'
									size={20}
									color='#ffb000'
								/>
								<Text style={s.cardText}>MP3 / HLS / HttpSource player</Text>
							</View>
							<View style={s.card}>
								<Ionicons
									name='folder'
									size={20}
									color='#ffb000'
								/>
								<Text style={s.cardText}>Pilih folder mana yang di-scan</Text>
							</View>
						</View>
					</>
				)}

				{step === 3 && (
					<>
						<Text style={s.title}>Butuh Izin Dulu</Text>
						<Text style={s.desc}>
							Biar bisa play di latar belakang kayak screenshot baterai lu.
						</Text>

						<Pressable
							style={[s.permCard, perms.battery && s.permDone]}
							onPress={requestBattery}>
							<View style={s.permIcon}>
								<Ionicons
									name='battery-charging'
									size={22}
									color={perms.battery ? '#000' : '#ffb000'}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={s.permTitle}>
									Baterai Tidak Dibatasi {perms.battery ? '✓' : ''}
								</Text>
								<Text style={s.permSub}>
									Izinkan latar belakang tanpa batasan. Wajib biar radio gak mati pas
									layar mati. (Kayak screenshot kedua lu)
								</Text>
							</View>
						</Pressable>

						<Pressable
							style={[s.permCard, perms.storage && s.permDone]}
							onPress={requestStorage}>
							<View style={s.permIcon}>
								<Ionicons
									name='folder-open'
									size={22}
									color={perms.storage ? '#000' : '#ffb000'}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={s.permTitle}>
									Storage / Media {perms.storage ? '✓' : ''}
								</Text>
								<Text style={s.permSub}>
									Pilih folder media yang mau di-scan (Musik, Video, dll)
								</Text>
							</View>
						</Pressable>

						<Pressable
							style={[s.permCard, perms.notif && s.permDone]}
							onPress={requestNotif}>
							<View style={s.permIcon}>
								<Ionicons
									name='notifications'
									size={22}
									color={perms.notif ? '#000' : '#ffb000'}
								/>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={s.permTitle}>Notifikasi {perms.notif ? '✓' : ''}</Text>
								<Text style={s.permSub}>
									Buat kontrol play di notification bar. Kepake kok, biar bisa next tanpa
									buka app.
								</Text>
							</View>
						</Pressable>
					</>
				)}

				<View style={s.nav}>
					{step > 0 && (
						<Pressable
							style={s.btnGhost}
							onPress={() => setStep(s => s - 1)}>
							<Text style={s.btnGhostText}>Kembali</Text>
						</Pressable>
					)}
					<Pressable
						style={s.btn}
						onPress={() => (step < 3 ? setStep(s => s + 1) : handleDone())}>
						<Text style={s.btnText}>
							{step === 3 ? 'Done - Masuk Radio' : 'Lanjut'}
						</Text>
						<Ionicons
							name={step === 3 ? 'checkmark' : 'arrow-forward'}
							size={18}
							color='#000'
						/>
					</Pressable>
				</View>

				<Text style={s.version}>
					v1.0 • Surabaya • 2026 • {perms.battery ? 'Batt OK' : 'Batt belum'} |{' '}
					{perms.storage ? 'Stor OK' : 'Stor belum'}
				</Text>
			</ScrollView>
		</View>
	);
}

const s = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0D0A07' },
	progressWrap: {
		flexDirection: 'row',
		gap: 8,
		paddingTop: 60,
		paddingHorizontal: 24,
		zIndex: 10,
	},
	dot: {
		flex: 1,
		height: 4,
		borderRadius: 2,
		backgroundColor: 'rgba(255,255,255,0.15)',
	},
	dotActive: { backgroundColor: 'rgba(255,176,0,0.5)' },
	dotCurrent: { backgroundColor: '#ffb000' },
	content: {
		padding: 24,
		paddingTop: 32,
		alignItems: 'center',
		minHeight: '100%',
	},
	vinyl: {
		width: 140,
		height: 140,
		borderRadius: 70,
		backgroundColor: '#0F0F0F',
		borderWidth: 2,
		borderColor: 'rgba(255,176,0,0.3)',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	groove: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 70,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.06)',
		margin: 10,
	},
	label: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#EAE6D9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	labelText: { fontWeight: '900', fontSize: 11, color: '#000' },
	title: {
		fontSize: 26,
		fontWeight: '900',
		color: '#fff',
		marginBottom: 8,
		textAlign: 'center',
	},
	desc: {
		fontSize: 14,
		color: 'rgba(255,255,255,0.6)',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	cards: { width: '100%', gap: 12, marginBottom: 24 },
	card: {
		flexDirection: 'row',
		gap: 12,
		backgroundColor: 'rgba(255,176,0,0.08)',
		borderColor: 'rgba(255,176,0,0.15)',
		borderWidth: 1,
		padding: 14,
		borderRadius: 14,
		alignItems: 'center',
	},
	cardText: { color: '#ffb000', fontSize: 13, fontWeight: '600', flex: 1 },
	emoji: { fontSize: 18 },
	permCard: {
		flexDirection: 'row',
		gap: 14,
		width: '100%',
		backgroundColor: 'rgba(30,26,21,0.8)',
		borderWidth: 1.5,
		borderColor: 'rgba(255,176,0,0.2)',
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
		alignItems: 'flex-start',
	},
	permDone: { backgroundColor: '#ffb000', borderColor: '#ffb000' },
	permIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(0,0,0,0.2)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	permTitle: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 4 },
	permSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 16 },
	nav: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
	btn: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: '#ffb000',
		padding: 16,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	btnText: { color: '#000', fontWeight: '800', fontSize: 15 },
	btnGhost: {
		padding: 16,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.15)',
		minWidth: 90,
		alignItems: 'center',
	},
	btnGhostText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
	version: { marginTop: 20, color: 'rgba(255,255,255,0.2)', fontSize: 11 },
});
