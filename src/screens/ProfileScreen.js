import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import AuthService from '../services/AuthService';
import SleepDataService from '../services/SleepDataService';

function Row({ icon, iconColor, label, value, onPress, right }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {right || (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
      {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const user = AuthService.getCurrentUser();
  const [monthlyStats, setMonthlyStats] = useState(null);

  useFocusEffect(
    useCallback(() => {
      SleepDataService.getMonthlyStats().then(setMonthlyStats);
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: () => AuthService.logout(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'Benutzer'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.cloudBadge}>
            <Ionicons name="cloud-done" size={14} color={Colors.success} />
            <Text style={styles.cloudText}>Synced</Text>
          </View>
        </View>

        {/* Monthly summary */}
        {monthlyStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diesen Monat</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{monthlyStats.totalSessions}</Text>
                <Text style={styles.statLabel}>Nächte</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{SleepDataService.formatDuration(monthlyStats.avgDuration)}</Text>
                <Text style={styles.statLabel}>Ø Schlaf</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: SleepDataService.getScoreColor(monthlyStats.avgScore) }]}>
                  {monthlyStats.avgScore}
                </Text>
                <Text style={styles.statLabel}>Ø Score</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: SleepDataService.getScoreColor(monthlyStats.bestScore) }]}>
                  {monthlyStats.bestScore}
                </Text>
                <Text style={styles.statLabel}>Bester</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cloud info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cloud & Daten</Text>
          <View style={styles.card}>
            <Row icon="cloud-outline" iconColor={Colors.primary} label="Schlafdaten-Sync" value="Firestore" />
            <Row icon="mic-outline" iconColor={Colors.textMuted} label="Audioaufnahmen" value="Lokal (Handy)" />
            <Row icon="lock-closed-outline" iconColor={Colors.success} label="Datenverschlüsselung" value="AES-256" />
            <Row icon="server-outline" iconColor={Colors.secondary} label="Speicherort" value="EU (Frankfurt)" />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <Row icon="information-circle-outline" iconColor={Colors.textMuted} label="Version" value="1.0.0" />
            <Row icon="code-slash-outline" iconColor={Colors.textMuted} label="Technologie" value="Expo + Firebase" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 24, fontWeight: 'bold', color: Colors.background },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  userEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cloudBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  cloudText: { fontSize: 11, fontWeight: '600', color: Colors.success },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 3 },

  card: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  rowValue: { fontSize: 13, color: Colors.textSecondary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '44',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
});
