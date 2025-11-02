// games/whot/computer/ComputerUI.tsx 

import React, { memo } from "react"; // ✅ Make sure memo is imported
import { View, Text, StyleSheet } from "react-native";

// Level definitions
export const levels = [
  { label: "Apprentice (Easy)", value: 1, rating: 1200, reward: 10 },
  { label: "Knight (Normal)", value: 2, rating: 1400, reward: 15 },
  { label: "Warrior (Hard)", value: 3, rating: 1600, reward: 20 },
  { label: "Master (Expert)", value: 4, rating: 1800, reward: 25 },
  { label: "Alpha (Legend)", value: 5, rating: 2000, reward: 30 },
] as const;

export type ComputerLevel = 1 | 2 | 3 | 4 | 5;

// ✅ DEFINE the new prop shape
type ComputerState = {
  name: string;
  handLength: number;
  isCurrentPlayer: boolean;
};

type Props = {
  computerState: ComputerState | null; // ✅ USE this prop
  level: ComputerLevel;
};

// Component definition
const ComputerUI: React.FC<Props> = ({ computerState, level }) => {
  // console.log("LOG: 🔵 ComputerUI re-rendered."); // You can remove this log now
  const levelInfo = levels.find((l) => l.value === level);

  if (!computerState) { // ✅ CHECK new prop
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        {computerState.name} 🤖 {/* ✅ USE new prop */}
      </Text>
      <Text style={styles.hand}>
        Cards: {computerState.handLength} {/* ✅ USE new prop */}
      </Text>

      {levelInfo && (
        <Text style={styles.level}>
          {levelInfo.label} • Rating {levelInfo.rating}
        </Text>
      )}
      {computerState.isCurrentPlayer && ( 
        <Text style={styles.thinking}>Thinking...</Text>
      )}
    </View>
  );
};

export default memo(ComputerUI);

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
  thinking: { // Style for the thinking text
    marginTop: 4,
    color: "yellow",
    fontStyle: "italic",
  },
});

// ✅ MAKE SURE this is the export
