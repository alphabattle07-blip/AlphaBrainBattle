// src/games/ayo/modes/AyoBattleLogic.ts
import { AyoGameState, initializeGame, makeMove } from "../core/AyoCoreLogic";

export interface AyoBattleState {
  game: AyoGameState;
  mStake: number; // dynamic stake (depends on player)
  rStake: number; // fixed R-50 (runs in background, not shown)
  currentPlayer: "me" | "opponent";
  isFinished: boolean;
  winner: "me" | "opponent" | null;
}

export function initializeBattleGame(mStake: number): AyoBattleState {
  return {
    game: initializeGame(),
    mStake,
    rStake: 50, // background stake
    currentPlayer: "me",
    isFinished: false,
    winner: null,
  };
}

export function playBattleTurn(
  state: AyoBattleState,
  pitIndex: number,
  player: "me" | "opponent"
): AyoBattleState {
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
