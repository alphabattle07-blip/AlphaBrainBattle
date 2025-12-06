// src/store/thunks/authThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../services/api/authService';
import * as SecureStore from 'expo-secure-store';
import { setToken } from '../slices/authSlice';
import { RootState } from '../index'; // Import RootState

// Thunk for user sign-in
export const signInUser = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.signIn(email, password);
      await SecureStore.setItemAsync('token', response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ✅ --- ADD THIS NEW THUNK ---
export const signUpUser = createAsyncThunk(
  'auth/signUp',
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.signUp(name, email, password);
      await SecureStore.setItemAsync('token', response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
// -----------------------------

export const loadToken = createAsyncThunk('auth/loadToken', async (_, { dispatch }) => {
  try {
    const token = await SecureStore.getItemAsync('token');

    if (token) {
      // 1. Optimistically set the token so the app knows we might be logged in
      dispatch(setToken(token));

      // 2. Attempt to fetch the user profile to validate the token
      // .unwrap() allows us to catch the error if the thunk is rejected
      await dispatch(fetchUserProfile(undefined)).unwrap();
    }
  } catch (error: any) {
    console.log('Token invalid or expired during load:', error);

    // 3. CRITICAL FIX: If fetching profile fails, the token is bad.
    // Clear it and force logout immediately.
    await SecureStore.deleteItemAsync('token');
    // dispatch(logout()); // Commented out as logout is not imported
  }
});

// Thunk for fetching the user profile
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string | undefined, { getState, rejectWithValue }) => {
    try {
      const token = (getState() as RootState).auth.token;
      if (!token) {
        return rejectWithValue('No token found');
      }
      const profile = await api.getProfile(token, userId);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserProfileAndGameStatsThunk = createAsyncThunk(
  'user/updateProfileAndGameStats',
  async (
    { gameId, updatedStats }: { gameId: string; updatedStats: { wins: number; losses: number; draws: number; rating: number; overallRating: number } },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = (getState() as RootState).auth.token;
      if (!token) {
        return rejectWithValue('No token found');
      }
      const updatedUser = await api.updateUserProfileAndGameStats(token, gameId, updatedStats);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);