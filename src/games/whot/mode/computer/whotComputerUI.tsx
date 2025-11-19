import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

// Level definitions (kept the same)
export const levels = [
  { label: "Apprentice", value: 1, rating: 1200, reward: 10 },
  { label: "Knight", value: 2, rating: 1400, reward: 15 },
  { label: "Warrior", value: 3, rating: 1600, reward: 20 },
  { label: "Master", value: 4, rating: 1800, reward: 25 },
  { label: "Alpha", value: 5, rating: 2000, reward: 30 },
] as const;

export type ComputerLevel = 1 | 2 | 3 | 4 | 5;

type ComputerState = {
  name: string;
  handLength: number;
  isCurrentPlayer: boolean;
};

type Props = {
  computerState: ComputerState | null;
  level: ComputerLevel;
};

// You can replace this URI with require('../../../assets/computer_avatar.png')
const AVATAR_URI = require("../../../../assets/images/826118.png");

const ComputerUI: React.FC<Props> = ({ computerState, level }) => {
  const levelInfo = levels.find((l) => l.value === level);

  if (!computerState) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Top Section: Level Name & Rating */}
      {levelInfo && (
        <View style={styles.headerRow}>
          <Text style={styles.levelLabel}>
             AI {levelInfo.label}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {levelInfo.rating}</Text>
          </View>
        </View>
      )}

      {/* Middle Section: Avatar + Card Count Badge */}
      <View style={styles.profileWrapper}>
        <View style={styles.avatarContainer}>
            <Image 
                source={AVATAR_URI}
                style={styles.avatar} 
                resizeMode="cover"
            />
        </View>
        
        {/* The Badge (Card Count) */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{computerState.handLength}</Text>
        </View>
      </View>

      {/* Bottom Section: Thinking Status */}
      {computerState.isCurrentPlayer ? (
        <Text style={styles.thinking}>Thinking...</Text>
      ) : (
        // Placeholder to keep height stable when not thinking
        <Text style={styles.idle}>Waiting...</Text> 
      )}
    </View>
  );
};

export default memo(ComputerUI);

const styles = StyleSheet.create({
  container: {
    marginRight: "76%",
    top: -15,
  },
  headerRow: {
    marginBottom: 2,
    gap: 2, // Spacing between Name and Rating
  },
  levelLabel: {
    color: "#FFF",
    fontWeight: "900", // Extra Bold
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  ratingContainer: {
    backgroundColor: "#FFD700", // Gold background for rating
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 4,
    width: 60,
    marginLeft: 10
    
    
  },
  ratingText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  
  // Profile & Badge Logic
  profileWrapper: {
    position: "relative", // Needed for absolute positioning of the badge
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: "#fff", // White ring around avatar
    overflow: "hidden",
    backgroundColor: "#ccc",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0, // "By the side"
    backgroundColor: "#8B0000", // Dark Red/Brown like the image
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 8, // Rounded rectangle
    minWidth: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    elevation: 5, // Shadow to make it pop
    zIndex: 2,
  },
  badgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Status Text
  thinking: {
    marginTop: 2,
    color: "#FFD700", // Gold/Yellow
    fontWeight: "bold",
    fontStyle: "italic",
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowRadius: 4,
  },
  idle: {
    marginTop: -2,
    color: "transparent", // Invisible but keeps layout height
    fontSize: 14,
    marginLeft: 10,
  },
});