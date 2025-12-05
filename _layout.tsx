import { Stack } from 'expo-router';
import { store, persistor } from './src/store';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { useEffect, useState } from 'react';
import { loadToken } from './src/store/thunks/authThunks';
import { AppDispatch } from './src/store';
import { useDispatch } from 'react-redux';
import LoadingSpinner from './src/components/LoadingSpinner'; // Import the loading spinner

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(true); // Add a loading state

  useEffect(() => {
    const loadApp = async () => {
      await dispatch(loadToken());
      setIsLoading(false); // Set loading to false after token is loaded
    };
    loadApp();
  }, [dispatch]);

  // While the token is being loaded, show a loading spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { padding: 0, margin: 0 } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(games)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}