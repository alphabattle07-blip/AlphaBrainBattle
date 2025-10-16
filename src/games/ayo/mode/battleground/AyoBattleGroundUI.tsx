// src/games/ayo/modes/AyoBattleUI.tsx
import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { initializeBattleGame, playBattleTurn, AyoBattleState } from "./ayoBattleGroundLogic";
import AyoCoreUI from "../core/AyoCoreUI";
import PlayerProfileCompact from "@/src/screens/profile/PlayerProfileCompact"

interface Props {
  playerRank: number; // check if eligible (1501+)
  mStake: number;     // dynamic stake from player
}

export default function AyoBattleUI({ playerRank, mStake }: Props) {
  const [gameState, setGameState] = useState<AyoBattleState | null>(null);

  const startGame = () => {
    if (playerRank < 1501) {
      Alert.alert("Not Eligible", "You must be Warrior rank (1501+) to play Battle Ground.");
      return;
    }
    setGameState(initializeBattleGame(mStake));
  };

  const handleMove = (pitIndex: number) => {
    if (!gameState || gameState.isFinished) return;
    const newState = playBattleTurn(gameState, pitIndex, "me");
    setGameState(newState);
  };

  const resetGame = () => setGameState(initializeBattleGame(mStake));

  return (
    <View style={styles.container}>
      <PlayerProfileCompact name={""} country={""} rating={0} avatar={""} isOwnProfile={true}/>
      {!gameState ? (
        <View style={styles.lobby}>
          <Text style={styles.title}>⚔️ Battle Ground Mode</Text>
          <Text style={styles.stakeText}>Stake: {mStake} M-coin</Text>
          <Button title="Start Battle" onPress={startGame} />
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <Text style={styles.modeText}>Battle Match (Stake: {mStake} M-coin)</Text>
          <Text style={styles.turnText}>
            {gameState.currentPlayer === "me" ? "Your Turn" : "Opponent's Turn"}
          </Text>

          <AyoCoreUI initialGameState={gameState.game} onPitPress={handleMove} />

          {gameState.isFinished && (
            <View style={styles.resultBox}>
              {gameState.winner === "me" ? (
                <Text style={styles.winText}>🎉 You Win! +{mStake} M-coin</Text>
              ) : (
                <Text style={styles.loseText}>😢 You Lost {mStake} M-coin</Text>
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
