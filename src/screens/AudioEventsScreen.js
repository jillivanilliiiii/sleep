import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../theme/colors';
import SleepDataService from '../services/SleepDataService';

const EVENT_ICONS = {
  snoring: { icon: 'volume-high', color: Colors.snoring, label: 'Schnarchen' },
  talking: { icon: 'chatbubble', color: Colors.talking, label: 'Reden' },
  noise: { icon: 'alert-circle', color: Colors.movement, label: 'Geräusch' },
};

export default function AudioEventsScreen() {
  const route = useRoute();
  const { sessionId } = route.params;

  const [session, setSession] = useState(null);
  const [segments, setSegments] = useState([]);
  const [playing, setPlaying] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const s = await SleepDataService.getSessionById(sessionId);
      setSession(s);

      if (s?.segments?.length > 0) {
        // Prefer Firebase URLs, fallback to local paths
        const available = [];
        for (const seg of s.segments) {
          if (seg.firebaseUrl) {
            available.push({ ...seg, playUri: seg.firebaseUrl });
          } else if (seg.localPath) {
            const info = await FileSystem.getInfoAsync(seg.localPath);
            if (info.exists) available.push({ ...seg, playUri: seg.localPath });
          }
        }
        setSegments(available);
      }
    };
    load();
    return () => { stopPlayback(); };
  }, [sessionId]);

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setPlaying(null);
  };

  const playSegment = async (playUri, segmentIndex) => {
    if (playing === segmentIndex) { await stopPlayback(); return; }
    await stopPlayback();
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: playUri }, { shouldPlay: true });
      soundRef.current = sound;
      setPlaying(segmentIndex);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) { setPlaying(null); soundRef.current = null; }
      });
    } catch (e) {
      Alert.alert('Fehler', 'Audio konnte nicht abgespielt werden.');
      setPlaying(null);
    }
  };

  if (!session) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Lade Aufnahmen...</Text>
      </View>
    );
  }

  if (segments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="mic-off-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Keine Audioaufnahmen</Text>
          <Text style={styles.emptySub}>
            Die Audiodateien dieser Nacht sind nicht mehr verfügbar.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={segments}
        keyExtractor={(item) => String(item.index)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Aufnahmen</Text>
            <Text style={styles.headerSub}>
              {segments.length} Segment{segments.length !== 1 ? 'e' : ''} ·{' '}
              {SleepDataService.formatDate(session.startTime)}
            </Text>
            <View style={styles.cloudBadge}>
              <Ionicons name="phone-portrait-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.cloudText}>Lokal auf dem Gerät gespeichert</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const segEvents = (session.events || []).filter((ev) => ev.segmentIndex === item.index);
          const isPlaying = playing === item.index;

          return (
            <View style={styles.segmentCard}>
              <View style={styles.segmentHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.segmentTitleRow}>
                    <Text style={styles.segmentTitle}>Segment {item.index + 1}</Text>
                  </View>
                  {segEvents.length > 0 ? (
                    <View style={styles.segmentEvents}>
                      {segEvents.map((ev, i) => {
                        const cfg = EVENT_ICONS[ev.type] || EVENT_ICONS.noise;
                        return (
                          <View key={i} style={[styles.eventPill, { backgroundColor: cfg.color + '22' }]}>
                            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                            <Text style={[styles.eventPillText, { color: cfg.color }]}>{cfg.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.quietSegment}>Ruhiges Segment</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                  onPress={() => playSegment(item.playUri, item.index)}
                >
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isPlaying ? Colors.background : Colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.waveformBar}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveformTick,
                      {
                        height: 4 + Math.random() * 16,
                        backgroundColor: segEvents.length > 0
                          ? isPlaying ? Colors.primary : Colors.borderLight
                          : Colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary },
  list: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  cloudBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  cloudText: { fontSize: 12, color: Colors.success, fontWeight: '500' },

  segmentCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 10 },
  segmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  segmentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  segmentTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  segmentEvents: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  eventPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  eventPillText: { fontSize: 11, fontWeight: '600' },
  quietSegment: { fontSize: 12, color: Colors.textMuted },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '22', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary },
  playBtnActive: { backgroundColor: Colors.primary },
  waveformBar: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  waveformTick: { flex: 1, borderRadius: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
