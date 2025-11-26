import { Card, GameState } from "./types";


/**
 * Check if a move is valid in "Rule 1".
 * This logic is now complex and context-dependent.
 */
export const isValidMoveRule1 = (card: Card, state: GameState): boolean => {
  const { pile, pendingAction, lastPlayedCard, calledSuit } = state;
  if (pile.length === 0) return true;

  const topCard = pile[pile.length - 1];
  const cardToMatch = lastPlayedCard || topCard;

  // --- 1. Defense State (Defend pending for current player) ---
  if (pendingAction?.type === "defend" && pendingAction.playerIndex === state.currentPlayer) {
    // Can only play the same number as the pick card to defend
    const pickNumber = lastPlayedCard?.number || topCard.number;
    return card.number === pickNumber && (pickNumber === 2 || pickNumber === 5);
  }



  // --- 2. Continuation State (after 1, 8, 14, or successful defense) ---
  if (pendingAction?.type === "continue") {
    // WHOT is always allowed
    if (card.number === 20) return true;

    // If continuing after Hold-On (card 1), allow another Hold-On
    if (cardToMatch.number === 1) {
      return card.number === 1 || card.suit === cardToMatch.suit;
    }

    // If continuing after successful defense with pick card (2 or 5), allow another pick card of same number OR same suit
    if (cardToMatch.number === 2 || cardToMatch.number === 5) {
      return card.number === cardToMatch.number || card.suit === cardToMatch.suit;
    }

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

    // Standard rule: match suit or number (always applies in normal turn)
    return (
      card.suit === topCard.suit ||
      card.number === topCard.number ||
      card.number === 20
    );
  }

  // If in any other state (like 'call_suit'), no moves are valid
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
  const wasInBattle = state.pendingAction?.type === "draw" && state.pendingAction.playerIndex === opponentIndex;

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
    case 2: // Pick Two
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: 2,
        returnTurnTo: playerIndex,
      };
      break;

    case 5: // Pick Three
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: 3,
        returnTurnTo: playerIndex,
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
      newState.lastPlayedCard = null; // Clear last card
      break;
  }

  return newState;
};