// Alpha-Battle/src/screens/game/GameModeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector, } from "react-redux";  // ✅ for reading state
import { RootState } from "@/src/store"; 
import { ToastProvider } from '@/src/hooks/useToast';


// Import game screens
// import { ChessGameScreen } from '../../games/chess/screens/ChessGameScreen';
import AyoIndex from '../../games/ayo/mode/index';
import WhotIndex from "../../games/whot/mode/index";
// import LudoScreen from '../../games/ludo/screens/LudoScreen';
// import DraughtsScreen from '../../games/droughts/screens/DraughtsScreen';
// import CardsScreen from '../../games/cards/screens/CardsScreen';

export default function GameModeScreen() {
  const route = useRoute();
  const { gameId, mode } = route.params as { gameId: string; mode: "computer" | "online" | "battle" };


  const user = useSelector((state: RootState) => state.user); // adjust to your slice
  const auth = useSelector((state: RootState) => state.auth);



  

  const renderGameScreen = () => {
    switch (gameId) {
      // case 'chess':
        case 'whot':
        return <WhotIndex mode={mode} />;
      //   return <ChessGameScreen />;
      case 'ayo':
        return <AyoIndex mode={mode} />;
      // Add cases for other games here

      // case 'ludo':
      //   return <LudoScreen mode={mode} />;
      // case 'droughts':
      //   return <DraughtsScreen mode={mode} />;
      // case 'cards':
      //   return <CardsScreen mode={mode} />;
      default:
        return (
          <View style={styles.container}>
            <Text style={styles.text}>Game not found: {gameId}</Text>
          </View>
        );
    }
  };

  return (
    <ToastProvider>
    <View style={{ flex: 1, backgroundColor: "#0b1f3a" }}>
 

      
      {renderGameScreen()}

    </View>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b1f3a",
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
  userInfo: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 8,
  },
  authInfo: {
    color: "lightgray",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
});
