import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
	Alert,
	Image,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { colors } from '../../src/theme/colors';
import { useSources } from '../../src/hooks/useSources';
import { MediaItem } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StorageAccessFramework } from 'expo-file-system';
import {
	getSourceConfigs,
	saveSourceConfigs,
} from '../../src/stores/sourceStore';
import { useAudioPlayer } from '../../src/context/AudioContext';
import { useUnifiedPlayer } from '../../src/context/UnifiedPlayerContext';

export default function HomeScreen() {
	// FIX 2: hook langsung top-level, tanpa callback, tanpa try di sekeliling hook
	const unified = useUnifiedPlayer();
	const audio = useAudioPlayer();

	const {
		sources = [],
		loading: sourcesLoading,
		refresh: refreshSources,
	} = (useSources() as any) || { sources: [], loading: true };

	// derive player tanpa manggil hook lagi
	const player = unified?.mp3 || unified?.hls || unified?.web || unified || audio || { current: null, isPlaying: false, play: () => {}, pause: () => {} };

	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [sections, setSections] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const loadAllSources = useCallback(async () => {
		try {
			if (!sources || sources.length === 0) {
				setSections([]);
				setLoading(false);
				return;
			}
			setLoading(true);
			const allSections: any[] = [];
			for (const src of sources) {
				try {
					if (src.id === 'radio_default') continue;
					const libs = await src.getLibraries();
					const allItems: MediaItem[] = [];
					for (const lib of libs) {
						try {
							const items = await src.getItems(lib.id);
							allItems.push(...items);
						} catch {}
					}
					if (allItems.length > 0)
						allSections.push({
							sourceId: src.id,
							sourceName: 'Local',
							sourceType: 'local',
							items: allItems,
						});
				} catch {}
			}
			setSections(allSections);
			setLoading(false);
		} catch {
			setLoading(false);
		}
	}, [sources]);

	useEffect(() => {
		(async () => {
			try {
				const cfgs = await getSourceConfigs();
				const local = cfgs.find((c: any) => c.type === 'local');
				if (!local || !local.config?.folderUri) {
					Alert.alert(
						'Scan Musik HP?',
						'Biar Home langsung nampilin lagu di HP kamu, pilih folder Music / Download ya mon',
						[
							{ text: 'Nanti', style: 'cancel' },
							{
								text: 'Pilih Folder',
								onPress: async () => {
									try {
										const perm =
											await StorageAccessFramework.requestDirectoryPermissionsAsync();
										if (perm.granted) {
											const updated = cfgs.map((c: any) =>
												c.type === 'local'
													? {
															...c,
															config: {
																...c.config,
																folderUri: perm.directoryUri,
																path: perm.directoryUri,
															},
														}
													: c,
											);
											await saveSourceConfigs(updated);
											if (refreshSources) await refreshSources();
										}
									} catch (e) {
										console.log(e);
									}
								},
							},
						],
					);
				}
			} catch {}
		})();
	}, [refreshSources]);

	useEffect(() => {
		loadAllSources();
	}, [loadAllSources]);

	const onRefresh = async () => {
		setRefreshing(true);
		if (refreshSources) await refreshSources();
		await loadAllSources();
		setRefreshing(false);
	};

	function handlePlay(item: MediaItem, sectionItems: MediaItem[]) {
		if (item.mediaType === 'manga') {
			router.push({
				pathname: '/manga',
				params: {
					title: item.title,
					sourceId: item.sourceId,
					mangaId: item.id,
					cover: item.cover || item.thumbnail || '',
					path: item.path,
				},
			} as any);
			return;
		}
		try {
			player?.play?.(item, sectionItems);
		} catch {}
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<Stack.Screen options={{ headerShown: false }} />
			<View
				style={{
					paddingTop: insets.top + 12,
					paddingHorizontal: 16,
					paddingBottom: 12,
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}>
				<View>
					<Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
						Home
					</Text>
					<Text style={{ color: colors.textSecondary, fontSize: 12 }}>
						{sections.reduce((a, b) => a + b.items.length, 0)} songs
					</Text>
				</View>
				<TouchableOpacity
					onPress={onRefresh}
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: colors.card,
						justifyContent: 'center',
						alignItems: 'center',
					}}>
					<Ionicons name='refresh' size={18} color={colors.text} />
				</TouchableOpacity>
			</View>

			{loading || sourcesLoading ? (
				<ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
			) : (
				<FlatList
					data={sections}
					keyExtractor={s => s.sourceId}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={colors.primary}
						/>
					}
					contentContainerStyle={{ paddingBottom: 120 }}
					renderItem={({ item: section }) => (
						<View style={{ marginBottom: 20 }}>
							<View
								style={{
									flexDirection: 'row',
									justifyContent: 'space-between',
									alignItems: 'center',
									paddingHorizontal: 16,
									marginBottom: 10,
								}}>
								<Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
									{section.sourceName}
								</Text>
								<Text style={{ color: colors.textMuted, fontSize: 11 }}>
									{section.items.length} items
								</Text>
							</View>
							<FlatList
								data={section.items}
								horizontal
								showsHorizontalScrollIndicator={false}
								keyExtractor={i => i.id + i.uri}
								contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
								renderItem={({ item }) => {
									const isCurrent = player?.current?.id === item.id;
									return (
										<TouchableOpacity
											style={{
												width: 120,
												backgroundColor: colors.card,
												borderRadius: 12,
												padding: 10,
												borderWidth: isCurrent ? 1 : 0,
												borderColor: colors.primary,
											}}
											onPress={() => handlePlay(item, section.items)}>
											<View
												style={{
													width: 100,
													height: 100,
													backgroundColor: colors.background,
													borderRadius: 8,
													justifyContent: 'center',
													alignItems: 'center',
													overflow: 'hidden',
												}}>
												{item.thumbnail ? (
													<Image
														source={{ uri: item.thumbnail }}
														style={{ width: 100, height: 100, borderRadius: 8 }}
														resizeMode='cover'
													/>
												) : (
													<Ionicons
														name='musical-notes'
														size={28}
														color={colors.primary}
													/>
												)}
											</View>
											<Text
												style={{
													color: isCurrent ? colors.primary : colors.text,
													fontWeight: '600',
													fontSize: 12,
													marginTop: 8,
												}}
												numberOfLines={2}>
												{item.title}
											</Text>
										</TouchableOpacity>
									);
								}}
							/>
						</View>
					)}
				/>
			)}
		</View>
	);
}
