import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Game {
  id: string;
  gameType: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  player1: {
    id: string;
    name: string;
    rating: number;
  };
  player2: {
    id: string;
    name: string;
    rating: number;
  } | null;
  board: any;
  currentTurn: string;
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export const gameService = {
  // Create a new game
  createGame: async (gameType: string): Promise<Game> => {
    const response = await api.post('/games', { gameType });
    return response.data.game;
  },

  // Join an existing game
  joinGame: async (gameId: string): Promise<Game> => {
    const response = await api.post(`/games/${gameId}/join`);
    return response.data.game;
  },

  // Get available games
  getAvailableGames: async (): Promise<Game[]> => {
    const response = await api.get('/games/available');
    return response.data.games;
  },

  // Get specific game
  getGame: async (gameId: string): Promise<Game> => {
    const response = await api.get(`/games/${gameId}`);
    return response.data.game;
  },

  // Update game state
  updateGameState: async (
    gameId: string,
    updates: {
      board?: any;
      currentTurn?: string;
      winnerId?: string;
      status?: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    }
  ): Promise<Game> => {
    const response = await api.put(`/games/${gameId}`, updates);
    return response.data.game;
  }
};
