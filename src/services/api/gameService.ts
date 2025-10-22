import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

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
}

class GameService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/api/games`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async createGame(gameType: string): Promise<Game> {
    const response = await this.api.post('', { gameType });
    return response.data.game;
  }

  async joinGame(gameId: string): Promise<Game> {
    const response = await this.api.post(`/${gameId}/join`);
    return response.data.game;
  }

  async getAvailableGames(): Promise<Game[]> {
    const response = await this.api.get('/available');
    return response.data.games;
  }

  async getGame(gameId: string): Promise<Game> {
    const response = await this.api.get(`/${gameId}`);
    return response.data.game;
  }

  async updateGameState(
    gameId: string,
    updates: {
      board?: any;
      currentTurn?: string;
      winnerId?: string;
      status?: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    }
  ): Promise<Game> {
    const response = await this.api.put(`/${gameId}`, updates);
    return response.data.game;
  }
}

export const gameService = new GameService();
