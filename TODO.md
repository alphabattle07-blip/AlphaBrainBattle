# TODO: Fix State Synchronization Issue in ProfileScreen

## Steps to Complete

1. **Refactor gameStatsSlice.ts**
   - Change state structure from hardcoded `ayoStats` to a map `gameStats: Record<string, GameStats>` to support multiple games.
   - Update reducers and extraReducers to handle dynamic game IDs.

2. **Update ProfileScreen.tsx**
   - Remove local state for `gameStats` and `gameStatsLoading`.
   - Use `useAppSelector` to subscribe to Redux store data for game stats.
   - Remove independent fetch logic and rely on store state for real-time updates.

3. **Modify GameStatsThunks.ts**
   - Ensure thunks update the store for any `gameId`, not just 'ayo'.
   - Update `fetchAllGameStatsThunk` to populate the new map structure.

4. **Verify Real-Time Updates**
   - Test that ProfileScreen reflects changes immediately after game completion without requiring logout/login.

## Progress Tracking
- [x] Step 1: Refactor gameStatsSlice.ts
- [x] Step 2: Update usePlayerProfile.ts to use new store structure
- [ ] Step 3: Update ProfileScreen.tsx
- [ ] Step 4: Modify GameStatsThunks.ts
- [ ] Step 5: Verify Real-Time Updates
