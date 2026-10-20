import { WebView } from "react-native-webview";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export function HlsFallbackWebView({ url, onClose }: { url: string; onClose?: () => void }) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh} video{width:100%;height:auto;max-height:100vh}</style>
  </head>
  <body>
    <video id="v" controls autoplay playsinline></video>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script>
      const url = "${url}";
      const video = document.getElementById('v');
      if (url.includes('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls(); hls.loadSource(url); hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
        }
      } else {
        video.src = url;
      }
      video.play().catch(()=>{});
    </script>
  </body>
  </html>`;
  return (
    <View style={styles.container}>
      <WebView source={{ html }} style={styles.web} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  web: { flex: 1, backgroundColor: '#000' }
});
