// App.tsx
import React from 'react';
import { Provider } from "react-redux";
import { store, persistor } from "@/src/store";
import { PersistGate } from "redux-persist/integration/react";

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from '@/src/navigation/RootNavigator';
import { WalletProvider } from '@/src/screens/wallet/WalletContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        {/* PersistGate waits until the stored state is retrieved before rendering */}
        <PersistGate loading={null} persistor={persistor}>
          <WalletProvider>
              <RootNavigator />
          </WalletProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}