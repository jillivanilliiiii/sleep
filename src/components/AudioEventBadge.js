import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const EVENT_CONFIG = {
  snoring: { icon: 'volume-high', color: Colors.snoring, label: 'Schnarchen' },
  talking: { icon: 'chatbubble', color: Colors.talking, label: 'Reden' },
  noise: { icon: 'alert-circle', color: Colors.movement, label: 'Geräusch' },
};

export default function AudioEventBadge({ type, duration, compact = false }) {
  const config = EVENT_CONFIG[type] || EVENT_CONFIG.noise;
  const secs = duration ? Math.round(duration / 1000) : 0;
  const durationLabel = secs > 60 ? `${Math.round(secs / 60)}m ${secs % 60}s` : `${secs}s`;

  if (compact) {
    return (
      <View style={[styles.badge, { backgroundColor: config.color + '22', borderColor: config.color + '44' }]}>
        <Ionicons name={config.icon} size={12} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderLeftColor: config.color }]}>
      <View style={[styles.iconWrap, { backgroundColor: config.color + '22' }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.type}>{config.label}</Text>
        <Text style={styles.duration}>{durationLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  type: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  duration: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
