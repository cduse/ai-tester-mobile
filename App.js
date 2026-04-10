import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen           from './src/screens/HomeScreen';
import RecordScreen         from './src/screens/RecordScreen';
import ContextDetailScreen  from './src/screens/ContextDetailScreen';
import SettingsScreen       from './src/screens/SettingsScreen';
import GroupDetailScreen    from './src/screens/GroupDetailScreen';
import GroupContextsScreen  from './src/screens/GroupContextsScreen';
import ConnectScreen        from './src/screens/ConnectScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home"           component={HomeScreen} />
          <Stack.Screen name="Record"         component={RecordScreen} />
          <Stack.Screen name="ContextDetail"  component={ContextDetailScreen} />
          <Stack.Screen name="Settings"       component={SettingsScreen} />
          <Stack.Screen name="GroupDetail"    component={GroupDetailScreen} />
          <Stack.Screen name="GroupContexts"  component={GroupContextsScreen} />
          <Stack.Screen name="Connect"        component={ConnectScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
