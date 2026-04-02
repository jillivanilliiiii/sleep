import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import AuthService from './src/services/AuthService';
import { Colors } from './src/theme/colors';

const navTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.accent,
  },
};

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((u) => setUser(u));
    return unsubscribe;
  }, []);

  // Still initializing Firebase Auth
  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        {user ? (
          <NavigationContainer theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
        ) : (
          <AuthScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
