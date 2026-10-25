import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	Image,
	Modal,
	ScrollView,
} from 'react-native';
import { useEffect, useState, useCallback, memo, useRef } from 'react';
import {
	getTopStations,
	searchStations,
	resolveStream,
	getRadioMirror,
	RadioStation,
	getStationsByCountry,
} from '../../src/features/radio/radioBrowser';
import { MediaItem } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCorePlayer } from '../../src/context/PlayerCoreContext';

const extractFreq = (name: string): number => {
	const m = name.match(/(\d+\.?\d*)\s*FM/i);
	return m ? parseFloat(m[1]) : 88;
};

const COUNTRIES = [
	{ code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
	{ code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
	{ code: 'SG', name: 'Singapore', flag: '🇸🇬' },
	{ code: 'US', name: 'USA', flag: '🇺🇸' },
	{ code: 'GB', name: 'UK', flag: '🇬🇧' },
	{ code: 'JP', name: 'Japan', flag: '🇯🇵' },
	{ code: 'KR', name: 'Korea', flag: '🇰🇷' },
	{ code: 'DE', name: 'Germany', flag: '🇩🇪' },
	{ code: 'AU', name: 'Australia', flag: '🇦🇺' },
	{ code: 'IN', name: 'India', flag: '🇮🇳' },
	{ code: 'PH', name: 'Philippines', flag: '🇵🇭' },
	{ code: 'TH', name: 'Thailand', flag: '🇹🇭' },
	{ code: 'TOP', name: 'Top Global', flag: '🌍' },
];

const DEFAULT_TEMPLATE: RadioStation = {
	stationuuid: 'template-surabaya',
	name: 'No Signal 88',
	url: '',
	url_resolved: '',
	homepage: '',
	favicon:
		'https://raw.githubusercontent.com/henx-byte/moonhub/ad3b2479765306486e5f013144c9c0e8c3a6ce0d/assets/icon.png',
	tags: '',
	country: 'Indonesia',
	countrycode: 'ID',
	state: 'East Java',
	language: 'indonesian',
	votes: 0,
	codec: 'MP3',
	bitrate: 128,
	hls: 0,
	lastcheckok: 1,
	lastchecktime: '',
	clicktimestamp: '',
	clickcount: 0,
	clicktrend: 0,
	ssl_error: 0,
	geo_lat: null,
	geo_long: null,
} as any;

const VintageAnalogPreview = memo(
	({
		station,
		isPlaying,
		isBuffering,
		isTemplate,
	}: {
		station: RadioStation | null;
		isPlaying: boolean;
		isBuffering?: boolean;
		isTemplate?: boolean;
	}) => {
		const [freq, setFreq] = useState(88);
		const [pct, setPct] = useState(75);
		useEffect(() => {
			if (station) {
				const f = extractFreq(station.name);
				setFreq(f);
				setPct(((f - 88) / 20) * 100);
			}
		}, [station?.stationuuid]);
		const displayStation = station || DEFAULT_TEMPLATE;
		const displayFreq = station ? freq : 88;
		const displayPct = station ? pct : 75;
		return (
			<View
				style={{
					marginHorizontal: 14,
					marginTop: 6,
					borderRadius: 20,
					backgroundColor: '#2c1a0f',
					borderWidth: 3,
					borderColor: '#3e2723',
					overflow: 'hidden',
				}}>
				<View style={{ height: 10, backgroundColor: '#4e342e' }} />
				<View style={{ backgroundColor: '#1a1207', padding: 10 }}>
					<View
						style={{
							height: 124,
							backgroundColor: '#f5e6d3',
							borderRadius: 16,
							borderWidth: 2,
							borderColor: '#8d6e63',
							overflow: 'hidden',
							justifyContent: 'center',
							alignItems: 'center',
						}}>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingHorizontal: 12,
								paddingTop: 8,
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
							}}>
							{[88, 92, 96, 100, 104, 108].map(n => (
								<Text
									key={n}
									style={{ fontSize: 9, color: '#3e2723', fontWeight: '800' }}>
									{n}
								</Text>
							))}
						</View>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								paddingHorizontal: 10,
								marginTop: 6,
								position: 'absolute',
								top: 20,
								left: 0,
								right: 0,
							}}>
							{Array.from({ length: 33 }).map((_, i) => (
								<View
									key={i}
									style={{
										width: i % 4 === 0 ? 2.5 : 1.2,
										height: i % 4 === 0 ? 16 : 7,
										backgroundColor: i % 4 === 0 ? '#1a1a1a' : '#8d6e63',
									}}
								/>
							))}
						</View>
						<View
							style={{
								position: 'absolute',
								top: 0,
								bottom: 0,
								width: 2,
								backgroundColor: '#d32f2f',
								left: `${displayPct}%`,
							}}>
							<View
								style={{
									position: 'absolute',
									top: -2,
									left: -7,
									width: 16,
									height: 16,
									borderRadius: 8,
									backgroundColor: '#d32f2f',
									borderWidth: 2,
									borderColor: '#fff',
									justifyContent: 'center',
									alignItems: 'center',
								}}>
								<View
									style={{
										width: 4,
										height: 4,
										borderRadius: 2,
										backgroundColor: '#fff',
									}}
								/>
							</View>
						</View>

						{isBuffering ? (
							<View style={{ alignItems: 'center', marginTop: 10 }}>
								<ActivityIndicator
									size='large'
									color='#3e2723'
								/>
								<Text
									style={{
										color: '#3e2723',
										fontWeight: '900',
										fontSize: 12,
										marginTop: 6,
									}}>
									BUFFERING...
								</Text>
							</View>
						) : (
							<View
								style={{
									backgroundColor: '#1e1e1e',
									paddingHorizontal: 12,
									paddingVertical: 6,
									borderRadius: 8,
									borderWidth: 1,
									borderColor: '#333',
									marginTop: 10,
								}}>
								<Text style={{ color: '#ffb000', fontWeight: '900', fontSize: 18 }}>
									{displayFreq.toFixed(1)} FM
								</Text>
							</View>
						)}

						<View
							style={{
								position: 'absolute',
								bottom: 10,
								left: 10,
								backgroundColor: isBuffering
									? '#ffb000'
									: isTemplate
										? '#2a2a2a'
										: '#1a1a1a',
								paddingHorizontal: 8,
								paddingVertical: 4,
								borderRadius: 6,
								flexDirection: 'row',
								alignItems: 'center',
								gap: 5,
								borderWidth: 1,
								borderColor: isBuffering ? '#ffb000' : isTemplate ? '#3a3a3a' : '#333',
							}}>
							<View
								style={{
									width: 7,
									height: 7,
									borderRadius: 3.5,
									backgroundColor: isBuffering
										? '#fff'
										: isTemplate
											? '#555'
											: '#ef4444',
								}}
							/>
							<Text
								style={{
									color: isBuffering ? '#1a120a' : isTemplate ? '#888' : '#ef4444',
									fontSize: 9,
									fontWeight: '900',
								}}>
								{isBuffering ? 'BUFFERING' : isTemplate ? 'STANDBY' : 'ON AIR'}
							</Text>
						</View>

						<View
							style={{
								position: 'absolute',
								bottom: 10,
								right: 10,
								width: 38,
								height: 38,
								borderRadius: 19,
								backgroundColor: '#f5e6d3',
								justifyContent: 'center',
								alignItems: 'center',
								borderWidth: 2,
								borderColor: '#8d6e63',
							}}>
							{displayStation.favicon ? (
								<Image
									source={{ uri: displayStation.favicon }}
									style={{ width: 34, height: 34, borderRadius: 17 }}
								/>
							) : (
								<Text style={{ fontSize: 10, fontWeight: '900', color: '#3e2723' }}>
									Gen
								</Text>
							)}
						</View>
					</View>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							marginTop: 12,
							paddingHorizontal: 2,
						}}>
						<View style={{ flex: 1 }}>
							<Text
								style={{
									color: isTemplate ? '#a89a8a' : '#ffecb3',
									fontSize: 15,
									fontWeight: '800',
								}}
								numberOfLines={1}>
								{displayStation.name}
							</Text>
							<Text style={{ color: '#8d7e6e', fontSize: 12, marginTop: 2 }}>
								{isBuffering
									? 'Menyambungkan...'
									: `${displayStation.votes} votes • ${displayFreq.toFixed(1)} MHz`}
							</Text>
						</View>
					</View>
				</View>
				<View style={{ height: 8, backgroundColor: '#3e2723' }} />
			</View>
		);
	},
);

