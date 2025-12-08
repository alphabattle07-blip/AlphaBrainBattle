// src/screens/games/whot/WhotPlayerProfile.tsx
import { getRankFromRating } from '@/src/utils/rank'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';


interface Props {
  name: string;
  rating: number;
  cardCount: number;
  avatar?: string | null;
  isAI?: boolean;
  isCurrentPlayer?: boolean;
  showCardCount?: boolean;
}

const WhotPlayerProfile = ({
  name,
  rating,
  cardCount,
  avatar,
  isAI = false,
  isCurrentPlayer = false,
  showCardCount = true,
}: Props) => {
  const displayName = name.split('..')[0]; // Clean up the name
  const displayAvatar = avatar || `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`;

  const rank = getRankFromRating(rating) || { icon: '🌱', level: 'Unranked' };

  return (
    <View style={[styles.container, isCurrentPlayer && styles.currentPlayerContainer]}>
      {/* Top Section: Player Name */}
      <View style={styles.headerRow}>
        <Text style={styles.playerName}>
          {displayName}
        </Text>
        {isAI && <Ionicons name="hardware-chip-outline" size={16} color="#0ff" style={{ marginLeft: 5 }} />}
      </View>

      {/* Middle Section: Avatar + Card Count Badge */}
      <View style={styles.profileWrapper}>
        <View style={[styles.avatarContainer, isCurrentPlayer && styles.currentPlayerAvatar]}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} />
        </View>

        {/* The Badge (Card Count) */}
        {showCardCount && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cardCount}</Text>
          </View>
        )}
      </View>

      {/* Rating Section: Rating Icon + Rating Name (row) + Rating Number */}
      <View style={styles.ratingSection}>
        <View style={styles.ratingNameRow}>
          <Text style={styles.ratingIcon}>
            {rank.icon}
          </Text>
          <Text style={styles.ratingName}>
            {rank.level}
          </Text>
        </View>
        <Text style={styles.ratingNumber}>
          {rating}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: "73%",
    top: -150,
  },
  headerRow: {
    marginBottom: 2,
    gap: 2, // Spacing between Name and Rating
  },
  playerName: {
    color: "#FFF",
    fontWeight: "900", // Extra Bold
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
    marginLeft: 15,

  },

  // Profile & Badge Logic
  profileWrapper: {
    position: "relative", // Needed for absolute positioning of the badge
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    top: -4,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#fff", // White ring around avatar
    overflow: "hidden",
    backgroundColor: "#ccc",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    top: -7,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 1,
    right: 8, // "By the side"
    backgroundColor: "#8B0000", // Dark Red/Brown like the image
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 6, // Rounded rectangle
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    elevation: 5, // Shadow to make it pop
    zIndex: 2,
  },
  badgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },

  // Rating Section
  ratingSection: {
    alignItems: 'center',
    marginTop: 2,
  },
  ratingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Small spacing between icon and name
    top: -22,
  },
  ratingIcon: {
    color: "#FFD700", // Gold
    fontSize: 18,
    fontWeight: "bold",
  },
  ratingName: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  ratingNumber: {
    color: "#FFD700", // Gold
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 1,
    top: -22,
  },

  // Current Player Styles
  currentPlayerContainer: {
    // Add a subtle background or border to indicate the current player
  },
  currentPlayerAvatar: {
    borderColor: '#FFD700', // A gold border for the current player
    shadowColor: "#FFD700",
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
});

export default WhotPlayerProfile;