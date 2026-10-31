import TrackPlayer, { Event, State } from 'react-native-track-player';

// Ini jalan di background thread, jadi gak boleh import context React
const PlaybackService = async function() {
  console.log("[PlaybackService] started - notif controls ON");

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try { await TrackPlayer.play(); } catch (e) { console.log(e); }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try { await TrackPlayer.pause(); } catch (e) { console.log(e); }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try { await TrackPlayer.reset(); } catch (e) { console.log(e); }
  });

  // NEXT / PREV - FIX biar ngikutin logic queue lo
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try { 
      await TrackPlayer.skipToNext(); 
    } catch (e) {
      // fallback kalau queue abis
      try {
        const queue = await TrackPlayer.getQueue();
        const currentIdx = await TrackPlayer.getActiveTrackIndex();
        if (currentIdx !== undefined && currentIdx < queue.length - 1) {
          await TrackPlayer.skip(currentIdx + 1);
          await TrackPlayer.play();
        }
      } catch {}
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      const pos = await TrackPlayer.getPosition();
      if (pos > 3) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (e) { console.log(e); }
  });

  // SEEK BAR DI NOTIF - INI YANG KEMAREN GAK JALAN
  TrackPlayer.addEventListener(Event.RemoteSeek, async (e: any) => {
    try {
      console.log("[Notif] RemoteSeek to", e.position);
      await TrackPlayer.seekTo(e.position);
    } catch (e) { console.log(e); }
  });

  // JUMP FORWARD/BACKWARD (beberapa HP pakai ini)
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (e: any) => {
    try {
      const pos = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(pos + (e.interval || 15));
    } catch {}
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (e: any) => {
    try {
      const pos = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, pos - (e.interval || 15)));
    } catch {}
  });

  // biar loop one juga jalan dari notif
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (e: any) => {
    try {
      const repeatMode = await (TrackPlayer as any).getRepeatMode?.();
      // 2 = Queue, 1 = Track, 0 = Off
      if (repeatMode === 2) {
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
        }
      }
    } catch {}
  });
};


export default PlaybackService;