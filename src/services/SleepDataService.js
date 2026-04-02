import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { db, auth } from './firebase';

export const SleepQuality = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
};

function generateId() {
  return `sleep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function calcSleepScore(durationMinutes, events) {
  const durationHours = durationMinutes / 60;
  const snoringEvents = events.filter((e) => e.type === 'snoring').length;
  const talkingEvents = events.filter((e) => e.type === 'talking').length;

  let score = 100;
  if (durationHours < 5) score -= 30;
  else if (durationHours < 6) score -= 15;
  else if (durationHours > 9) score -= 10;
  score -= Math.min(snoringEvents * 5, 30);
  score -= Math.min(talkingEvents * 3, 15);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calcSleepQuality(score) {
  if (score >= 85) return SleepQuality.EXCELLENT;
  if (score >= 70) return SleepQuality.GOOD;
  if (score >= 50) return SleepQuality.FAIR;
  return SleepQuality.POOR;
}

function sessionsCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Nicht eingeloggt');
  return collection(db, 'users', uid, 'sessions');
}

class SleepDataService {
  createNewSession() {
    return {
      id: generateId(),
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      events: [],
      segments: [],
      sessionDir: null,
      score: null,
      quality: null,
      note: '',
    };
  }

  finalizeSession(session, endTime, events, segments, sessionDir) {
    const start = parseISO(session.startTime);
    const end = new Date(endTime);
    const durationMinutes = differenceInMinutes(end, start);
    const score = calcSleepScore(durationMinutes, events);

    return {
      ...session,
      endTime: end.toISOString(),
      durationMinutes,
      events,
      segments,
      sessionDir,
      score,
      quality: calcSleepQuality(score),
    };
  }

  async saveSession(sessionData) {
    const col = sessionsCollection();
    // Use the generated ID as document ID so we can query it later
    const docRef = doc(col, sessionData.id);
    await addDoc(col, {
      ...sessionData,
      createdAt: serverTimestamp(),
    }).catch(() => {});
    // Use setDoc to control the ID
    const { setDoc } = await import('firebase/firestore');
    await setDoc(docRef, {
      ...sessionData,
      createdAt: serverTimestamp(),
    });
  }

  async getAllSessions() {
    const col = sessionsCollection();
    const q = query(col, orderBy('startTime', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), firestoreId: d.id }));
  }

  async getSessionById(sessionId) {
    const col = sessionsCollection();
    // Try by document ID first
    const docRef = doc(col, sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return { ...snap.data(), firestoreId: snap.id };

    // Fallback: query by id field
    const q = query(col, where('id', '==', sessionId), limit(1));
    const result = await getDocs(q);
    if (!result.empty) return { ...result.docs[0].data(), firestoreId: result.docs[0].id };
    return null;
  }

  async deleteSession(sessionId) {
    const col = sessionsCollection();
    const docRef = doc(col, sessionId);
    await deleteDoc(docRef).catch(() => {});
  }

  async getWeeklyStats() {
    const sessions = await this.getAllSessions();
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const recent = sessions.filter((s) => {
      const d = parseISO(s.startTime);
      return d >= weekAgo && d <= now;
    });

    if (recent.length === 0) {
      return { avgDuration: 0, avgScore: 0, totalSessions: 0, totalSnoringEvents: 0, totalTalkingEvents: 0, dailyData: [] };
    }

    const avgDuration = recent.reduce((a, s) => a + s.durationMinutes, 0) / recent.length;
    const avgScore = recent.reduce((a, s) => a + (s.score || 0), 0) / recent.length;
    const totalSnoringEvents = recent.reduce((a, s) => a + s.events.filter((e) => e.type === 'snoring').length, 0);
    const totalTalkingEvents = recent.reduce((a, s) => a + s.events.filter((e) => e.type === 'talking').length, 0);

    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStr = format(day, 'EEE', { locale: de });
      const daySessions = recent.filter((s) => parseISO(s.startTime).toDateString() === day.toDateString());
      const hours = daySessions.length > 0 ? daySessions.reduce((a, s) => a + s.durationMinutes, 0) / 60 : 0;
      dailyData.push({ day: dayStr, hours: Math.round(hours * 10) / 10 });
    }

    return {
      avgDuration: Math.round(avgDuration),
      avgScore: Math.round(avgScore),
      totalSessions: recent.length,
      totalSnoringEvents,
      totalTalkingEvents,
      dailyData,
    };
  }

  async getMonthlyStats() {
    const sessions = await this.getAllSessions();
    const now = new Date();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recent = sessions.filter((s) => {
      const d = parseISO(s.startTime);
      return d >= monthAgo && d <= now;
    });
    return {
      totalSessions: recent.length,
      avgDuration: recent.length > 0 ? Math.round(recent.reduce((a, s) => a + s.durationMinutes, 0) / recent.length) : 0,
      avgScore: recent.length > 0 ? Math.round(recent.reduce((a, s) => a + (s.score || 0), 0) / recent.length) : 0,
      bestScore: recent.length > 0 ? Math.max(...recent.map((s) => s.score || 0)) : 0,
    };
  }

  formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  formatTime(isoString) {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  }

  formatDate(isoString) {
    if (!isoString) return '';
    return format(parseISO(isoString), 'EEEE, dd. MMMM yyyy', { locale: de });
  }

  getQualityLabel(quality) {
    const labels = {
      [SleepQuality.EXCELLENT]: 'Ausgezeichnet',
      [SleepQuality.GOOD]: 'Gut',
      [SleepQuality.FAIR]: 'Mäßig',
      [SleepQuality.POOR]: 'Schlecht',
    };
    return labels[quality] || 'Unbekannt';
  }

  getQualityColor(quality) {
    const colors = {
      [SleepQuality.EXCELLENT]: '#00D2A0',
      [SleepQuality.GOOD]: '#4A9EFF',
      [SleepQuality.FAIR]: '#FFC048',
      [SleepQuality.POOR]: '#FF6B6B',
    };
    return colors[quality] || '#8FA8C2';
  }

  getScoreColor(score) {
    if (score >= 85) return '#00D2A0';
    if (score >= 70) return '#4A9EFF';
    if (score >= 50) return '#FFC048';
    return '#FF6B6B';
  }
}

export default new SleepDataService();
