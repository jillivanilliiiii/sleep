import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────
//  🔧 SETUP: Erstelle ein Firebase-Projekt auf console.firebase.google.com
//  Dann füge deine Konfiguration hier ein (Projekt > Einstellungen > Deine Apps)
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD1C6h1GUdnOHXaBnm339P6Q0ECLvKBxz4",
  authDomain: "sleepapp-47051.firebaseapp.com",
  projectId: "sleepapp-47051",
  storageBucket: "sleepapp-47051.firebasestorage.app",
  messagingSenderId: "155221073785",
  appId: "1:155221073785:web:0ad61d69ac476ba9df19a8",
};

// Singleton – verhindert doppelte Initialisierung bei Hot-Reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;
