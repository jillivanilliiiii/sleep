import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import SleepDataService from '../services/SleepDataService';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 56;
const CHART_HEIGHT = 140;
const MAX_HOURS = 12;

function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.hours), MAX_HOURS);
  const barWidth = (CHART_WIDTH - (data.length - 1) * 8) / data.length;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 8 }}>
        {data.map((item, i) => {
          const barH = Math.max(4, (item.hours / maxVal) * CHART_HEIGHT);
          const color = item.hours >= 7 ? Colors.success : item.hours >= 5 ? Colors.primary : Colors.error;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={styles.barValue}>{item.hours > 0 ? item.hours.toFixed(1) : ''}</Text>
              <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {data.map((item, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.barLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScoreChart({ sessions }) {
  if (!sessions || sessions.length === 0) return null;
  const last7 = sessions.slice(0, 7).reverse();
  const points = last7.map((s, i) => ({
    x: i,
    y: s.score || 0,
  }));

  const chartW = CHART_WIDTH;
  const chartH = 80;
  const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;

  return (
    <View style={{ height: chartH + 30 }}>
      {/* Y axis labels */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: chartW, height: chartH, position: 'relative' }}>
          {/* Reference lines */}
          {[25, 50, 75, 100].map((val) => (
            <View
              key={val}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: (val / 100) * chartH,
                height: 1,
                backgroundColor: Colors.border,
              }}
            />
          ))}
          {/* Score dots */}
          {points.map((p, i) => {
            const cx = i * stepX;
            const cy = chartH - (p.y / 100) * chartH;
            const color = SleepDataService.getScoreColor(p.y);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: cx - 6,
                  top: cy - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: Colors.surface,
                }}
              />
            );
          })}
        </View>
      </View>
      {/* X labels */}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {last7.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.barLabel}>
              {SleepDataService.formatTime(s.startTime)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [tab, setTab] = useState('week');
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [sessions, setSessions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [ws, ms, all] = await Promise.all([
          SleepDataService.getWeeklyStats(),
          SleepDataService.getMonthlyStats(),
          SleepDataService.getAllSessions(),
        ]);
        setWeeklyStats(ws);
        setMonthlyStats(ms);
        setSessions(all);
      };
      load();
    }, [])
  );

  const stats = tab === 'week' ? weeklyStats : monthlyStats;
  const hasData = sessions.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tab switcher */}
        <View style={styles.tabs}>
          {['week', 'month'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'week' ? 'Woche' : 'Monat'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!hasData ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Noch keine Daten</Text>
            <Text style={styles.emptySub}>
              Starte dein erstes Schlaf-Tracking, um hier Analysen zu sehen.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <Text style={styles.summaryValue}>
                  {stats ? SleepDataService.formatDuration(stats.avgDuration) : '--'}
                </Text>
                <Text style={styles.summaryLabel}>Ø Schlafdauer</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="star-outline" size={20} color={Colors.secondary} />
                <Text style={styles.summaryValue}>{stats?.avgScore ?? '--'}</Text>
                <Text style={styles.summaryLabel}>Ø Score</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="calendar-outline" size={20} color={Colors.success} />
                <Text style={styles.summaryValue}>{stats?.totalSessions ?? '--'}</Text>
                <Text style={styles.summaryLabel}>Nächte</Text>
              </View>
              {tab === 'month' && (
                <View style={styles.summaryCard}>
                  <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
                  <Text style={styles.summaryValue}>{monthlyStats?.bestScore ?? '--'}</Text>
                  <Text style={styles.summaryLabel}>Bester Score</Text>
                </View>
              )}
            </View>

            {/* Sleep duration chart */}
            {tab === 'week' && weeklyStats?.dailyData?.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Schlafdauer (Stunden)</Text>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.legendText}>≥ 7h (optimal)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.legendText}>5–7h</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
                    <Text style={styles.legendText}>{'< 5h'}</Text>
                  </View>
                </View>
                <BarChart data={weeklyStats.dailyData} />
              </View>
            )}

            {/* Score trend */}
            {sessions.length > 1 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Score-Verlauf</Text>
                <ScoreChart sessions={sessions} />
              </View>
            )}

            {/* Audio events breakdown */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Geräusch-Ereignisse</Text>
              <View style={styles.eventsBreakdown}>
                {[
                  { type: 'snoring', label: 'Schnarchen', color: Colors.snoring, icon: 'volume-high' },
                  { type: 'talking', label: 'Reden', color: Colors.talking, icon: 'chatbubble' },
                  { type: 'noise', label: 'Geräusche', color: Colors.movement, icon: 'alert-circle' },
                ].map((item) => {
                  const count = sessions
                    .slice(0, tab === 'week' ? 7 : 30)
                    .reduce(
                      (a, s) => a + s.events.filter((e) => e.type === item.type).length,
                      0
                    );
                  return (
                    <View key={item.type} style={styles.eventBreakdownRow}>
                      <View style={[styles.eventIconWrap, { backgroundColor: item.color + '22' }]}>
                        <Ionicons name={item.icon} size={18} color={item.color} />
                      </View>
                      <Text style={styles.eventBreakdownLabel}>{item.label}</Text>
                      <View style={styles.eventCountBar}>
                        <View
                          style={[
                            styles.eventCountFill,
                            {
                              width: `${Math.min(100, count * 10)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.eventCount, { color: item.color }]}>{count}x</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Sleep quality distribution */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Schlafqualität-Verteilung</Text>
              {['excellent', 'good', 'fair', 'poor'].map((q) => {
                const count = sessions
                  .slice(0, tab === 'week' ? 7 : 30)
                  .filter((s) => s.quality === q).length;
                const total = Math.min(sessions.length, tab === 'week' ? 7 : 30);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const color = SleepDataService.getQualityColor(q);
                return (
                  <View key={q} style={styles.qualityRow}>
                    <Text style={[styles.qualityLabel, { color }]}>
                      {SleepDataService.getQualityLabel(q)}
                    </Text>
                    <View style={styles.qualityBar}>
                      <View
                        style={[styles.qualityFill, { width: `${pct}%`, backgroundColor: color }]}
                      />
                    </View>
                    <Text style={[styles.qualityCount, { color }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.background },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },

  legend: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textSecondary },

  bar: { width: '100%', borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  barValue: { fontSize: 10, color: Colors.textSecondary, marginBottom: 3 },

  eventsBreakdown: { gap: 12 },
  eventBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBreakdownLabel: { fontSize: 13, color: Colors.textSecondary, width: 80 },
  eventCountBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  eventCountFill: { height: '100%', borderRadius: 4 },
  eventCount: { fontSize: 13, fontWeight: '700', width: 32, textAlign: 'right' },

  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  qualityLabel: { fontSize: 12, fontWeight: '600', width: 90 },
  qualityBar: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 5,
    overflow: 'hidden',
  },
  qualityFill: { height: '100%', borderRadius: 5 },
  qualityCount: { fontSize: 13, fontWeight: '700', width: 20, textAlign: 'right' },
});
