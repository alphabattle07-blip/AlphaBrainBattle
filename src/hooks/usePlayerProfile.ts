// src/store/hooks/usePlayerProfile.ts (or your file path)

import { useMemo, useCallback } from 'react'; // Added useCallback
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchGameStatsThunk, updateGameStatsThunk } from '../store/thunks/gameStatsThunks';
import { setGameStats } from '../store/slices/gameStatsSlice';
import { storage } from '../utils/storage';

// Define the types for game IDs for better type safety
export type GameID = 'ayo' | 'whot';

// CHANGED: The hook now accepts a gameId
export const usePlayerProfile = (gameId: GameID) => {
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector((state) => state.user);
  
  // Access the gameStats map from the store
  const { gameStats, loading: statsLoading, error: statsError } = useAppSelector((state) => state.gameStats);
  // Get stats for the specific gameId
  const stats = gameStats[gameId] || null;

  const playerProfile = useMemo(() => {
    // CHANGED: Logic now uses the dynamic gameId
    const gameStatsData = stats || profile?.gameStats?.find(
      (stat: any) => stat.gameId === gameId
    );

    return {
      name: profile?.name ?? 'Player',
      country: profile?.country ?? 'CA',
      avatar: profile?.avatar ?? null,
      // CHANGED: Default rating for whot could be different, but 1000 is a safe start.
      rating: profile?.rating ?? 100,
      wins: gameStatsData?.wins ?? 0,
      losses: gameStatsData?.losses ?? 0,
      draws: gameStatsData?.draws ?? 0,
      isAI: false,
      isLoading: loading || statsLoading,
      error: statsError,
    };
  }, [profile, stats, loading, statsLoading, statsError, gameId]); // Added gameId to dependency array

  // We wrap these functions in useCallback to prevent unnecessary re-renders in components
  const loadGameStats = useCallback(async () => {
    // We only load if we don't already have the stats for the requested game
    if (profile && (!stats || stats.gameId !== gameId) && !statsLoading) {
      try {
        const cachedStats = await storage.loadUserStats(gameId);
        if (cachedStats) {
          dispatch(setGameStats(cachedStats));
        }
        // CHANGED: Fetch stats for the specific game
        dispatch(fetchGameStatsThunk({ gameId }));
      } catch (error) {
        console.error(`Error loading ${gameId} game stats:`, error);
      }
    }
  }, [profile, stats, statsLoading, dispatch, gameId]);

  const updateGameStats = useCallback(async (result: 'win' | 'loss' | 'draw', newRating: number) => {
    if (profile) {
      try {
        // CHANGED: Update stats for the specific game
        dispatch(updateGameStatsThunk({ gameId, result, newRating }));
        // ... (Offline logic remains the same, but now uses the dynamic gameId)
      } catch (error) {
        console.error(`Error updating ${gameId} stats:`, error);
      }
    }
  }, [profile, dispatch, gameId]);

  // Sync logic can remain largely the same as it reads the gameId from the queue
  const syncOfflineOperations = useCallback(async () => {
    // ... no changes needed here if queue items have gameId ...
  }, [dispatch]);

  return { 
    ...playerProfile, 
    loadGameStats, 
    updateGameStats,
    syncOfflineOperations 
  };
};