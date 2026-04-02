import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import SleepDataService from '../services/SleepDataService';
import AudioEventBadge from '../components/AudioEventBadge';

function SessionCard({ session, onPress, onDelete }) {
  const snoringCount = session.events.filter((e) => e.type === 'snoring').length;
  const talkingCount = session.events.filter((e) => e.type === 'talking').length;
  const scoreColor = SleepDataService.getScoreColor(session.score || 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{SleepDataService.formatDate(session.startTime)}</Text>
          <Text style={styles.cardTime}>
            {SleepDataService.formatTime(session.startTime)} –{' '}
            {SleepDataService.formatTime(session.endTime)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{session.score || '--'}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.cardStat}>
          <Ionicons name="bed-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.cardStatText}>
            {SleepDataService.formatDuration(session.durationMinutes)}
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Ionicons name="star-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.cardStatText}>
            {SleepDataService.getQualityLabel(session.quality)}
          </Text>
        </View>
      </View>

      {session.events.length > 0 && (
        <View style={styles.cardEvents}>
          {snoringCount > 0 && (
            <AudioEventBadge type="snoring" compact />
          )}
          {talkingCount > 0 && (
            <AudioEventBadge type="talking" compact />
          )}
          <Text style={styles.eventCount}>
            {session.events.length} Ereignis{session.events.length !== 1 ? 'se' : ''}
          </Text>
        </View>
      )}

      {session.events.length === 0 && (
        <View style={styles.noEventsBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.noEventsText}>Ruhige Nacht</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    const data = await SleepDataService.getAllSessions();
    setSessions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const deleteSession = (sessionId) => {
    Alert.alert(
      'Aufzeichnung löschen',
      'Möchtest du diese Schlafaufzeichnung wirklich löschen? Alle Audiodaten werden entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await SleepDataService.deleteSession(sessionId);
            await loadSessions();
          },
        },
      ]
    );
  };

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Noch keine Aufzeichnungen</Text>
          <Text style={styles.emptySub}>
            Dein Schlafverlauf erscheint hier, sobald du deine erste Nacht aufgezeichnet hast.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() =>
              navigation.navigate('SleepDetail', { sessionId: item.id })
            }
            onDelete={() => deleteSession(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 30 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardDate: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: { fontSize: 14, fontWeight: 'bold' },

  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardStatText: { fontSize: 13, color: Colors.textSecondary },

  cardEvents: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  eventCount: { fontSize: 12, color: Colors.textMuted },

  noEventsBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noEventsText: { fontSize: 12, color: Colors.success },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