const RadioCard = memo(
	({
		item,
		onPlay,
		isActive,
		onVote,
		onLike,
		isFav,
		votingId,
		hasVoted,
		isBuffering,
	}: {
		item: RadioStation;
		onPlay: (s: RadioStation) => void;
		isActive: boolean;
		onVote: (s: RadioStation) => void;
		onLike: (s: RadioStation) => void;
		isFav: boolean;
		votingId: string | null;
		hasVoted: (uuid: string) => boolean;
		isBuffering?: boolean;
	}) => {
		return (
			<TouchableOpacity
				onPress={() => onPlay(item)}
				activeOpacity={0.85}
				style={{
					backgroundColor: isActive ? '#2a1f0f' : '#141414',
					padding: 12,
					borderRadius: 16,
					marginBottom: 10,
					flexDirection: 'row',
					alignItems: 'center',
					borderWidth: 1.5,
					borderColor: isActive ? '#ffb000' : '#262626',
				}}>
				<View
					style={{
						width: 48,
						height: 48,
						borderRadius: 12,
						backgroundColor: '#1e1e1e',
						justifyContent: 'center',
						alignItems: 'center',
						marginRight: 12,
					}}>
					{item.favicon ? (
						<Image
							source={{ uri: item.favicon }}
							style={{ width: 44, height: 44, borderRadius: 10 }}
						/>
					) : (
						<Ionicons
							name='radio'
							size={20}
							color='#6d5a4e'
						/>
					)}
				</View>
				<View style={{ flex: 1 }}>
					<Text
						style={{
							color: isActive ? '#ffecb3' : '#e8e8e8',
							fontWeight: '700',
							fontSize: 13.5,
						}}
						numberOfLines={1}>
						{item.name}
					</Text>
					<Text style={{ color: '#8a8a8a', fontSize: 11.5, marginTop: 2 }}>
						{isBuffering
							? 'Buffering...'
							: `${item.votes} votes • ${extractFreq(item.name).toFixed(1)} FM`}
					</Text>
				</View>
				<View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
					<TouchableOpacity
						onPress={() => onLike(item)}
						style={{
							width: 34,
							height: 34,
							borderRadius: 10,
							backgroundColor: isFav ? '#3e1515' : '#1e1e1e',
							justifyContent: 'center',
							alignItems: 'center',
						}}>
						<Ionicons
							name={isFav ? 'heart' : 'heart-outline'}
							size={16}
							color={isFav ? '#ef4444' : '#6d5a4e'}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => onVote(item)}
						disabled={votingId === item.stationuuid || hasVoted(item.stationuuid)}
						style={{
							paddingHorizontal: 8,
							height: 34,
							borderRadius: 10,
							backgroundColor: hasVoted(item.stationuuid) ? '#2a1f0f' : '#1e1e1e',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 3,
							borderWidth: 1,
							borderColor: hasVoted(item.stationuuid) ? '#5a3d0f' : '#262626',
							opacity: hasVoted(item.stationuuid)
								? 0.5
								: votingId === item.stationuuid
									? 0.6
									: 1,
						}}>
						<Ionicons
							name={hasVoted(item.stationuuid) ? 'checkmark' : 'arrow-up'}
							size={13}
							color={hasVoted(item.stationuuid) ? '#666' : '#ffb000'}
						/>
						<Text
							style={{
								color: hasVoted(item.stationuuid) ? '#666' : '#bdbdbd',
								fontSize: 11,
								fontWeight: '700',
							}}>
							{votingId === item.stationuuid ? '...' : item.votes}
						</Text>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		);
	},
);

