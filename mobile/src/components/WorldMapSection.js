import { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { COLORS, shadow } from '../utils/styles';

const buildMapHTML = (destinations) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .pin{background:#E8743B;color:#fff;border-radius:50%;border:2px solid #fff;
      width:32px;height:32px;display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:800;font-family:sans-serif;
      box-shadow:0 2px 6px rgba(232,116,59,.5);cursor:pointer}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([20,10],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:10,minZoom:1}).addTo(map);
  ${JSON.stringify(destinations)}.forEach(function(d){
    var lat=parseFloat(d.lat),lon=parseFloat(d.lon);
    if(isNaN(lat)||isNaN(lon))return;
    var icon=L.divIcon({className:'',
      html:'<div class="pin">'+(d.count>99?'99+':d.count)+'</div>',
      iconSize:[32,32],iconAnchor:[16,16]});
    L.marker([lat,lon],{icon:icon}).addTo(map).on('click',function(){
      (window.ReactNativeWebView||window.parent).postMessage
        ?window.ReactNativeWebView
          ?window.ReactNativeWebView.postMessage(d.name)
          :window.parent.postMessage({type:'destClick',name:d.name},'*')
        :null;
    });
  });
</script>
</body>
</html>`;

const WorldMapSection = ({ destinations, onSelectDestination, style }) => {
  const { t } = useTranslation();
  const webViewRef = useRef(null);

  const goToDestination = (name) => onSelectDestination(name);

  const handleWebViewMessage = (event) => {
    const name = event.nativeEvent.data;
    if (name) goToDestination(name);
  };

  // On web (Expo web), listen to postMessage from iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e) => {
      if (e.data?.type === 'destClick' && e.data?.name) goToDestination(e.data.name);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const html = buildMapHTML(destinations);

  return (
    <View style={[styles.mapSection, style]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('home.exploreTheWorld')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.destinationsCount', { count: destinations.length })}</Text>
        </View>
      </View>

      {Platform.OS === 'web' ? (
        /* Expo web: chips fallback since WebView is native-only */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destChips}>
          {destinations.map((dest, i) => (
            <TouchableOpacity key={i} style={styles.destChip} onPress={() => goToDestination(dest.name)}>
              <Text style={styles.destChipName}>{dest.name}</Text>
              <Text style={styles.destChipCount}>{dest.count}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* Native (APK): full Leaflet map via WebView, free, no API key */
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html }}
            style={styles.map}
            scrollEnabled={false}
            onMessage={handleWebViewMessage}
            originWhitelist={['*']}
            javaScriptEnabled
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  mapSection: { paddingHorizontal: 16, paddingTop: 20 },
  mapContainer: {
    borderRadius: 14, overflow: 'hidden', height: 220,
    ...shadow(2, 0.08, 8, 3),
  },
  map: { flex: 1 },
  destChips: { gap: 8, paddingVertical: 4 },
  destChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    ...shadow(1, 0.05, 4, 1),
  },
  destChipName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  destChipCount: {
    fontSize: 11, fontWeight: '700', color: '#fff',
    backgroundColor: COLORS.primary, borderRadius: 999,
    paddingVertical: 1, paddingHorizontal: 6,
  },
});

export default WorldMapSection;
