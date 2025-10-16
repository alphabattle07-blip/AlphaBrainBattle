import { Stack } from 'expo-router';
import { store, persistor } from './src/store';
import { PersistGate } from 'redux-persist/integration/react';

export default function RootLayout() {
  return (
    <PersistGate loading={null} persistor={persistor}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { padding: 0, margin: 0 } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(games)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
    </PersistGate>
  );
}