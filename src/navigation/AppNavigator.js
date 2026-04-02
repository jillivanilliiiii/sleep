import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import SleepTrackerScreen from '../screens/SleepTrackerScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AudioEventsScreen from '../screens/AudioEventsScreen';
import SleepDetailScreen from '../screens/SleepDetailScreen';

const Tab = createBottomTabNavigator();
const HistoryStack = createStackNavigator();

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      <HistoryStack.Screen
        name="HistoryList"
        component={HistoryScreen}
        options={{ title: 'Schlafverlauf' }}
      />
      <HistoryStack.Screen
        name="SleepDetail"
        component={SleepDetailScreen}
        options={{ title: 'Schlafdetails' }}
      />
      <HistoryStack.Screen
        name="AudioEvents"
        component={AudioEventsScreen}
        options={{ title: 'Aufnahmen' }}
      />
    </HistoryStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'moon' : 'moon-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'radio-button-on' : 'radio-button-off';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Übersicht', headerShown: false }}
      />
      <Tab.Screen
        name="Tracker"
        component={SleepTrackerScreen}
        options={{ title: 'Schlaf tracken', headerShown: false }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analysen' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStackNavigator}
        options={{ title: 'Verlauf', headerShown: false }}
      />
    </Tab.Navigator>
  );
}
