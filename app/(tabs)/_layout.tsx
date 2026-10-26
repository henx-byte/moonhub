// app/(tabs)/_layout.tsx - RADIO DEFAULT, HIDE HOME/BOOKMARK/HISTORY, FAB KIRI + BLUR
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	Easing,
	FadeIn,
} from 'react-native-reanimated';

// CUMA RADIO & SETTINGS YANG MUNCUL DULU
const MENU = [
	{ name: 'radio', title: 'Radio', icon: 'radio' as const },
	{ name: 'settings', title: 'Settings', icon: 'settings' as const },
];

function FloatingFab() {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const rotate = useSharedValue(0);

	useEffect(() => {
		rotate.value = withRepeat(
			withTiming(360, { duration: 4000, easing: Easing.linear }),
			-1,
			false,
		);
	}, []);

	const vinylStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotate.value}deg` }],
	}));

	return (
		<>
			{open && (
				<View style={s.backdrop}>
					<BlurView
						intensity={99}
						tint='dark'
						style={StyleSheet.absoluteFill}
					/>
					<View style={s.backdropDim} />
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => setOpen(false)}
					/>
				</View>
			)}

			{open && (
				<View
					style={s.bubbleWrap}
					pointerEvents='box-none'>
					{MENU.map((m, i) => {
						const active = pathname.includes(m.name);
						return (
							<Animated.View
								key={m.name}
								entering={FadeIn.delay(i * 60).springify()}
								style={[s.bubble, { bottom: 110 + i * 66 }]}>
								<BlurView
									intensity={99}
									tint='dark'
									style={s.bubbleBlur}>
									<Pressable
										style={s.bubblePress}
										onPress={() => {
											router.replace(`/(tabs)/${m.name}` as any);
											setOpen(false);
										}}>
										<View style={[s.iconBox, active && s.iconBoxActive]}>
											<Ionicons
												name={m.icon}
												size={18}
												color={active ? '#000' : '#ffb000'}
											/>
										</View>
										<Text style={[s.bubbleText, active && s.bubbleTextActive]}>
											{m.title}
										</Text>
									</Pressable>
								</BlurView>
							</Animated.View>
						);
					})}
				</View>
			)}

			<View style={s.fabWrap}>
				<Pressable
					onPress={() => setOpen(!open)}
					style={s.fabMain}>
					<Animated.View style={[s.vinylDisc, vinylStyle]}>
						<View style={s.vinylLabel}>
							<Ionicons
								name={open ? 'close' : 'radio'}
								size={20}
								color='#ffb000'
							/>
						</View>
					</Animated.View>
				</Pressable>
			</View>
		</>
	);
}

export default function TabLayout() {
	return (
		<View style={{ flex: 1 }}>
			<Tabs
				screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
				{/* RADIO JADI MAIN */}
				<Tabs.Screen
					name='radio'
					options={{ title: 'Radio' }}
				/>
				<Tabs.Screen
					name='settings'
					options={{ title: 'Settings' }}
				/>

				{/* SEMBUNYIKAN DULU */}
				<Tabs.Screen
					name='index'
					options={{ href: null }}
				/>
			</Tabs>
			<FloatingFab />
		</View>
	);
}

const s = StyleSheet.create({
	backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
	backdropDim: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.45)',
	},
	fabWrap: {
		position: 'absolute',
		left: 22,
		bottom: 28,
		width: 72,
		height: 72,
		zIndex: 20,
	},
	fabMain: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#1A1510',
		borderWidth: 2.5,
		borderColor: '#ffb000',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#ffb000',
		shadowOpacity: 0.6,
		shadowRadius: 20,
		elevation: 16,
	},
	vinylDisc: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#0F0F0F',
		alignItems: 'center',
		justifyContent: 'center',
	},
	vinylLabel: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: '#EAE6D9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bubbleWrap: {
		position: 'absolute',
		left: 22,
		bottom: 0,
		zIndex: 15,
		width: 180,
		height: 300,
	},
	bubble: {
		position: 'absolute',
		left: 0,
		borderRadius: 24,
		overflow: 'hidden',
	},
	bubbleBlur: {
		paddingVertical: 11,
		paddingHorizontal: 16,
		backgroundColor: 'rgba(28,24,20,0.55)',
	},
	bubblePress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	iconBox: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: 'rgba(255,176,0,0.14)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconBoxActive: { backgroundColor: '#ffb000' },
	bubbleText: { color: '#ffb000', fontSize: 13.5, fontWeight: '700' },
	bubbleTextActive: { color: '#fff' },
});
