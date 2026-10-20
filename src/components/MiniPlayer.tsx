import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
	Image,
} from 'react-native';
import { colors } from '../theme/colors';
import { useAudioPlayer } from '../context/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaItem } from '../types';

export function MiniPlayer() {
	const player = useAudioPlayer();
	const [expanded, setExpanded] = useState(false);
	const insets = useSafeAreaInsets();
	const [isSliding, setIsSliding] = useState(false);
	const [slidePos, setSlidePos] = useState(0);
	const lastSeekRef = useRef(0);

	const current = player?.current;

	// FIX: deteksi radio yang bener, jangan sampai musik HP ke-detect radio
	const isRadio =
		current?.mediaType === 'radio' ||
		current?.extra?.isRadio === true ||
		(current?.sourceId && current.sourceId.toLowerCase().includes('radio'));

	if (isRadio) return null; // sesuai request: radio jangan tampil miniplayer
	if (!current) return null;
	const hasQueue = player.queue.length > 1;
	const queuePos =
		player.currentIndex >= 0
			? `${player.currentIndex + 1}/${player.queue.length}`
			: '';

	const formatTime = (sec: number) => {
		if (!sec || isNaN(sec) || sec < 0) return '00:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	};

	const displayPos = isSliding ? slidePos : player.position;
	const safeDuration = player.duration > 0 ? player.duration : 0;

	const handleSeek = (value: number) => {
		lastSeekRef.current = Date.now();
		player.seek(value);
		setSlidePos(value);
		setIsSliding(false);
	};

	if (!expanded) {
		return (
			<View style={[styles.collapsedContainer, { bottom: 70 + insets.bottom }]}>
				<TouchableOpacity
					style={styles.collapsedContent}
					onPress={() => setExpanded(true)}
					activeOpacity={0.9}>
					<View style={styles.cover}>
						{current?.thumbnail ? (
							<Image
								source={{ uri: current.thumbnail }}
								style={{ width: 44, height: 44, borderRadius: 10 }}
								resizeMode='cover'
							/>
						) : (
							<Ionicons
								name='musical-notes'
								size={16}
								color={colors.primary}
							/>
						)}
						{hasQueue && (
							<View style={styles.queueBadge}>
								<Text style={styles.queueText}>{queuePos}</Text>
							</View>
						)}
					</View>
					<View style={{ flex: 1, marginLeft: 12 }}>
						<Text
							style={styles.title}
							numberOfLines={1}>
							{current.title}
						</Text>
						<Text
							style={styles.sub}
							numberOfLines={1}>
							{formatTime(player.position)} / {formatTime(player.duration)} •{' '}
							{queuePos}
						</Text>
						{safeDuration > 0 && (
							<View style={styles.progressBg}>
								<View
									style={[
										styles.progressFill,
										{
											width: `${Math.min(100, (player.position / safeDuration) * 100)}%`,
										},
									]}
								/>
							</View>
						)}
					</View>
					<TouchableOpacity
						onPress={() => player.playPrev()}
						style={styles.btn}>
						<Ionicons
							name='play-skip-back'
							size={18}
							color={colors.text}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => player.toggle()}
						style={styles.playBtn}>
						<Ionicons
							name={player.isPlaying ? 'pause' : 'play'}
							size={18}
							color='#000'
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => player.playNext()}
						style={styles.btn}>
						<Ionicons
							name='play-skip-forward'
							size={18}
							color={colors.text}
						/>
					</TouchableOpacity>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<Modal
			visible={expanded}
			transparent
			animationType='slide'
			onRequestClose={() => setExpanded(false)}>
			<View style={styles.expandedBg}>
				<View style={[styles.expandedCard, { paddingBottom: insets.bottom + 20 }]}>
					<View style={styles.expandedHeader}>
						<TouchableOpacity
							onPress={() => setExpanded(false)}
							style={styles.headerBtn}>
							<Ionicons
								name='chevron-down'
								size={22}
								color={colors.text}
							/>
						</TouchableOpacity>
						<Text style={styles.expandedTitle}>
							Now Playing • {queuePos} • {formatTime(displayPos)} /{' '}
							{formatTime(safeDuration)}
						</Text>
						<TouchableOpacity
							onPress={() => {
								player.stop();
								setExpanded(false);
							}}
							style={styles.headerBtn}>
							<Ionicons
								name='close'
								size={18}
								color={colors.textMuted}
							/>
						</TouchableOpacity>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 20 }}>
						<View style={styles.bigCover}>
							{current?.thumbnail ? (
								<Image
									source={{ uri: current.thumbnail }}
									style={{ width: '100%', height: '100%', borderRadius: 20 }}
									resizeMode='cover'
								/>
							) : (
								<>
									<Ionicons
										name='musical-notes'
										size={48}
										color={colors.primary}
									/>
									<Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 11 }}>
										{player.queue.length} songs • {formatTime(displayPos)} /{' '}
										{formatTime(safeDuration)}
									</Text>
								</>
							)}
						</View>

						<View style={{ alignItems: 'center', marginTop: 14 }}>
							<Text
								style={styles.bigTitle}
								numberOfLines={2}>
								{current.title}
							</Text>
							<Text style={styles.bigSub}>{current.artist || current.mediaType}</Text>
						</View>

						<View style={{ marginTop: 16 }}>
							<Slider
								style={{ width: '100%', height: 40 }}
								minimumValue={0}
								maximumValue={safeDuration > 0 ? safeDuration : 1}
								value={displayPos}
								minimumTrackTintColor={colors.primary}
								maximumTrackTintColor={colors.border}
								thumbTintColor={colors.primary}
								tapToSeek={true}
								onSlidingStart={v => {
									setIsSliding(true);
									setSlidePos(v);
								}}
								onValueChange={v => {
									setSlidePos(v);
								}}
								onSlidingComplete={v => {
									setIsSliding(false);
									handleSeek(v);
								}}
							/>
							<View
								style={{
									flexDirection: 'row',
									justifyContent: 'space-between',
									marginTop: -6,
								}}>
								<Text style={styles.timeText}>{formatTime(displayPos)}</Text>
								<Text style={styles.timeText}>{formatTime(safeDuration)}</Text>
							</View>
						</View>

						<View style={styles.mainControls}>
							<TouchableOpacity
								onPress={() => player.setShuffle(!player.shuffle)}
								style={[styles.iconBtn, player.shuffle && styles.iconBtnActive]}>
								<Ionicons
									name='shuffle'
									size={20}
									color={player.shuffle ? '#000' : colors.textMuted}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => player.playPrev()}
								style={styles.controlMain}>
								<Ionicons
									name='play-skip-back'
									size={26}
									color={colors.text}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => player.toggle()}
								style={styles.playBigBtn}>
								<Ionicons
									name={player.isPlaying ? 'pause' : 'play'}
									size={30}
									color='#000'
								/>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => player.playNext()}
								style={styles.controlMain}>
								<Ionicons
									name='play-skip-forward'
									size={26}
									color={colors.text}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									const modes: any = ['off', 'all', 'one'];
									const idx = modes.indexOf(player.loopMode);
									player.setLoopMode(modes[(idx + 1) % 3]);
								}}
								style={[
									styles.iconBtn,
									player.loopMode !== 'off' && styles.iconBtnActive,
								]}>
								<Ionicons
									name='repeat'
									size={20}
									color={player.loopMode !== 'off' ? '#000' : colors.textMuted}
								/>
								{player.loopMode === 'one' && (
									<View style={styles.oneBadge}>
										<Text style={styles.oneText}>1</Text>
									</View>
								)}
							</TouchableOpacity>
						</View>

						<Text style={styles.modeText}>
							Shuffle {player.shuffle ? 'ON' : 'OFF'} • Loop:{' '}
							{player.loopMode.toUpperCase()} • Auto Next ON
						</Text>

						<View style={{ marginTop: 20 }}>
							<Text style={styles.playlistHeader}>
								DAFTAR PUTAR • {player.queue.length} LAGU • TAP BUAT PINDAH
							</Text>
							<View style={{ gap: 8, marginTop: 8 }}>
								{player.queue.map((q: MediaItem, idx: number) => {
									const isCur = idx === player.currentIndex;
									return (
										<TouchableOpacity
											key={`${q.id}-${idx}`}
											// FIX QUEUE HILANG: kirim full queue, bukan cuma 1 lagu
											onPress={() => player.play(q, player.queue)}
											style={[styles.queueRow, isCur && styles.queueRowActive]}>
											<View
												style={[styles.queueNum, isCur && { backgroundColor: '#000' }]}>
												<Text
													style={[styles.queueNumText, isCur && { color: colors.primary }]}>
													{idx + 1}
												</Text>
											</View>
											<View style={{ flex: 1 }}>
												<Text
													style={[styles.queueTitle, isCur && { color: '#000' }]}
													numberOfLines={1}>
													{q.title}
												</Text>
												<Text
													style={[styles.queueSub, isCur && { color: '#000', opacity: 0.7 }]}
													numberOfLines={1}>
													{q.artist || q.mediaType}
													{isCur
														? ` • ${formatTime(displayPos)} / ${formatTime(safeDuration)}`
														: ''}
												</Text>
											</View>
											{isCur && player.isPlaying && (
												<View style={styles.playingAnim}>
													<View style={[styles.bar, { height: 8 }]} />
													<View style={[styles.bar, { height: 14 }]} />
													<View style={[styles.bar, { height: 6 }]} />
												</View>
											)}
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	collapsedContainer: {
		position: 'absolute',
		left: 12,
		right: 12,
		backgroundColor: '#1a1a1a',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#2a2a2a',
		elevation: 8,
	},
	collapsedContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
	},
	cover: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: '#2a2a2a',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#333',
		overflow: 'visible',
	},
	queueBadge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		backgroundColor: colors.primary,
		borderRadius: 8,
		paddingHorizontal: 4,
		paddingVertical: 1,
	},
	queueText: { color: '#000', fontSize: 8, fontWeight: '700' },
	title: { color: colors.text, fontWeight: '700', fontSize: 12 },
	sub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
	progressBg: {
		height: 2,
		backgroundColor: colors.border,
		borderRadius: 1,
		marginTop: 4,
		overflow: 'hidden',
	},
	progressFill: { height: '100%', backgroundColor: colors.primary },
	btn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 2,
	},
	playBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 4,
	},
	expandedBg: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.9)',
		justifyContent: 'flex-end',
	},
	expandedCard: {
		backgroundColor: '#0f0f0f',
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		padding: 20,
		maxHeight: '92%',
	},
	expandedHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	headerBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: colors.card,
		justifyContent: 'center',
		alignItems: 'center',
	},
	expandedTitle: {
		color: colors.textMuted,
		fontWeight: '600',
		fontSize: 10,
		letterSpacing: 0.5,
	},
	bigCover: {
		width: '100%',
		height: 110,
		backgroundColor: colors.card,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	bigTitle: {
		color: colors.text,
		fontWeight: 'bold',
		fontSize: 16,
		textAlign: 'center',
	},
	bigSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
	timeText: { color: colors.textMuted, fontSize: 11 },
	mainControls: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 14,
	},
	iconBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.card,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.border,
	},
	iconBtnActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	controlMain: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: colors.card,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: colors.border,
	},
	playBigBtn: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modeText: {
		color: colors.textMuted,
		fontSize: 10,
		textAlign: 'center',
		marginTop: 10,
	},
	oneBadge: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: colors.background,
		borderRadius: 8,
		paddingHorizontal: 4,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	oneText: { color: colors.primary, fontSize: 8, fontWeight: 'bold' },
	playlistHeader: {
		color: colors.textMuted,
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	queueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	queueRowActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
	},
	queueNum: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center',
	},
	queueNumText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
	queueTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
	queueSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
	playingAnim: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
	bar: { width: 3, backgroundColor: '#000', borderRadius: 2 },
});
