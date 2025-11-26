// src/screens/games/whot/WhotPlayerProfile.tsx
import { getRankFromRating } from '@/src/utils/rank'; // Adjust path if needed
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import CountryFlag from 'react-native-country-flag';

interface Props {
  name: string;
  rating: number;
  country: string; // ISO 3166-1 alpha-2 country code e.g., "NG" for Nigeria
  cardCount: number;
  avatar?: string | null;
  isAI?: boolean;
  isCurrentPlayer?: boolean;
}

const WhotPlayerProfile = ({
  name,
  rating,
  country,
  cardCount,
  avatar,
  isAI = false,
  isCurrentPlayer = false,
}: Props) => {
  const displayName = name.split('..')[0]; // Clean up the name
  const displayAvatar = avatar || `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`;

  const rank = getRankFromRating(rating) || { icon: '🌱', level: 'Unranked' };

  return (
    <View style={[styles.container, isCurrentPlayer && styles.currentPlayerContainer]}>
      {/* --- Avatar with Card Count Badge --- */}
      <View style={[styles.avatarContainer, isCurrentPlayer && styles.currentPlayerAvatar]}>
        <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cardCount}</Text>
        </View>
      </View>

      {/* --- Player Info --- */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{displayName}</Text>
          {isAI && <Ionicons name="hardware-chip-outline" size={16} color="#0ff" style={{ marginLeft: 5 }} />}
        </View>
        <View style={styles.detailsRow}>
          <CountryFlag isoCode={country} size={16} />
          <Text style={styles.detailsText}>
            {` ${rank.icon} ${rank.level} (${rating})`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '45%', // Prevents profile from taking too much space
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'gold',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#A22323',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailsText: {
    color: '#DDD',
    fontSize: 12,
    marginLeft: 4,
  },
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