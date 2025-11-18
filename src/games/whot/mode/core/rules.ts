import { Card, GameState, PendingAction, CardSuit } from "./types";


/**
 * Check if a move is valid in "Rule 1".
 * This logic is now complex and context-dependent.
 */
export const isValidMoveRule1 = (card: Card, state: GameState): boolean => {
  const { pile, pendingAction, lastPlayedCard, calledSuit } = state;
  if (pile.length === 0) return true;

  const topCard = pile[pile.length - 1];
  const cardToMatch = lastPlayedCard || topCard;

  // --- 1. Defend State (Pick 2 / Pick 5 battle) ---
  if (pendingAction?.type === "defend") {
    // Can only play a Pick 2, Pick 5, or WHOT
    return [2, 5, 20].includes(card.number);
  }

  // --- 2. Continuation State (after 1, 8, 14, or failed defense) ---
  if (pendingAction?.type === "continue") {
    // WHOT is always allowed
    if (card.number === 20) return true;
    
    // If a suit was just called by WHOT, must follow that suit
    if (cardToMatch.number === 20 && calledSuit) {
      return card.suit === calledSuit;
    }
    
    // Otherwise, must match the SHAPE (suit) of the card that started this
    return card.suit === cardToMatch.suit;
  }

  // --- 3. Normal Turn ---
  if (!pendingAction) {
    // If WHOT was just played, must follow called suit
    if (topCard.number === 20 && calledSuit) {
      return card.suit === calledSuit || card.number === 20;
    }
    
    // Standard rule: match suit or number
    return (
      card.suit === topCard.suit ||
      card.number === topCard.number ||
      card.number === 20
    );
  }

  // If in any other state (like 'draw' or 'call_suit'), no moves are valid
  return false;
};

/**
 * Apply "Rule 1" effects and set the *next* pending action.
 */
export const applyCardEffectRule1 = (
  card: Card,
  state: GameState,
  playerIndex: number
): GameState => {
  const newState: GameState = {
    ...state,
    pile: [...state.pile, card],
    lastPlayedCard: card, // Always update this
    // Remove card from player's hand
    players: state.players.map((p, idx) =>
      idx === playerIndex
        ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
        : p
    ),
  };

  const getNextPlayerIndex = (steps = 1) => {
    return (
      (playerIndex + newState.direction * steps + newState.players.length) %
      newState.players.length
    );
  };

  const opponentIndex = getNextPlayerIndex(1);
  const wasInBattle = state.pendingAction?.type === "defend";

  switch (card.number) {
    // --- Group 1: Hold On, Suspension, General Market ---
    case 1: // Hold On
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = { type: "continue", playerIndex: playerIndex };
      break;
    case 8: // Suspension
      // Skips next player, but player who played it continues
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = { type: "continue", playerIndex: playerIndex };
      // Note: The "skip" is implicit because the turn doesn't pass to opponent
      break;
    case 14: // General Market
      newState.currentPlayer = playerIndex; // Same player
      // Set 'draw' action for opponent, then 'continue' for current player
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: 1,
        returnTurnTo: playerIndex, // Turn returns to this player
      };
      break;

    // --- Group 2: Pick 2, Pick 5 ---
    case 2:
    case 5:
      const pickCount = card.number === 2 ? 2 : 3;
      // Stack the pick count
      const totalPicks = (state.pendingPick || 0) + pickCount;
      newState.pendingPick = totalPicks;
      // Set 'defend' action for the opponent
      newState.currentPlayer = opponentIndex;
      newState.pendingAction = {
        type: "defend",
        playerIndex: opponentIndex,
        count: totalPicks,
      };
      break;

    // --- Group 3: WHOT ---
    case 20:
      newState.calledSuit = undefined; // Clear old suit
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = {
        type: "call_suit",
        playerIndex: playerIndex,
        // If in a battle, continue battle. Otherwise, pass turn.
        nextAction: wasInBattle ? "continue" : "pass",
      };
      break;

    // --- Normal Card ---
    default:
      // Playing a normal card *ends* a sequence
      newState.currentPlayer = getNextPlayerIndex(1);
      newState.pendingAction = null;
      newState.pendingPick = 0;
      newState.lastPlayedCard = null; // Clear last card
      break;
  }

  return newState;
};