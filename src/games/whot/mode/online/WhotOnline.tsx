import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import {
  createOnlineGame,
  joinOnlineGame,
  fetchAvailableGames,
  updateOnlineGameState,
  fetchGameState
} from '@/src/store/thunks/onlineGameThunks';
import { clearCurrentGame, setCurrentGame } from '@/src/store/slices/onlineGameSlice';
import { Ionicons } from '@expo/vector-icons';
import { matchmakingService } from '@/src/services/api/matchmakingService';

const WhotOnlineUI = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { currentGame, availableGames, isLoading, error } = useAppSelector(state => state.onlineGame);
  const { profile: userProfile } = useAppSelector(state => state.user);
  const { isAuthenticated, token } = useAppSelector(state => state.auth);

  // Matchmaking State
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingMessage, setMatchmakingMessage] = useState('Finding match...');
  const matchmakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedMatchmaking = useRef(false);

  // --- Automatic Matchmaking ---
  useEffect(() => {
    // Check if user is authenticated before starting matchmaking
    if (!isAuthenticated || !token || !userProfile?.id) {
      console.log('User not authenticated, redirecting back', { isAuthenticated, hasToken: !!token, hasProfile: !!userProfile?.id });
      Alert.alert(
        'Authentication Required',
        'Please log in to play online.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      return;
    }

    // Prevent duplicate matchmaking calls
    if (hasStartedMatchmaking.current) {
      console.log('Matchmaking already started, skipping');
      return;
    }

    // Start matchmaking automatically when component mounts (if no current game)
    if (!currentGame) {
      hasStartedMatchmaking.current = true;
      startAutomaticMatchmaking();
    }

    return () => {
      // Cleanup: cancel matchmaking when component unmounts
      if (matchmakingIntervalRef.current) {
        clearInterval(matchmakingIntervalRef.current);
      }
      if (isMatchmaking) {
        matchmakingService.cancelMatchmaking().catch(console.error);
      }
      hasStartedMatchmaking.current = false;
    };
  }, []);

  // Handle Game Polling
  useEffect(() => {
    if (currentGame?.id) {
      const interval = setInterval(() => {
        dispatch(fetchGameState(currentGame.id));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [currentGame?.id, dispatch]);

  // --- Matchmaking Handlers ---

  const startAutomaticMatchmaking = async () => {
    try {
      setIsMatchmaking(true);
      setMatchmakingMessage('Finding match...');

      const response = await matchmakingService.startMatchmaking('whot');

      if (response.matched && response.game) {
        // Match found immediately!
        setIsMatchmaking(false);
        // Update Redux store with the matched game
        dispatch(setCurrentGame(response.game));
        console.log('Match found!', response.game);
      } else {
        // No immediate match, start polling
        setMatchmakingMessage(response.message);
        startMatchmakingPolling();
      }
    } catch (error: any) {
      console.error('Failed to start matchmaking:', error);
      setIsMatchmaking(false);

      // Handle authentication errors
      const errorMessage = error.message || 'Failed to start matchmaking. Please try again.';

      if (errorMessage.includes('Session expired') || errorMessage.includes('Not authenticated')) {
        Alert.alert(
          'Authentication Required',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
        navigation.goBack();
      }
    }
  };

  const startMatchmakingPolling = () => {
    // Poll every 2 seconds for match status
    matchmakingIntervalRef.current = setInterval(async () => {
      try {
        const response = await matchmakingService.checkMatchmakingStatus('whot');

        if (response.matched && response.game) {
          // Match found!
          if (matchmakingIntervalRef.current) {
            clearInterval(matchmakingIntervalRef.current);
          }
          setIsMatchmaking(false);

          // Set the game in Redux store
          dispatch(setCurrentGame(response.game));
          console.log('Match found during polling!', response.game);
        } else if (response.inQueue) {
          setMatchmakingMessage(response.message || 'Searching for opponent...');
        } else {
          // Not in queue anymore (cancelled or error)
          if (matchmakingIntervalRef.current) {
            clearInterval(matchmakingIntervalRef.current);
          }
          setIsMatchmaking(false);
        }
      } catch (error) {
        console.error('Matchmaking polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleCancelMatchmaking = async () => {
    try {
      if (matchmakingIntervalRef.current) {
        clearInterval(matchmakingIntervalRef.current);
      }
      await matchmakingService.cancelMatchmaking();
      setIsMatchmaking(false);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to cancel matchmaking:', error);
      setIsMatchmaking(false);
      navigation.goBack();
    }
  };

  const handleExit = () => {
    dispatch(clearCurrentGame());
    navigation.goBack();
  };

  // --- Render Helpers ---

  const renderGame = () => {
    if (!currentGame) return null;

    const opponent = currentGame.player1?.id === userProfile?.id ? currentGame.player2 : currentGame.player1;

    // If waiting for opponent
    if (!opponent) {
      return (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.waitingTitle}>Waiting for Opponent...</Text>
          <Text style={styles.waitingSub}>Your game is visible in the lobby.</Text>
          <Text style={styles.waitingGameId}>Game ID: {currentGame.id.slice(0, 6).toUpperCase()}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleExit}>
            <Text style={styles.cancelText}>Cancel Game</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Game is ready - show game interface
    return (
      <View style={styles.gameContainer}>
        <View style={styles.gameHeader}>
          <TouchableOpacity onPress={handleExit} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.gameTitle}>Whot Online</Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.playerCard}>
            <Text style={styles.playerLabel}>Opponent</Text>
            <Text style={styles.playerName}>{opponent.name}</Text>
            <Text style={styles.playerRating}>Rating: {opponent.rating}</Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.playerCard}>
            <Text style={styles.playerLabel}>You</Text>
            <Text style={styles.playerName}>{userProfile?.displayName || userProfile?.name || 'You'}</Text>
            <Text style={styles.playerRating}>Rating: {userProfile?.rating || 1200}</Text>
          </View>
        </View>

        <View style={styles.gameBoard}>
          <Text style={styles.gameBoardText}>Whot Game Board</Text>
          <Text style={styles.comingSoonText}>Game interface coming soon...</Text>
          <Text style={styles.infoText}>
            The matchmaking is working! The actual Whot game board will be integrated here.
          </Text>
        </View>

        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Exit Game</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show matchmaking screen while searching
  if (isMatchmaking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.matchmakingContainer}>
          <View style={styles.matchmakingContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.matchmakingTitle}>{matchmakingMessage}</Text>
            <Text style={styles.matchmakingSub}>
              Pairing you with the closest available rating...
            </Text>
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <Text style={styles.ratingValue}>{userProfile?.rating || 1200}</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelMatchmakingButton}
              onPress={handleCancelMatchmaking}
            >
              <Text style={styles.cancelMatchmakingText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !currentGame) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Connecting to Arena...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {currentGame ? renderGame() : (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
  },

  // Matchmaking Styles
  matchmakingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  matchmakingContent: {
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 40,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  matchmakingTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  matchmakingSub: {
    color: '#aaa',
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  ratingInfo: {
    marginTop: 30,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  ratingLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratingValue: {
    color: '#FFD700',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 5,
  },
  cancelMatchmakingButton: {
    marginTop: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
    width: '100%',
  },
  cancelMatchmakingText: {
    color: '#ef5350',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },

  // Waiting Container
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  waitingSub: {
    color: '#ccc',
    marginTop: 10,
    fontSize: 16,
  },
  waitingGameId: {
    color: '#444',
    marginTop: 30,
    fontFamily: 'monospace',
  },
  cancelButton: {
    marginTop: 50,
    padding: 15,
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
  },
  cancelText: {
    color: '#ef5350',
  },

  // Game Container
  gameContainer: {
    flex: 1,
    padding: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  gameTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  playerCard: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  playerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  playerRating: {
    color: '#FFD700',
    fontSize: 14,
  },
  vsContainer: {
    marginHorizontal: 15,
  },
  vsText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameBoard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameBoardText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  comingSoonText: {
    color: '#4CAF50',
    fontSize: 18,
    marginBottom: 15,
  },
  infoText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  exitButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WhotOnlineUI;
