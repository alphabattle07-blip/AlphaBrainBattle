import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import {
  createOnlineGame,
  joinOnlineGame,
  fetchAvailableGames,
  updateOnlineGameState,
  fetchGameState
} from '@/src/store/thunks/onlineGameThunks';
import { clearCurrentGame, setCurrentGame } from '@/src/store/slices/onlineGameSlice';
import { usePlayerProfile } from '@/src/hooks/usePlayerProfile';
import { AyoGame } from "../core/AyoCoreUI";
import { calculateMoveResult } from "../core/AyoCoreLogic";
import AyoGameOver from "../computer/AyoGameOver";

const AyoOnlineUI = () => {
  const dispatch = useAppDispatch();
  const { currentGame, availableGames, isLoading, error } = useAppSelector(state => state.onlineGame);
  const { profile: userProfile } = useAppSelector(state => state.user);
  const playerProfile = usePlayerProfile('ayo');
  const [animationPaths, setAnimationPaths] = useState<number[][]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ player: 1 | 2; pit: number } | null>(null);

  // Fetch available games on mount
  useEffect(() => {
    dispatch(fetchAvailableGames());
  }, [dispatch]);

  // Handle game state updates from server
  useEffect(() => {
    if (currentGame?.id) {
      const interval = setInterval(() => {
        dispatch(fetchGameState(currentGame.id));
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [currentGame?.id, dispatch]);

  const handleCreateGame = async () => {
    try {
      await dispatch(createOnlineGame('ayo')).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
    }
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      await dispatch(joinOnlineGame(gameId)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to join game');
    }
  };

  const handleMove = async (pitIndex: number) => {
    if (!currentGame || isAnimating || currentGame.currentTurn !== userProfile?.id) return;

    const moveResult = calculateMoveResult({ board: currentGame.board, scores: { 1: 0, 2: 0 }, currentPlayer: 1, isGameOver: false, timerState: { player1Time: 600, player2Time: 600, isRunning: false, lastActivePlayer: 1 } }, pitIndex);
    if (moveResult.animationPaths.length > 0) {
      setIsAnimating(true);
      setPendingMove({ player: currentGame.currentTurn === currentGame.player1.id ? 1 : 2, pit: pitIndex });
      setAnimationPaths(moveResult.animationPaths);
    } else {
      // Update game state immediately
      const newBoard = moveResult.nextState.board;
      const nextTurn = currentGame.currentTurn === currentGame.player1.id ? currentGame.player2?.id : currentGame.player1.id;

      try {
        await dispatch(updateOnlineGameState({
          gameId: currentGame.id,
          updates: {
            board: newBoard,
            currentTurn: nextTurn || currentGame.currentTurn
          }
        })).unwrap();
      } catch (error) {
        Alert.alert('Error', 'Failed to make move');
      }
    }
  };

  const onAnimationDone = async () => {
    if (pendingMove && currentGame) {
      const moveResult = calculateMoveResult({ board: currentGame.board, scores: { 1: 0, 2: 0 }, currentPlayer: 1, isGameOver: false, timerState: { player1Time: 600, player2Time: 600, isRunning: false, lastActivePlayer: 1 } }, pendingMove.pit);
      const newBoard = moveResult.nextState.board;
      const nextTurn = currentGame.currentTurn === currentGame.player1.id ? currentGame.player2?.id : currentGame.player1.id;

      try {
        await dispatch(updateOnlineGameState({
          gameId: currentGame.id,
          updates: {
            board: newBoard,
            currentTurn: nextTurn || currentGame.currentTurn
          }
        })).unwrap();
      } catch (error) {
        Alert.alert('Error', 'Failed to make move');
      }
    }
    setIsAnimating(false);
    setPendingMove(null);
    setAnimationPaths([]);
  };

  const handleRematch = () => {
    dispatch(clearCurrentGame());
    handleCreateGame();
  };

  const handleNewGame = () => {
    dispatch(clearCurrentGame());
  };

  const opponent = useMemo(() => {
    if (!currentGame) return null;

    const isPlayer1 = currentGame.player1.id === userProfile?.id;
    const opponentPlayer = isPlayer1 ? currentGame.player2 : currentGame.player1;

    if (!opponentPlayer) return null;

    return {
      name: opponentPlayer.name,
      country: "NG", // Default country, could be extended
      rating: opponentPlayer.rating,
      isAI: false,
    };
  }, [currentGame, userProfile?.id]);

  const isGameOver = currentGame?.status === 'COMPLETED';
  const isPlayerWinner = currentGame?.winnerId === userProfile?.id;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => dispatch(fetchAvailableGames())}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentGame) {
    return (
      <View style={styles.container}>
        <AyoGame
          initialGameState={{ board: currentGame.board, scores: { 1: 0, 2: 0 }, currentPlayer: 1, isGameOver: false, timerState: { player1Time: 600, player2Time: 600, isRunning: false, lastActivePlayer: 1 } }}
          onPitPress={handleMove}
          opponent={opponent || { name: 'Opponent', country: 'NG', rating: 1000, isAI: false }}
          player={playerProfile}
          level={1} // Online games don't have difficulty levels
        />

        {isGameOver && (
          <AyoGameOver
            result={isPlayerWinner ? "win" : "loss"}
            level={1}
            onRematch={handleRematch}
            onNewBattle={handleNewGame}
            playerName={playerProfile.name}
            opponentName={opponent?.name || 'Opponent'}
            playerRating={playerProfile.rating}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Online Ayo Games</Text>

      <TouchableOpacity style={styles.createButton} onPress={handleCreateGame}>
        <Text style={styles.createButtonText}>Create New Game</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Available Games:</Text>
      {availableGames.length === 0 ? (
        <Text style={styles.noGamesText}>No games available. Create one to start playing!</Text>
      ) : (
        availableGames.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameItem}
            onPress={() => handleJoinGame(game.id)}
          >
            <Text style={styles.gameText}>
              {game.player1.name} ({game.player1.rating}) - Waiting for opponent
            </Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#222',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameItem: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  gameText: {
    color: 'white',
    fontSize: 16,
  },
  noGamesText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryText: {
    color: 'white',
    fontSize: 16,
  },
});

export default AyoOnlineUI;
