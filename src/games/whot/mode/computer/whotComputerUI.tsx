// games/whot/computer/ComputerUI.tsx 

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, GameState } from '../core/types';
import { playCard, pickCard } from "../core/game";


const chooseComputerMove = (state: GameState, playerIndex: number, level: number): Card | null => {
  if (state.players[playerIndex].hand.length > 0) return state.players[playerIndex].hand[0];
  return null;
};
// Level definitions
export const levels = [
 { label: "Apprentice (Easy)", value: 1, rating: 1200, reward: 10 },
 { label: "Knight (Normal)", value: 2, rating: 1400, reward: 15 },
 { label: "Warrior (Hard)", value: 3, rating: 1600, reward: 20 },
 { label: "Master (Expert)", value: 4, rating: 1800, reward: 25 },
 { label: "Alpha (Legend)", value: 5, rating: 2000, reward: 30 },
] as const;

export type ComputerLevel = 1 | 2 | 3 | 4 | 5;

type Props = {
 state: GameState | null;
 playerIndex: number; // index of computer in players[]
 level: ComputerLevel;
 onStateChange: (newState: GameState) => void;
};
const ComputerUI: React.FC<Props> = ({ state, playerIndex, level, onStateChange }) => {
const [lastPlayed, setLastPlayed] = useState<Card | null>(null);

useEffect(() => {
 if (!state || state.currentPlayer !== playerIndex) return;

   // ✅ 4. GET THE RULE VERSION FROM THE GAME STATE
   const ruleVersion = state.ruleVersion;

 // Simulate "thinking delay"
 const timer = setTimeout(() => {
 const move = chooseComputerMove(state, playerIndex, level);
 
   if (move) {
     try {
       // ✅ 5. USE THE REAL playCard AND THE CORRECT RULE
       const newState = playCard(state, playerIndex, move, ruleVersion);
     setLastPlayed(move);
     onStateChange(newState);
     } catch (e) {
       // Handle invalid move (e.g., AI chose a bad card)
       console.error("Computer tried invalid move, picking card:", e.message);
       // ✅ 6. USE THE REAL pickCard (it returns an object)
     const { newState } = pickCard(state, playerIndex);
     setLastPlayed(null);
     onStateChange(newState);
     }
 } else {
  // ✅ 6. USE THE REAL pickCard (it returns an object)
  const { newState } = pickCard(state, playerIndex);
  setLastPlayed(null);
  onStateChange(newState);
 }
 }, 1200); // 1.2s delay for realism

 return () => clearTimeout(timer);
}, [state, playerIndex, level, onStateChange]); // Dependencies are correct
 const levelInfo = levels.find((l) => l.value === level);
  if (!state) {
    return null;
  }
 return (
  <View style={styles.container}>
   <Text style={styles.name}>
    {state.players[playerIndex].name} 🤖
   </Text>
   <Text style={styles.hand}>
    Cards: {state.players[playerIndex].hand.length}
   </Text>
   {lastPlayed && (
    <Text style={styles.played}>
     Last played: {lastPlayed.number} of {lastPlayed.suit}
    </Text>
   )}
   {levelInfo && (
    <Text style={styles.level}>
     {levelInfo.label} • Rating {levelInfo.rating}
    </Text>
   )}
  </View>
 );
};

const styles = StyleSheet.create({
 container: {
  padding: 12,
  backgroundColor: "#222",
  borderRadius: 8,
  alignItems: "center",
  margin: 8,
  opacity: 0.8,
 },
 name: {
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
 },
 hand: {
  color: "#ccc",
  marginTop: 4,
 },
 played: {
  marginTop: 6,
  fontSize: 14,
  color: "yellow",
 },
 level: {
  marginTop: 8,
  fontSize: 13,
  color: "#0ff",
  fontStyle: "italic",
 },
});

export default ComputerUI;