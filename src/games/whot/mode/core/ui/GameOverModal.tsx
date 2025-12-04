import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import Animated, { FadeIn, BounceIn, FadeOut } from "react-native-reanimated";
import { Player } from "../types";
import { Ionicons } from '@expo/vector-icons';
import { ComputerLevel } from "../../computer/whotComputerUI";
import { useAppDispatch } from "../../../../../store/hooks";
import { updateGameStatsThunk } from "../../../../../store/thunks/gameStatsThunks";

const levels = [
  { label: "Apprentice (Easy)", value: 1, rating: 1250, reward: 10 },
  { label: "Knight (Normal)", value: 2, rating: 1500, reward: 15 },
  { label: "Warrior (Hard)", value: 3, rating: 1700, reward: 20 },
  { label: "Master (Expert)", value: 4, rating: 1900, reward: 25 },
  { label: "Alpha (Legend)", value: 5, rating: 2100, reward: 30 },
];

const BATTLE_BONUS = 15;

interface GameOverModalProps {
  winner: Player | null;
  onRematch: () => void;
  onNewBattle: () => void;
  visible: boolean;
  level?: ComputerLevel;
  playerName: string;
  opponentName: string;
  playerRating: number;
  result: 'win' | 'loss' | 'draw';
  children?: React.ReactNode;
  onStatsUpdate?: (result: 'win' | 'loss' | 'draw', newRating: number) => void;
}

const GameOverModal = ({
  winner,
  onRematch,
  onNewBattle,
  visible,
  level,
  playerName,
  opponentName,
  playerRating,
  result,
  children,
  onStatsUpdate,
}: GameOverModalProps) => {
  const { width, height } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const isWin = result === 'win';
  const isLoss = result === 'loss';
  const isDraw = result === 'draw';

  // ✅ FIX: Store the calculated results in state so they don't change 
  // even if the parent passes a new playerRating from Redux.
  const [calculatedData, setCalculatedData] = useState<{
    levelReward: number;
    finalRating: number;
    bonus: number;
  } | null>(null);

  // ✅ FIX: Effect to calculate ONCE and Dispatch ONCE
  useEffect(() => {
    // Only run if visible, we have a winner, and we haven't calculated yet.
    if (visible && winner && !calculatedData) {
      
      let reward = 0;
      let totalChange = 0;
      
      if (isWin && level) {
        const levelData = levels.find((l) => l.value === level);
        reward = levelData?.reward ?? 0;
        totalChange = reward + BATTLE_BONUS;
      }
      
      const finalRating = playerRating + totalChange;
      
      // 1. Freeze the data
      setCalculatedData({
        levelReward: reward,
        finalRating: finalRating,
        bonus: isWin ? BATTLE_BONUS : 0,
      });

      // 2. Dispatch update strictly once
      if (isWin) {
        dispatch(
          updateGameStatsThunk({
            gameId: 'whot',
            result: 'win',
            newRating: finalRating,
          })
        );
      }
      
      // 3. Notify parent
      onStatsUpdate?.(result, finalRating);
    }
  }, [visible, winner, isWin, level, playerRating, result, dispatch, onStatsUpdate, calculatedData]);

  // Reset state when modal closes (so next game calculates fresh)
  useEffect(() => {
    if (!visible) {
      setCalculatedData(null);
    }
  }, [visible]);

  if (!visible || !winner || !calculatedData) return null;

  // Use the frozen data for rendering
  const { levelReward, finalRating, bonus } = calculatedData;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={[styles.overlay, { width, height }]}
    >
      <View style={styles.backdrop} />
      <Animated.View entering={BounceIn.delay(100).duration(600)} style={styles.modalContainer}>
        {isWin && <Text style={styles.winText}>You Won!</Text>}
        {isLoss && <Text style={styles.loseText}>You Lost!</Text>}
        {isDraw && <Text style={styles.drawText}>It’s a Draw!</Text>}

        <Text style={styles.winnerText}>
          {isDraw
            ? `${playerName} and ${opponentName} tied`
            : `Winner: ${isWin ? playerName : opponentName}`}
        </Text>

        {children}

        {(isWin || isDraw) && (
          <View style={styles.rewardSection}>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Battle Bonus</Text>
              <Text style={styles.rewardValue}>
                <Ionicons name="diamond" size={16} color="#FFD700" /> +
                {bonus} R-coin
              </Text>
            </View>

            {isWin && (
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Level Reward</Text>
                <Text style={styles.rewardValue}>
                  <Ionicons name="diamond" size={16} color="#FFD700" /> +
                  {levelReward} R-coin
                </Text>
              </View>
            )}

            <View style={styles.rewardRow}>
              <Text style={styles.rewardLabel}>Rapid Rating</Text>
              <Text style={[styles.rewardValue, styles.totalRewardValue]}>
                <Ionicons name="diamond" size={16} color="#FFD700" /> {finalRating}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {onRematch && (
            <TouchableOpacity
              style={[styles.button, styles.rematchButton]}
              onPress={onRematch}
            >
              <Text style={styles.buttonText}>Rematch</Text>
            </TouchableOpacity>
          )}
          {onNewBattle && (
            <TouchableOpacity
              style={[styles.button, styles.newBattleButton]}
              onPress={onNewBattle}
            >
              <Text style={styles.buttonText}>New Battle</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default GameOverModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContainer: {
    backgroundColor: '#333',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  winText: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50' },
  loseText: { fontSize: 32, fontWeight: 'bold', color: '#F44336' },
  drawText: { fontSize: 32, fontWeight: 'bold', color: '#FFD700' },
  winnerText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
    marginVertical: 10,
  },
  rewardSection: {
    width: '100%',
    backgroundColor: '#444',
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rewardLabel: { color: '#E0E0E0', fontSize: 16 },
  rewardValue: { color: '#FFD700', fontSize: 16, fontWeight: '600' },
  totalRewardValue: { fontSize: 18, fontWeight: 'bold' },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  rematchButton: { backgroundColor: '#4A90E2' },
  newBattleButton: { backgroundColor: '#666' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});