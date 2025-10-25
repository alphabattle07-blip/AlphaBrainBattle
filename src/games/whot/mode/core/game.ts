// games/whot/core/game.ts
import { Card, GameState, Player, RuleVersion } from "./types";
import { generateDeck, shuffleDeck } from "./deck";
import {
  isValidMove as isValidMoveRule1,
  applyCardEffect as applyCardEffectRule1,
} from "./rules";
import { isValidMoveRule2, applyCardEffectRule2 } from "./rules2";

/**
 * Initialize a new game.
 */
export const initGame = (
  playerNames: string[],
  startingHand: number = 5,
  ruleVersion: RuleVersion = "rule1"
): { gameState: GameState; allCards: Card[] } => { // ✅ RETURN TYPE CHANGED
  const fullDeck = shuffleDeck(generateDeck(ruleVersion));
  const players: Player[] = playerNames.map((name, idx) => {
    const hand = fullDeck.slice(idx * startingHand, (idx + 1) * startingHand);
    return { id: `player-${idx}`, name, hand };
  });

  const dealtCards = players.length * startingHand;
  const market = fullDeck.slice(dealtCards);

  // Find the first non-special card to start the pile
  let firstCard: Card;
  let initialMarket: Card[];

  for (let i = 0; i < market.length; i++) {
    const card = market[i];
    if (![1, 2, 5, 8, 14, 20].includes(card.number)) {
      firstCard = card;
      initialMarket = [...market.slice(0, i), ...market.slice(i + 1)];
      break;
    }
  }

  if (!firstCard!) {
    firstCard = market[0];
    initialMarket = market.slice(1);
  }

  const pile: Card[] = [firstCard!];

  const gameState: GameState = { // ✅ Create gameState object
    players,
    market: initialMarket!,
    pile,
    currentPlayer: 0,
    direction: 1,
    pendingPick: 0,
    calledSuit: undefined,
    mustPlayNormal: false,
    ruleVersion,
  };

  return { gameState, allCards: fullDeck }; // ✅ RETURN MODIFIED
};

/**
 * Select ruleset dynamically.
 */
const useRuleSet = (ruleVersion: RuleVersion) => {
  return ruleVersion === "rule1"
    ? { isValidMove: isValidMoveRule1, applyCardEffect: applyCardEffectRule1 }
    : { isValidMove: isValidMoveRule2, applyCardEffect: applyCardEffectRule2 };
};

/**
 * Handle a player playing a card.
 */
export const playCard = (
  state: GameState,
  playerIndex: number,
  card: Card,
  ruleVersion: RuleVersion
): GameState => {
  const player = state.players[playerIndex];
  if (!player) throw new Error("Invalid player index");

  const { isValidMove, applyCardEffect } = useRuleSet(ruleVersion);

  if (!isValidMove(card, state)) {
    throw new Error("Invalid move");
  }

  let newState = applyCardEffect(card, state, playerIndex);

  if (card.number === 20 && ruleVersion === "rule1") {
    newState.currentPlayer = playerIndex;
  }

  return newState;
};

/**
 * Handle a player picking from the market.
 */
export const pickCard = (
  state: GameState,
  playerIndex: number
): { newState: GameState; drawnCards: Card[] } => { // ✅ RETURN TYPE CHANGED
  if (state.market.length === 0) {
    console.warn("Market is empty!");
    return { newState: state, drawnCards: [] }; // ✅ Return empty
  }

  const newState: GameState = {
    ...state,
    // Deep copy players array to avoid mutation
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    market: [...state.market], 
  };

  let cardsToPick = newState.pendingPick || 1;

  if (cardsToPick > newState.market.length) {
    cardsToPick = newState.market.length;
  }

  const drawnCards = newState.market.slice(0, cardsToPick); // ✅ Store drawn cards
  newState.market = newState.market.slice(cardsToPick);

  newState.players[playerIndex].hand.push(...drawnCards); // ✅ Add to specific player

  const nextPlayer =
    (playerIndex + newState.direction + newState.players.length) %
    newState.players.length;

  newState.currentPlayer = nextPlayer;
  newState.pendingPick = 0;
  newState.mustPlayNormal = false;

  return { newState, drawnCards }; // ✅ RETURN MODIFIED
};

/**
 * Check winner.
 */
export const checkWinner = (state: GameState): Player | null => {
  return state.players.find((p) => p.hand.length === 0) || null;
};