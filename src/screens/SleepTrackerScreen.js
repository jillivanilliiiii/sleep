import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Colors } from '../theme/colors';
import AudioService from '../services/AudioService';
import SleepDataService from '../services/SleepDataService';
import AudioEventBadge from '../components/AudioEventBadge';

const STATE = {
  IDLE: 'idle',
  TRACKING: 'tracking',
  FINISHED: 'finished',
};

export default function SleepTrackerScreen() {
  const [trackingState, setTrackingState] = useState(STATE.IDLE);
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [audioLevel, setAudioLevel] = useState(-160);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const levelAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation while tracking
  useEffect(() => {
    if (trackingState === STATE.TRACKING) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [trackingState]);

  // Update audio level bar animation
  useEffect(() => {
    const normalized = Math.max(0, Math.min(1, (audioLevel + 60) / 60));
    Animated.timing(levelAnim, {
      toValue: normalized,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [audioLevel]);

  const startTracking = async () => {
    const newSession = SleepDataService.createNewSession();

    try {
      await AudioService.startSession(newSession.id);
    } catch (e) {
      Alert.alert('Fehler', e.message || 'Mikrofon konnte nicht gestartet werden.');
      return;
    }

    AudioService.onLevelUpdate = (level) => setAudioLevel(level);
    AudioService.onEventDetected = (event) => {
      setEvents((prev) => [event, ...prev]);
    };

    setSession(newSession);
    setEvents([]);
    setElapsed(0);
    setTrackingState(STATE.TRACKING);

    activateKeepAwakeAsync();

    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  };

  const stopTracking = () => {
    Alert.alert(
      'Schlaf beenden',
      'Möchtest du die Aufzeichnung jetzt stoppen?',
      [
        { text: 'Weiter schlafen', style: 'cancel' },
        { text: 'Ja, beenden', onPress: confirmStop },
      ]
    );
  };

  const confirmStop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    deactivateKeepAwake();
    AudioService.onLevelUpdate = null;
    AudioService.onEventDetected = null;

    setSaving(true);
    setTrackingState(STATE.FINISHED);

    try {
      const { events: finalEvents, segments, sessionDir } = await AudioService.stopSession();
      const finalized = SleepDataService.finalizeSession(
        session,
        Date.now(),
        finalEvents,
        segments,
        sessionDir
      );
      await SleepDataService.saveSession(finalized);
      setSession(finalized);
      setEvents(finalEvents);
    } catch (e) {
      console.error('Error stopping session:', e);
    }

    setSaving(false);
  };

  const resetTracker = () => {
    setTrackingState(STATE.IDLE);
    setSession(null);
    setEvents([]);
    setElapsed(0);
    setAudioLevel(-160);
  };

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getLevelColor = () => {
    if (audioLevel >= -20) return Colors.snoring;
    if (audioLevel >= -28) return Colors.talking;
    if (audioLevel >= -50) return Colors.movement;
    return Colors.success;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Schlaf Tracker</Text>

        {/* Main action area */}
        <View style={styles.mainArea}>
          {trackingState === STATE.IDLE && (
            <View style={styles.idleContent}>
              <View style={styles.moonIcon}>
                <Ionicons name="moon" size={64} color={Colors.primary} />
              </View>
              <Text style={styles.idleTitle}>Bereit zum Aufzeichnen</Text>
              <Text style={styles.idleSubtitle}>
                Das Mikrofon analysiert deine Geräusche während du schläfst.
                Schnarchen und Reden wird erkannt und aufgezeichnet.
              </Text>
              <TouchableOpacity style={styles.startBtn} onPress={startTracking} activeOpacity={0.85}>
                <Ionicons name="radio-button-on" size={22} color={Colors.background} />
                <Text style={styles.startBtnText}>Aufzeichnung starten</Text>
              </TouchableOpacity>
            </View>
          )}

          {trackingState === STATE.TRACKING && (
            <View style={styles.trackingContent}>
              {/* Pulse ring */}
              <View style={styles.pulseContainer}>
                <Animated.View
                  style={[
                    styles.pulseOuter,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.pulseInner}>
                  <Ionicons name="mic" size={36} color={Colors.primary} />
                </View>
              </View>

              <Text style={styles.recordingLabel}>Aufzeichnung läuft...</Text>
              <Text style={styles.elapsedTime}>{formatElapsed(elapsed)}</Text>

              {/* Audio level bar */}
              <View style={styles.levelContainer}>
                <Text style={styles.levelLabel}>Geräuschpegel</Text>
                <View style={styles.levelBar}>
                  <Animated.View
                    style={[
                      styles.levelFill,
                      {
                        width: levelAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: getLevelColor(),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.levelValue}>{Math.round(audioLevel)} dB</Text>
              </View>

              {/* Recent events */}
              {events.length > 0 && (
                <View style={styles.liveEvents}>
                  <Text style={styles.eventsTitle}>Erkannte Ereignisse ({events.length})</Text>
                  {events.slice(0, 5).map((ev, i) => (
                    <AudioEventBadge key={i} type={ev.type} duration={ev.duration} />
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.stopBtn} onPress={stopTracking} activeOpacity={0.85}>
                <Ionicons name="stop-circle" size={22} color="#fff" />
                <Text style={styles.stopBtnText}>Aufzeichnung beenden</Text>
              </TouchableOpacity>
            </View>
          )}

          {trackingState === STATE.FINISHED && (
            <View style={styles.finishedContent}>
              {saving ? (
                <>
                  <Ionicons name="cloud-upload-outline" size={56} color={Colors.primary} />
                  <Text style={styles.savingText}>Speichere Aufzeichnung...</Text>
                </>
              ) : (
                <>
                  <View style={[styles.scoreCircle, { borderColor: SleepDataService.getScoreColor(session?.score || 0) }]}>
                    <Text style={[styles.finalScore, { color: SleepDataService.getScoreColor(session?.score || 0) }]}>
                      {session?.score || '--'}
                    </Text>
                    <Text style={styles.finalScoreLabel}>Schlaf-Score</Text>
                  </View>

                  <Text style={styles.finishedTitle}>
                    {SleepDataService.getQualityLabel(session?.quality)}
                  </Text>
                  <Text style={styles.finishedSubtitle}>
                    {SleepDataService.formatDuration(session?.durationMinutes || 0)} Schlaf
                    {' · '}
                    {SleepDataService.formatTime(session?.startTime)} – {SleepDataService.formatTime(session?.endTime)}
                  </Text>

                  {events.length > 0 ? (
                    <View style={styles.eventsSummary}>
                      <Text style={styles.eventsTitle}>Aufgezeichnete Ereignisse</Text>
                      {events.map((ev, i) => (
                        <AudioEventBadge key={i} type={ev.type} duration={ev.duration} />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noEvents}>
                      <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                      <Text style={styles.noEventsText}>Keine auffälligen Geräusche erkannt</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.newBtn} onPress={resetTracker} activeOpacity={0.85}>
                    <Text style={styles.newBtnText}>Neue Aufzeichnung</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Tips */}
        {trackingState === STATE.IDLE && (
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tipps</Text>
            {[
              { icon: 'phone-portrait-outline', text: 'Lege dein Handy in Reichweite auf dem Nachttisch.' },
              { icon: 'battery-charging-outline', text: 'Stecke es zum Laden ein, um die ganze Nacht aufzuzeichnen.' },
              { icon: 'volume-medium-outline', text: 'Stelle sicher, dass das Mikrofon nicht verdeckt ist.' },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name={tip.icon} size={18} color={Colors.primary} />
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingTop: 60, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 24 },

  mainArea: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },

  // Idle
  idleContent: { alignItems: 'center' },
  moonIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  idleTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  idleSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.background },

  // Tracking
  trackingContent: { alignItems: 'center' },
  pulseContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  pulseOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '25',
  },
  pulseInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: Colors.primary + '33',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  recordingLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  elapsedTime: { fontSize: 48, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20, fontVariant: ['tabular-nums'] },

  levelContainer: { width: '100%', marginBottom: 24 },
  levelLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 6, textAlign: 'center' },
  levelBar: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelFill: { height: '100%', borderRadius: 4 },
  levelValue: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },

  liveEvents: { width: '100%', marginBottom: 20 },
  eventsTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  stopBtn: {
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  // Finished
  finishedContent: { alignItems: 'center' },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  finalScore: { fontSize: 36, fontWeight: 'bold' },
  finalScoreLabel: { fontSize: 12, color: Colors.textSecondary },
  finishedTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 6 },
  finishedSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 20 },
  eventsSummary: { width: '100%', marginBottom: 20 },
  noEvents: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  noEventsText: { fontSize: 14, color: Colors.success, fontWeight: '500' },
  savingText: { fontSize: 16, color: Colors.textSecondary, marginTop: 16 },
  newBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  newBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },

  // Tips
  tips: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tipText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
});
