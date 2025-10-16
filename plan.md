# Plan to Fix Game Stats Consistency

This plan outlines the steps to refactor the game statistics handling to ensure data is saved correctly and consistently displayed on the profile screen.

### Part 1: Modify the Backend Communication (`gameStatsThunks.ts`)

The current implementation in `updateGameStatsThunk` is flawed because it fetches the current state, calculates the new state, and then pushes it. This can cause race conditions. The frontend should only send the game's outcome.

1.  **Modify `updateGameStatsThunk`:**
    *   Change the payload to only accept `{ gameId: string; result: 'win' | 'loss' | 'draw'; newRating: number; }`.
    *   Remove the initial `api.fetchGameStats` call.
    *   Call a single API endpoint, `api.updateGameStats`, sending just the result. The backend will be responsible for incrementing the correct field.

2.  **Modify the `updateGameStats` service function in `authService.ts`:**
    *   Ensure this function makes a `PATCH` or `POST` request to an endpoint like `/api/stats/:gameId`.
    *   The body of the request should contain `{ result: 'win' | 'loss' | 'draw', rating: newRating }`.

### Part 2: Centralize State Management (`gameStatsSlice.ts`)

The current slice only stores stats for one game. It should store stats for all games to serve as a proper cache and single source of truth for the application.

1.  **Update `GameStatsState` Interface:**
    *   Change the state shape from `ayoStats: GameStats | null` to `stats: Record<string, GameStats>`. This will store stats indexed by their `gameId`.
    *   `{ stats: { 'ayo': { ... }, 'chess': { ... } } }`

2.  **Update Reducers and Extra Reducers:**
    *   Modify `updateGameStatsThunk.fulfilled` to update the state for the specific game that was played. It should find the game by `action.payload.gameId` and update the corresponding entry in the `stats` object.
    *   Create a new `fetchAllGameStatsThunk` that fetches stats for all games in a single API call.
    *   The `fetchAllGameStatsThunk.fulfilled` reducer should populate the `stats` object with all the fetched game statistics, keyed by `gameId`.

### Part 3: Refactor the Profile Screen (`ProfileScreen.tsx`)

This screen should be simplified to read all its data directly from the centralized Redux store.

1.  **Connect to the New Redux State:**
    *   Use `useAppSelector` to get the entire `stats` object from the `gameStats` slice.
    *   Remove the component-level `useState` for `gameStats` and `gameStatsLoading`. The loading state from the Redux slice should be used instead.

2.  **Simplify Data Fetching:**
    *   In the main `useEffect`, dispatch the new `fetchAllGameStatsThunk` once to load all game stats if they are not already in the store.
    *   Remove the complex `useEffect` hook that loops through `DEFAULT_GAMES` to fetch stats individually.

3.  **Render from Redux State:**
    *   Convert the `stats` object from Redux into an array for rendering (`Object.values(stats)`).
    *   The UI should now reactively update whenever the stats in the Redux store change (e.g., after a game is finished and `updateGameStatsThunk` completes).

### Part 4: Verification

1.  After implementing the changes, manually test the complete flow.
2.  Play a game of Ayo and complete it.
3.  Observe the network tab to ensure only one `PATCH/POST` request is made to update the stats.
4.  Navigate to the profile screen and verify that the "Ayo" stats (wins/losses/draws and rating) have been updated correctly without a manual refresh.
5.  Pull down to refresh on the profile screen and confirm the data persists, verifying it was saved correctly in the backend.
