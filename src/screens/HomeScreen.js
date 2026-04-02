import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Colors } from '../theme/colors';
import SleepDataService from '../services/SleepDataService';
import SleepScoreRing from '../components/SleepScoreRing';
import StatCard from '../components/StatCard';
import AudioEventBadge from '../components/AudioEventBadge';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [lastSession, setLastSession] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const sessions = await SleepDataService.getAllSessions();
    setLastSession(sessions[0] || null);
    const stats = await SleepDataService.getWeeklyStats();
    setWeeklyStats(stats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayStr = format(new Date(), "EEEE, dd. MMMM", { locale: de });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Guten Abend</Text>
            <Text style={styles.date}>{todayStr}</Text>
          </View>
          <Ionicons name="moon" size={32} color={Colors.primary} />
        </View>

        {/* Last night score */}
        {lastSession ? (
          <View style={styles.lastNight}>
            <Text style={styles.sectionTitle}>Letzte Nacht</Text>
            <View style={styles.scoreCard}>
              <SleepScoreRing score={lastSession.score || 0} size={130} />
              <View style={styles.scoreDetails}>
                <Text style={styles.qualityLabel}>
                  {SleepDataService.getQualityLabel(lastSession.quality)}
                </Text>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {SleepDataService.formatTime(lastSession.startTime)} –{' '}
                    {SleepDataService.formatTime(lastSession.endTime)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="bed-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {SleepDataService.formatDuration(lastSession.durationMinutes)}
                  </Text>
                </View>
                {lastSession.events.length > 0 && (
                  <View style={styles.eventsRow}>
                    {lastSession.events.slice(0, 3).map((ev, i) => (
                      <AudioEventBadge key={i} type={ev.type} compact />
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() =>
                    navigation.navigate('History', {
                      screen: 'SleepDetail',
                      params: { sessionId: lastSession.id },
                    })
                  }
                >
                  <Text style={styles.detailsBtnText}>Details ansehen</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noSession}>
            <Ionicons name="moon-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.noSessionTitle}>Noch keine Aufzeichnung</Text>
            <Text style={styles.noSessionSub}>
              Starte dein erstes Schlaftracking unten im Tracker-Tab.
            </Text>
          </View>
        )}

        {/* Weekly stats */}
        {weeklyStats && weeklyStats.totalSessions > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diese Woche</Text>
            <View style={styles.statsRow}>
              <StatCard
                icon="bed"
                iconColor={Colors.primary}
                label="Ø Schlafdauer"
                value={SleepDataService.formatDuration(weeklyStats.avgDuration)}
              />
              <StatCard
                icon="star"
                iconColor={Colors.secondary}
                label="Ø Score"
                value={weeklyStats.avgScore}
              />
              <StatCard
                icon="calendar"
                iconColor={Colors.success}
                label="Nächte"
                value={weeklyStats.totalSessions}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                icon="volume-high"
                iconColor={Colors.snoring}
                label="Schnarchen"
                value={weeklyStats.totalSnoringEvents}
                subtitle="Ereignisse"
              />
              <StatCard
                icon="chatbubble"
                iconColor={Colors.talking}
                label="Reden"
                value={weeklyStats.totalTalkingEvents}
                subtitle="Ereignisse"
              />
              <StatCard
                icon="trending-up"
                iconColor={Colors.accent}
                label="Trend"
                value={weeklyStats.avgScore >= 70 ? '↑' : '↓'}
                subtitle={weeklyStats.avgScore >= 70 ? 'Positiv' : 'Verbessern'}
              />
            </View>
          </View>
        )}

        {/* Quick start */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigation.navigate('Tracker')}
          activeOpacity={0.85}
        >
          <Ionicons name="radio-button-on" size={24} color={Colors.background} />
          <Text style={styles.startBtnText}>Schlaf jetzt aufzeichnen</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: { fontSize: 26, fontWeight: 'bold', color: Colors.textPrimary },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lastNight: { marginBottom: 28 },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreDetails: { flex: 1 },
  qualityLabel: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 },
  detailText: { fontSize: 13, color: Colors.textSecondary },
  eventsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 4 },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  detailsBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  noSession: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 28,
  },
  noSessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  noSessionSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  section: { marginBottom: 28 },
  statsRow: { flexDirection: 'row', marginBottom: 0 },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  startBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.background },
});
