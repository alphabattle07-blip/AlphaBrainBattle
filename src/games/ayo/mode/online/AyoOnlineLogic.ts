// src/games/ayo/modes/AyoOnlineLogic.ts
import { AyoGameState, initializeGame, makeMove } from "../core/AyoCoreLogic";

export interface AyoOnlineState {
  game: AyoGameState;
  stake: number;
  currentPlayer: "me" | "opponent";
  isFinished: boolean;
  winner: "me" | "opponent" | null;
}

export function initializeOnlineGame(): AyoOnlineState {
  return {
    game: initializeGame(),
    stake: 50, // R-50 stake
    currentPlayer: "me",
    isFinished: false,
    winner: null,
  };
}

export function playOnlineTurn(
  state: AyoOnlineState,
  pitIndex: number,
  player: "me" | "opponent"
): AyoOnlineState {
  if (state.isFinished || state.currentPlayer !== player) return state;

  const newGame = makeMove(state.game, pitIndex);
  let winner: "me" | "opponent" | null = null;
  let isFinished = false;

  // Example end condition
  if (Math.random() < 0.1) {
    isFinished = true;
    winner = player;
  }

  return {
    ...state,
    game: newGame,
    currentPlayer: player === "me" ? "opponent" : "me",
    isFinished,
    winner,
  };
}
