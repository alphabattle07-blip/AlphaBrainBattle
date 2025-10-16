// src/games/ayo/modes/AyoOnlineUI.tsx
import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { initializeOnlineGame, playOnlineTurn, AyoOnlineState } from "./AyoOnlineLogic";
import AyoCoreUI from "../core/AyoCoreUI";

export default function AyoOnlineUI() {
  const [gameState, setGameState] = useState<AyoOnlineState | null>(null);

  const startGame = () => {
    setGameState(initializeOnlineGame());
  };

  const handleMove = (pitIndex: number) => {
    if (!gameState || gameState.isFinished) return;
    const newState = playOnlineTurn(gameState, pitIndex, "me");
    setGameState(newState);
  };

  const resetGame = () => setGameState(initializeOnlineGame());

  return (
    <View style={styles.container}>
      {!gameState ? (
        <View style={styles.lobby}>
          <Text style={styles.title}>Online Mode</Text>
          <Text style={styles.stakeText}>Stake: R-50</Text>
          <Button title="Find Match" onPress={startGame} />
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <Text style={styles.modeText}>Online Match (Stake: R-50)</Text>
          <Text style={styles.turnText}>
            {gameState.currentPlayer === "me" ? "Your Turn" : "Opponent's Turn"}
          </Text>

          <AyoCoreUI game={gameState.game} onPitPress={handleMove} />

          {gameState.isFinished && (
            <View style={styles.resultBox}>
              {gameState.winner === "me" ? (
                <Text style={styles.winText}>🎉 You Win! +R-50</Text>
              ) : (
                <Text style={styles.loseText}>😢 You Lost R-50</Text>
              )}
              <Button title="Play Again" onPress={resetGame} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  stakeText: { fontSize: 18, marginBottom: 20, textAlign: "center" },
  lobby: { alignItems: "center" },
  gameContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modeText: { fontSize: 18, marginBottom: 5 },
  turnText: { fontSize: 16, marginBottom: 10 },
  resultBox: { marginTop: 20, alignItems: "center" },
  winText: { fontSize: 20, fontWeight: "bold", color: "green", marginBottom: 10 },
  loseText: { fontSize: 20, fontWeight: "bold", color: "red", marginBottom: 10 },
});