export default function RadioScreen() {
	const [stations, setStations] = useState<RadioStation[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<'indo' | 'top' | 'fav'>('indo');
	const [countryCode, setCountryCode] = useState('ID');
	const [showCountryModal, setShowCountryModal] = useState(false);
	const [query, setQuery] = useState('');
	const [currentRadio, setCurrentRadio] = useState<RadioStation | null>(null);
	const [favorites, setFavorites] = useState<RadioStation[]>([]);
	const [votedMap, setVotedMap] = useState<Record<string, number>>({});
	const [votingId, setVotingId] = useState<string | null>(null);
	const [bufferingId, setBufferingId] = useState<string | null>(null);

	const player: any = useCorePlayer();

	useEffect(() => {
		(async () => {
			const raw = await AsyncStorage.getItem('radio_fav_objects');
			if (raw) setFavorites(JSON.parse(raw));
			const votedRaw = await AsyncStorage.getItem('radio_voted_map');
			if (votedRaw) setVotedMap(JSON.parse(votedRaw));
		})();
	}, []);

	const load = useCallback(async () => {
		if (tab === 'fav') {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			if (tab === 'top') setStations(await getTopStations(50));
			else if (tab === 'indo' || countryCode) {
				if (countryCode === 'TOP') setStations(await getTopStations(50));
				else setStations(await getStationsByCountry(countryCode, 50));
			}
		} catch {}
		setLoading(false);
	}, [tab, countryCode]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (player?.isPlaying && !player?.isBuffering) {
			setBufferingId(null);
		}
	}, [player?.isPlaying, player?.isBuffering]);

	const isFav = currentRadio
		? favorites.some(f => f.stationuuid === currentRadio.stationuuid)
		: false;
	const isTemplateMode = !currentRadio;
	const hasVoted = (uuid: string) => {
		const t = votedMap[uuid];
		return t && Date.now() - t < 24 * 60 * 60 * 1000;
	};

	const handleLikeItem = async (s: RadioStation) => {
		if (s.stationuuid === 'template-surabaya') return;
		const fav = favorites.some(f => f.stationuuid === s.stationuuid);
		const updated = fav
			? favorites.filter(f => f.stationuuid !== s.stationuuid)
			: [...favorites, s];
		setFavorites(updated);
		await AsyncStorage.setItem('radio_fav_objects', JSON.stringify(updated));
	};

	const handleVoteItem = async (s: RadioStation) => {
		if (s.stationuuid === 'template-surabaya' || votingId) return;
		if (hasVoted(s.stationuuid)) return;
		setVotingId(s.stationuuid);
		try {
			const mirror = await getRadioMirror();
			const res = await fetch(`${mirror}/json/stations/${s.stationuuid}/vote`, {
				method: 'POST',
				headers: { 'User-Agent': 'MoonHub/1.0' },
			});
			if (res.ok) {
				const fresh = await fetch(
					`${mirror}/json/stations/byuuid/${s.stationuuid}`,
				).then(r => r.json());
				if (fresh[0]) {
					const realVotes = fresh[0].votes;
					const update = (x: RadioStation) =>
						x.stationuuid === s.stationuuid ? { ...x, votes: realVotes } : x;
					setStations(p => p.map(update));
					setFavorites(p => p.map(update));
					if (currentRadio?.stationuuid === s.stationuuid)
						setCurrentRadio(p => (p ? { ...p, votes: realVotes } : null));
					const newMap = { ...votedMap, [s.stationuuid]: Date.now() };
					setVotedMap(newMap);
					await AsyncStorage.setItem('radio_voted_map', JSON.stringify(newMap));
				}
			}
		} catch {}
		setVotingId(null);
	};

	const handlePlay = useCallback(
		async (s: RadioStation) => {
			setCurrentRadio(s);
			setBufferingId(s.stationuuid);
			try {
				const freshUrl = await resolveStream(s.stationuuid);
				const item: MediaItem = {
					id: s.stationuuid,
					sourceId: 'radio_permanent',
					name: s.name,
					title: s.name,
					path: freshUrl,
					uri: freshUrl,
					mediaType: 'radio',
					type: 'radio',
					size: 0,
					duration: 0,
					thumbnail: s.favicon,
					extra: { isLive: true },
				};
				await player?.play?.(item);
			} catch {
				setBufferingId(null);
			}
		},
		[player],
	);

	const handleSearch = async () => {
		if (!query.trim()) {
			load();
			return;
		}
		setLoading(true);
		setStations(await searchStations(countryCode, query.trim()));
		setLoading(false);
	};

	const displayData = tab === 'fav' ? favorites : stations;
	const selectedCountry =
		COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
	const isPlayerBuffering = !!player?.isBuffering;

	return (
		<View style={{ flex: 1, backgroundColor: '#080808' }}>
			<View style={{ paddingTop: 44 }}>
				<VintageAnalogPreview
					station={currentRadio}
					isPlaying={!!player?.isPlaying}
					isBuffering={isPlayerBuffering || !!bufferingId}
					isTemplate={isTemplateMode}
				/>
				<View
					style={{
						flexDirection: 'row',
						gap: 8,
						marginTop: 10,
						paddingHorizontal: 14,
					}}>
					<TouchableOpacity
						onPress={() => currentRadio && handleLikeItem(currentRadio)}
						disabled={isTemplateMode}
						style={{
							flex: 1,
							backgroundColor: isTemplateMode
								? '#1a1a1a'
								: isFav
									? '#3e1515'
									: '#1e1e1e',
							borderWidth: 1,
							borderColor: isFav ? '#ef4444' : '#2a2a2a',
							padding: 12,
							borderRadius: 14,
							flexDirection: 'row',
							justifyContent: 'center',
							alignItems: 'center',
							gap: 6,
							opacity: isTemplateMode ? 0.5 : 1,
						}}>
						<Ionicons
							name={isFav ? 'heart' : 'heart-outline'}
							size={16}
							color={isFav ? '#ef4444' : '#e0e0e0'}
						/>
						<Text
							style={{
								color: isFav ? '#ef9a9a' : '#e0e0e0',
								fontWeight: '700',
								fontSize: 13,
							}}>
							Suka
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() =>
							isTemplateMode
								? handlePlay(stations[0] || DEFAULT_TEMPLATE)
								: player?.isPlaying
									? player?.pause?.()
									: player?.resume?.()
						}
						style={{
							width: 56,
							height: 46,
							borderRadius: 16,
							backgroundColor: '#ffb000',
							justifyContent: 'center',
							alignItems: 'center',
						}}>
						{isPlayerBuffering || bufferingId ? (
							<ActivityIndicator
								size='small'
								color='#1a120a'
							/>
						) : (
							<Ionicons
								name={isTemplateMode ? 'play' : player?.isPlaying ? 'pause' : 'play'}
								size={20}
								color='#1a120a'
								style={{ marginLeft: isTemplateMode || !player?.isPlaying ? 2 : 0 }}
							/>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => currentRadio && handleVoteItem(currentRadio)}
						disabled={
							isTemplateMode || !!votingId || hasVoted(currentRadio?.stationuuid)
						}
						style={{
							flex: 1,
							backgroundColor: hasVoted(currentRadio?.stationuuid)
								? '#1a1a1a'
								: '#1e1608',
							borderWidth: 1.5,
							borderColor: hasVoted(currentRadio?.stationuuid) ? '#333' : '#ffb000',
							padding: 12,
							borderRadius: 14,
							flexDirection: 'row',
							justifyContent: 'center',
							alignItems: 'center',
							gap: 6,
							opacity: hasVoted(currentRadio?.stationuuid) ? 0.4 : 1,
						}}>
						<Ionicons
							name={
								hasVoted(currentRadio?.stationuuid) ? 'checkmark-circle' : 'thumbs-up'
							}
							size={16}
							color={hasVoted(currentRadio?.stationuuid) ? '#666' : '#ffb000'}
						/>
						<Text
							style={{
								color: hasVoted(currentRadio?.stationuuid) ? '#666' : '#ffb000',
								fontWeight: '700',
								fontSize: 13,
							}}>
							{hasVoted(currentRadio?.stationuuid)
								? 'Voted'
								: votingId
									? '...'
									: 'Vote'}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View
				style={{
					flexDirection: 'row',
					paddingHorizontal: 14,
					marginTop: 14,
					marginBottom: 10,
					gap: 8,
					alignItems: 'center',
				}}>
				<TouchableOpacity
					onPress={() => {
						setTab('top');
						setCountryCode('TOP');
					}}
					style={{
						flex: 1,
						alignItems: 'center',
						justifyContent: 'center',
						paddingVertical: 10,
						paddingHorizontal: 14,
						backgroundColor: tab === 'top' ? '#2c1a0f' : '#1a1a1a',
						borderRadius: 12,
						borderWidth: 1.5,
						borderColor: tab === 'top' ? '#ffb000' : '#262626',
					}}>
					<Text
						style={{
							color: tab === 'top' ? '#ffb000' : '#8a8a8a',
							fontWeight: '800',
							fontSize: 12,
						}}>
						Top
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => setShowCountryModal(true)}
					style={{
						flexDirection: 'row',
						flex: 2,
						alignItems: 'center',
						justifyContent: 'center',
						gap: 6,
						paddingVertical: 10,
						paddingHorizontal: 14,
						backgroundColor:
							tab !== 'fav' && countryCode !== 'TOP' ? '#2c1a0f' : '#1a1a1a',
						borderRadius: 12,
						borderWidth: 1.5,
						borderColor:
							tab !== 'fav' && countryCode !== 'TOP' ? '#ffb000' : '#262626',
					}}>
					<Text style={{ fontSize: 12 }}>{selectedCountry.flag}</Text>
					<Text
						style={{
							flex: 1,
							alignItems: 'center',
							justifyContent: 'center',
							color: tab !== 'fav' && countryCode !== 'TOP' ? '#ffb000' : '#8a8a8a',
							fontWeight: '800',
							fontSize: 12,
						}}>
						{selectedCountry.name}
					</Text>
					<Ionicons
						name='chevron-down'
						size={12}
						color={tab !== 'fav' && countryCode !== 'TOP' ? '#ffb000' : '#8a8a8a'}
					/>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => setTab('fav')}
					style={{
						paddingVertical: 10,
						paddingHorizontal: 14,
						backgroundColor: tab === 'fav' ? '#2c1a0f' : '#1a1a1a',
						borderRadius: 12,
						borderWidth: 1.5,
						borderColor: tab === 'fav' ? '#ffb000' : '#262626',
					}}>
					<Text
						style={{
							color: tab === 'fav' ? '#ffb000' : '#8a8a8a',
							fontWeight: '800',
							fontSize: 12,
						}}>
						Suka{favorites.length ? `(${favorites.length})` : ''}
					</Text>
				</TouchableOpacity>
			</View>

			<View
				style={{
					marginHorizontal: 14,
					marginBottom: 10,
					backgroundColor: '#1a1510',
					borderRadius: 12,
					borderWidth: 1,
					borderColor: '#2a231c',
					flexDirection: 'row',
					alignItems: 'center',
					paddingHorizontal: 12,
				}}>
				<Ionicons
					name='search'
					size={16}
					color='#6d5a4e'
				/>
				<TextInput
					value={query}
					onChangeText={setQuery}
					onSubmitEditing={handleSearch}
					returnKeyType='search'
					placeholder={`Cari di ${selectedCountry.name}...`}
					placeholderTextColor='#6d5a4e'
					style={{ flex: 1, color: '#efebe9', padding: 12, fontSize: 13 }}
				/>
				<TouchableOpacity onPress={handleSearch}>
					<Ionicons
						name='search'
						size={18}
						color='#ffb000'
					/>
				</TouchableOpacity>
			</View>

			{tab === 'fav' && favorites.length === 0 ? (
				<View
					style={{
						flex: 1,
						justifyContent: 'center',
						alignItems: 'center',
						padding: 40,
					}}>
					<Ionicons
						name='heart-outline'
						size={40}
						color='#3e2723'
					/>
					<Text style={{ color: '#8d6e63', marginTop: 10, fontSize: 12 }}>
						Belum ada favorit
					</Text>
				</View>
			) : loading ? (
				<ActivityIndicator
					color='#ffb000'
					style={{ marginTop: 20 }}
				/>
			) : (
				<FlatList
					data={displayData}
					keyExtractor={s => s.stationuuid}
					contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
					renderItem={({ item }) => (
						<RadioCard
							item={item}
							onPlay={handlePlay}
							isActive={currentRadio?.stationuuid === item.stationuuid}
							onVote={handleVoteItem}
							onLike={handleLikeItem}
							isFav={favorites.some((f: any) => f.stationuuid === item.stationuuid)}
							votingId={votingId}
							hasVoted={hasVoted}
							isBuffering={
								bufferingId === item.stationuuid ||
								(isPlayerBuffering && currentRadio?.stationuuid === item.stationuuid)
							}
						/>
					)}
				/>
			)}

			<Modal
				visible={showCountryModal}
				transparent
				animationType='fade'
				onRequestClose={() => setShowCountryModal(false)}>
				<TouchableOpacity
					style={{
						flex: 1,
						backgroundColor: 'rgba(0,0,0,0.7)',
						justifyContent: 'flex-end',
					}}
					activeOpacity={1}
					onPress={() => setShowCountryModal(false)}>
					<View
						style={{
							backgroundColor: '#141414',
							borderTopLeftRadius: 20,
							borderTopRightRadius: 20,
							maxHeight: '70%',
							borderWidth: 1,
							borderColor: '#2a2a2a',
						}}>
						<View
							style={{
								padding: 16,
								borderBottomWidth: 1,
								borderBottomColor: '#262626',
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}>
							<Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
								Pilih Negara
							</Text>
							<TouchableOpacity
								onPress={() => setShowCountryModal(false)}
								style={{
									width: 32,
									height: 32,
									borderRadius: 16,
									backgroundColor: '#262626',
									justifyContent: 'center',
									alignItems: 'center',
								}}>
								<Ionicons
									name='close'
									size={18}
									color='#fff'
								/>
							</TouchableOpacity>
						</View>
						<ScrollView style={{ paddingHorizontal: 12,marginBottom:12 }}>
							{COUNTRIES.map(c => (
								<TouchableOpacity
									key={c.code}
									onPress={() => {
										setCountryCode(c.code);
										setTab(c.code === 'TOP' ? 'top' : 'indo');
										setShowCountryModal(false);
									}}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										padding: 14,
										borderRadius: 12,
										backgroundColor: countryCode === c.code ? '#2c1a0f' : 'transparent',
										borderWidth: 1,
										borderColor: countryCode === c.code ? '#ffb000' : 'transparent',
										marginBottom: 6,
									}}>
									<Text style={{ fontSize: 20, marginRight: 12 }}>{c.flag}</Text>
									<Text
										style={{
											flex: 1,
											color: countryCode === c.code ? '#ffb000' : '#e0e0e0',
											fontWeight: countryCode === c.code ? '800' : '600',
											fontSize: 14,
										}}>
										{c.name}
									</Text>
									<Text style={{ color: '#666', fontSize: 12 }}>{c.code}</Text>
									{countryCode === c.code && (
										<Ionicons
											name='checkmark-circle'
											size={18}
											color='#ffb000'
											style={{ marginLeft: 8 }}
										/>
									)}
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
}
