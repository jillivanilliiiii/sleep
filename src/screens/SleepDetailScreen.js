import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import SleepDataService from '../services/SleepDataService';
import SleepScoreRing from '../components/SleepScoreRing';
import AudioEventBadge from '../components/AudioEventBadge';

function InfoRow({ icon, label, value, color }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={color || Colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color && { color }]}>{value}</Text>
    </View>
  );
}

export default function SleepDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [session, setSession] = useState(null);

  const { sessionId } = route.params;

  useEffect(() => {
    const load = async () => {
      const s = await SleepDataService.getSessionById(sessionId);
      setSession(s);
    };
    load();
  }, [sessionId]);

  if (!session) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Lade Daten...</Text>
      </View>
    );
  }

  const snoringEvents = session.events.filter((e) => e.type === 'snoring');
  const talkingEvents = session.events.filter((e) => e.type === 'talking');
  const noiseEvents = session.events.filter((e) => e.type === 'noise');
  const totalEventDuration = session.events.reduce((a, e) => a + (e.duration || 0), 0);
  const snoringDuration = snoringEvents.reduce((a, e) => a + (e.duration || 0), 0);
  const talkingDuration = talkingEvents.reduce((a, e) => a + (e.duration || 0), 0);

  const hasAudio = session.segments && session.segments.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.date}>{SleepDataService.formatDate(session.startTime)}</Text>

        {/* Score */}
        <View style={styles.scoreSection}>
          <SleepScoreRing score={session.score || 0} size={150} strokeWidth={14} />
          <Text style={[styles.qualityText, { color: SleepDataService.getScoreColor(session.score || 0) }]}>
            {SleepDataService.getQualityLabel(session.quality)}
          </Text>
        </View>

        {/* Sleep info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schlafzeit</Text>
          <InfoRow
            icon="play-circle-outline"
            label="Eingeschlafen"
            value={SleepDataService.formatTime(session.startTime)}
            color={Colors.primary}
          />
          <InfoRow
            icon="stop-circle-outline"
            label="Aufgewacht"
            value={SleepDataService.formatTime(session.endTime)}
            color={Colors.accent}
          />
          <InfoRow
            icon="time-outline"
            label="Schlafdauer"
            value={SleepDataService.formatDuration(session.durationMinutes)}
          />
          <InfoRow
            icon="bed-outline"
            label="Qualität"
            value={SleepDataService.getQualityLabel(session.quality)}
            color={SleepDataService.getQualityColor(session.quality)}
          />
        </View>

        {/* Event summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Geräusch-Ereignisse</Text>
          {session.events.length === 0 ? (
            <View style={styles.noEventsRow}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              <Text style={styles.noEventsText}>Keine Geräusche erkannt – ruhige Nacht!</Text>
            </View>
          ) : (
            <>
              <InfoRow
                icon="volume-high"
                label="Schnarchen"
                value={`${snoringEvents.length}x · ${SleepDataService.formatDuration(Math.round(snoringDuration / 60000))}`}
                color={Colors.snoring}
              />
              <InfoRow
                icon="chatbubble"
                label="Reden"
                value={`${talkingEvents.length}x · ${SleepDataService.formatDuration(Math.round(talkingDuration / 60000))}`}
                color={Colors.talking}
              />
              {noiseEvents.length > 0 && (
                <InfoRow
                  icon="alert-circle"
                  label="Geräusche"
                  value={`${noiseEvents.length}x`}
                  color={Colors.movement}
                />
              )}
              <InfoRow
                icon="pulse"
                label="Gesamt aktiv"
                value={SleepDataService.formatDuration(Math.round(totalEventDuration / 60000))}
              />
            </>
          )}
        </View>

        {/* Audio events list */}
        {session.events.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Alle Ereignisse</Text>
              {hasAudio && (
                <TouchableOpacity
                  style={styles.listenBtn}
                  onPress={() =>
                    navigation.navigate('AudioEvents', { sessionId: session.id })
                  }
                >
                  <Ionicons name="headset-outline" size={14} color={Colors.primary} />
                  <Text style={styles.listenBtnText}>Anhören</Text>
                </TouchableOpacity>
              )}
            </View>
            {session.events.map((ev, i) => (
              <AudioEventBadge key={i} type={ev.type} duration={ev.duration} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textSecondary },

  date: { fontSize: 16, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },

  scoreSection: { alignItems: 'center', marginBottom: 24 },
  qualityText: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },

  noEventsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  noEventsText: { fontSize: 14, color: Colors.success },

  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  listenBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
});
