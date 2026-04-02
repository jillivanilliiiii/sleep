import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import AuthService from '../services/AuthService';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Fehler', 'Bitte deinen Namen eingeben.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await AuthService.register(email.trim(), password, name.trim());
      } else {
        await AuthService.login(email.trim(), password);
      }
      // Navigation passiert automatisch über onAuthStateChanged in App.js
    } catch (e) {
      const messages = {
        'auth/email-already-in-use': 'Diese E-Mail wird bereits verwendet.',
        'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
        'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
        'auth/wrong-password': 'Falsches Passwort.',
        'auth/too-many-requests': 'Zu viele Versuche. Bitte warte kurz.',
        'auth/network-request-failed': 'Keine Internetverbindung.',
      };
      Alert.alert('Fehler', messages[e.code] || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Ionicons name="moon" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>SleepTracker</Text>
          <Text style={styles.tagline}>Dein persönlicher Schlafanalyst</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                Anmelden
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                Registrieren
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name field (register only) */}
          {mode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Dein Name"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-Mail</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="deine@email.de"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passwort</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <>
                <Ionicons
                  name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
                  size={20}
                  color={Colors.background}
                />
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Features hint */}
        <View style={styles.features}>
          {[
            { icon: 'cloud-outline', text: 'Schlafdata sicher in der Cloud' },
            { icon: 'mic-outline', text: 'Schnarchen & Reden erkennen' },
            { icon: 'bar-chart-outline', text: 'Detaillierte Analysen & Trends' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon} size={16} color={Colors.primary} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  logo: { alignItems: 'center', marginBottom: 36 },
  logoIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: { fontSize: 28, fontWeight: 'bold', color: Colors.textPrimary },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  modeBtnTextActive: { color: Colors.background },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.background },

  features: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: Colors.textSecondary },
});
