// types.ts

export type CardSuit =
  | "circle"
  | "triangle"
  | "cross"
  | "square"
  | "star"
  | "whot";

/**
 * Represents a single playing card.
 */
export interface Card {
  id: string; // A unique ID, e.g., "circle-1"
  suit: CardSuit; // The suit of the card
  number: number; // The number on the card (WHOT is 20)
  rank: string; // A unique rank for sorting/display, e.g., "whot-1"
}

/**
 * Represents a player in the game.
 */
export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

/**
 * Defines what action the game is currently waiting for.
 * This is the "brain" of the sequential game logic.
 */
export type PendingAction =
  | {
      // Waiting for a player to make a continuation play (after 1, 8, 14, or failed defense)
      type: "continue";
      playerIndex: number;
    }
  | {
      // Waiting for a player to defend against a Pick 2/5 (Rule 1)
      type: "defend";
      playerIndex: number;
      count: number; // The total number of cards to be picked
      returnTurnTo: number; // The player whose turn it is after defense or draw
    }
  | {
      // Forcing a player to draw cards one-by-one (after failing to defend or 14)
      type: "draw";
      playerIndex: number;
      count: number;
      returnTurnTo: number; // The player whose turn it is *after* drawing is complete
    }
  | {
      // Waiting for a player to choose a suit after playing WHOT
      type: "call_suit";
      playerIndex: number;
      nextAction: "continue" | "pass";
    };

/**
 * Defines which ruleset is being used.
 */
export type RuleVersion = "rule1" | "rule2";

/**
 * Represents the entire state of the game at any given moment.
 */
export interface GameState {
  players: Player[];
  market: Card[];
  pile: Card[];
  currentPlayer: number;
  direction: number;
  ruleVersion: RuleVersion;

  // --- Rule 1 ---
  pendingPick: number; // Stores the *stacked* pick count during a battle
  calledSuit?: CardSuit; // The suit called by a WHOT card
  lastPlayedCard?: Card | null; // The last card played (for shape-matching)
  pendingAction: PendingAction | null; // The current action the game is waiting for

  // --- Rule 2 (optional) ---
  mustPlayNormal?: boolean;

  // ✅ ADD THIS: Tracks the winner
  winner: Player | null;
}