import { generateDeck, shuffleDeck } from "./deck";
// ✅ We import Rule 1 from its file
import { applyCardEffectRule1, isValidMoveRule1 } from "./rules";
// ❌ DO NOT IMPORT Rule 2 here. We define it at the bottom of this file.
import {
  Card,
  CardSuit,
  GameState,
  PendingAction,
  Player,
  RuleVersion,
} from "./types";

// =========================================================
// ✅ HELPER FUNCTIONS FOR SCORING (RULE 2)
// =========================================================

/**
 * Calculates the total score of a hand (Sum of card numbers).
 * WHOT (20) counts as 20.
 */
const calculateHandScore = (hand: Card[]): number => {
  return hand.reduce((total, card) => total + card.number, 0);
};

/**
 * Handles the Game Over state when the Market is empty in Rule 2.
 * The player with the LOWEST score wins.
 */
const determineMarketExhaustionWinner = (state: GameState): GameState => {
  console.log("🚫 Market Empty in Rule 2! Calculating scores...");

  // Calculate scores for all players
  const playersWithScores = state.players.map((p) => ({
    player: p,
    score: calculateHandScore(p.hand),
  }));

  // Sort by score ascending (Lowest score wins)
  playersWithScores.sort((a, b) => a.score - b.score);

  const winner = playersWithScores[0].player;
  const winnerScore = playersWithScores[0].score;

  console.log(`🏆 Market Runout! Winner: ${winner.name} with score ${winnerScore}`);

  return {
    ...state,
    winner: winner, // This triggers the Game Over modal
    pendingAction: null, // Stop all actions
    currentPlayer: -1, // Lock turns
  };
};

const reshufflePileIntoMarket = (
  pile: Card[],
  market: Card[]
): { newPile: Card[]; newMarket: Card[] } => {
  if (pile.length <= 1) {
    return { newPile: pile, newMarket: market };
  }

  const topCard = pile[pile.length - 1];
  const cardsToShuffle = pile.slice(0, pile.length - 1);
  const newMarket = shuffleDeck(cardsToShuffle);

  console.log(
    `♻️ Reshuffling ${cardsToShuffle.length} cards from pile to market.`
  );

  return { newPile: [topCard], newMarket: newMarket };
};

// =========================================================
// MAIN GAME LOGIC
// =========================================================

/**
 * Initialize a new game.
 */
export const initGame = (
  playerNames: string[],
  startingHand: number = 5,
  ruleVersion: RuleVersion = "rule1"
): { gameState: GameState; allCards: Card[] } => {
  const fullDeck = shuffleDeck(generateDeck(ruleVersion));
  const players: Player[] = playerNames.map((name, idx) => {
    const hand = fullDeck.slice(idx * startingHand, (idx + 1) * startingHand);
    return { id: `player-${idx}`, name, hand };
  });

  const dealtCards = players.length * startingHand;
  const market = fullDeck.slice(dealtCards);

  let firstCard: Card;
  let initialMarket: Card[];
  let pile: Card[] = [];

  // Find the first non-special card to start the pile
  const specialNums =
    ruleVersion === "rule1" ? [1, 2, 5, 8, 14, 20] : [1, 2, 14];
  let firstCardIndex = -1;

  for (let i = 0; i < market.length; i++) {
    if (!specialNums.includes(market[i].number)) {
      firstCardIndex = i;
      break;
    }
  }

  if (firstCardIndex === -1) {
    // No non-special cards? Use first card.
    firstCardIndex = 0;
  }

  firstCard = market[firstCardIndex];
  initialMarket = [
    ...market.slice(0, firstCardIndex),
    ...market.slice(firstCardIndex + 1),
  ];
  pile = [firstCard];

  const gameState: GameState = {
    players,
    market: initialMarket!,
    pile,
    currentPlayer: 0,
    direction: 1,
    ruleVersion,
    // Init Rule 1 state
    pendingPick: 0,
    calledSuit: undefined,
    lastPlayedCard: firstCard, // The first pile card is the 'last played'
    pendingAction: null,
    // Init Rule 2 state
    mustPlayNormal: false,
    winner: null,
  };

  return { gameState, allCards: fullDeck };
};

/**
 * Select ruleset dynamically.
 */
const selectRuleSet = (ruleVersion: RuleVersion) => {
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
  card: Card
): GameState => {
  const { isValidMove, applyCardEffect } = selectRuleSet(state.ruleVersion);

  if (!isValidMove(card, state)) {
    console.log("Invalid move based on state:", state.pendingAction);
    throw new Error("Invalid move");
  }

  // 1. Apply the move
  let newState = applyCardEffect(card, state, playerIndex);

  // 2. CHECK FOR WINNER IMMEDIATELY (Empty Hand)
  const player = newState.players[playerIndex];

  if (player.hand.length === 0) {
    console.log(`🏆 GAME OVER! Winner is ${player.name}`);
    return {
      ...newState,
      winner: player,
      pendingAction: null,
    };
  }

  return newState;
};

/**
 * Handle a player picking from the market.
 */
export const pickCard = (
  state: GameState,
  playerIndex: number
): { newState: GameState; drawnCards: Card[] } => {
  const { pendingAction, pendingPick } = state;

  // --- Rule 2 Logic ---
  if (state.ruleVersion === "rule2") {
    // Case A: Forced Draw (Defeat)
    if (
      state.pendingAction?.type === "draw" &&
      state.pendingAction.playerIndex === playerIndex
    ) {
      return { newState: state, drawnCards: [] };
    }

    const market = [...state.market];

    // Case B: Market Already Empty (User clicked empty slot)
    if (market.length === 0) {
      const endGameState = determineMarketExhaustionWinner(state);
      return { newState: endGameState, drawnCards: [] };
    }

    // Case C: Normal Draw
    const drawnCards = market.splice(0, 1); // Draw 1
    const newHand = [...drawnCards, ...state.players[playerIndex].hand];

    const nextPlayer = (playerIndex + state.direction + state.players.length) % state.players.length;

    let preservedPendingAction = null;
    if (state.pendingAction?.type === 'draw' && state.pendingAction.playerIndex === nextPlayer) {
      preservedPendingAction = state.pendingAction;
    }

    // Create the state with the new hand
    const stateWithCardDrawn = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer: nextPlayer, // Draw always ends turn in Rule 2
      pendingAction: preservedPendingAction,
      lastPlayedCard: null,
    };

    // ✅ CHECK IF MARKET BECAME EMPTY AFTER DRAWING
    if (market.length === 0) {
      console.log("⚡ Market just ran out after pick! Ending game...");
      const endGameState = determineMarketExhaustionWinner(stateWithCardDrawn);
      return { newState: endGameState, drawnCards };
    }

    return { newState: stateWithCardDrawn, drawnCards };
  }

  // --- Rule 1 Logic ---
  if (
    pendingAction?.type === "defend" &&
    pendingAction.playerIndex === playerIndex
  ) {
    const market = [...state.market];
    if (market.length === 0) {
      const { newPile, newMarket } = reshufflePileIntoMarket(
        state.pile,
        market
      );
      if (newMarket.length === 0) {
        const attacker = pendingAction.returnTurnTo;
        const newState = {
          ...state,
          currentPlayer: attacker,
          pendingAction: null,
          lastPlayedCard: null,
        };
        return { newState, drawnCards: [] };
      }
      market.push(...newMarket);
      state.pile = newPile;
    }

    const count = pendingAction.count;
    const drawnCards = market.splice(0, count);
    const newHand = [...drawnCards, ...state.players[playerIndex].hand];

    const attacker = pendingAction.returnTurnTo;
    const newState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer: attacker,
      pendingAction: null,
      lastPlayedCard: null,
    };
    return { newState, drawnCards };
  }

  if (
    !pendingAction ||
    (pendingAction?.type === "continue" &&
      pendingAction.playerIndex === playerIndex)
  ) {
    const market = [...state.market];

    // ✅ If market is empty, return early. The UI will handle the reshuffle.
    if (market.length === 0) {
      // The user can't draw, but we pass the turn if they were supposed to.
      // This prevents the game from getting stuck.
      const newState = {
        ...state,
        currentPlayer:
          (playerIndex + state.direction + state.players.length) %
          state.players.length,
        pendingAction: null,
        pendingPick: 0,
        lastPlayedCard: null,
      };
      return { newState, drawnCards: [] };
    }

    const drawnCards = market.splice(0, 1);
    const newHand = [...drawnCards, ...state.players[playerIndex].hand];

    const newState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer:
        (playerIndex + state.direction + state.players.length) %
        state.players.length,
      pendingAction: null,
      pendingPick: 0,
      lastPlayedCard: null,
    };
    return { newState, drawnCards };
  }

  return { newState: state, drawnCards: [] };
};

/**
 * Handle a player calling a suit after WHOT.
 */
export const callSuit = (
  state: GameState,
  playerIndex: number,
  suit: CardSuit
): GameState => {
  if (
    state.pendingAction?.type !== "call_suit" ||
    state.pendingAction.playerIndex !== playerIndex
  ) {
    throw new Error("Not a valid time to call suit.");
  }

  const { nextAction } = state.pendingAction;

  if (nextAction === "pass") {
    const nextPlayer =
      (playerIndex + state.direction + state.players.length) %
      state.players.length;
    return {
      ...state,
      calledSuit: suit,
      currentPlayer: nextPlayer,
      pendingAction: null,
    };
  } else {
    return {
      ...state,
      calledSuit: suit,
      currentPlayer: playerIndex,
      pendingAction: {
        type: "continue",
        playerIndex: playerIndex,
      },
    };
  }
};

/**
 * Executes a single forced draw action.
 */
export const executeForcedDraw = (
  state: GameState
): { newState: GameState; drawnCard: Card | null } => {
  if (state.pendingAction?.type !== "draw") {
    return { newState: state, drawnCard: null };
  }

  const { playerIndex, count, returnTurnTo } = state.pendingAction;

  // If market is ALREADY empty, let the auto-refill handle it.
  if (state.market.length === 0) {
    console.log("Market is empty during a forced draw. Waiting for refill.");
    // We don't change state here, just signal that no card was drawn.
    // The pendingAction remains, and the game will re-evaluate.
    return { newState: state, drawnCard: null };
  }

  const market = [...state.market];
  const drawnCard = market.splice(0, 1)[0];

  const newHand = [drawnCard, ...state.players[playerIndex].hand];
  const remainingCount = count - 1;

  // ✅ CHECK IF MARKET BECAME EMPTY AFTER THIS DRAW
  if (state.ruleVersion === "rule2" && market.length === 0) {
    console.log("⚡ Market just ran out during forced draw! Ending game...");

    const tempState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
    };

    const endGameState = determineMarketExhaustionWinner(tempState);
    return { newState: endGameState, drawnCard };
  }

  let newPendingAction: PendingAction | null;

  if (remainingCount > 0) {
    newPendingAction = {
      ...state.pendingAction,
      count: remainingCount,
    };

    const newState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      pendingAction: newPendingAction,
    };
    return { newState, drawnCard };

  } else {
    const nextPlayer = returnTurnTo !== undefined ? returnTurnTo : playerIndex;

    const newState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer: nextPlayer,
      pendingAction: null,
      lastPlayedCard: null,
    };
    return { newState, drawnCard };
  }
};

export const checkWinner = (state: GameState): Player | null => {
  return state.players.find((p) => p.hand.length === 0) || null;
};

/**
 * ✅ This function is now EXPORTED and will be called by the UI *after* the reshuffle animation.
 */
export const getReshuffledState = (state: GameState): GameState => {
  const { newPile, newMarket } = reshufflePileIntoMarket(state.pile, state.market);
  return {
    ...state,
    pile: newPile,
    market: newMarket,
  };
};

// =========================================================
// ✅ RULE 2 LOGIC DEFINED HERE TO PREVENT DUPLICATES
// =========================================================

/**
 * Check if a move is valid in Rule 2.
 */
export const isValidMoveRule2 = (card: Card, state: GameState): boolean => {
  if (state.pile.length === 0) return true;
  const topCard = state.pile[state.pile.length - 1];

  if (
    state.pendingAction?.type === "draw" &&
    state.pendingAction.playerIndex === state.currentPlayer
  ) {
    return false;
  }

  if (
    state.pendingAction?.type === "continue" &&
    state.pendingAction.playerIndex === state.currentPlayer
  ) {
    const specialCard = state.lastPlayedCard || topCard;

    if (specialCard.number === 1) {
      return card.suit === specialCard.suit || card.number === specialCard.number;
    }

    if (specialCard.number === 2 || specialCard.number === 14) {
      return card.suit === specialCard.suit;
    }
  }

  return card.suit === topCard.suit || card.number === topCard.number;
};

/**
 * Apply Rule 2 effects.
 */
export const applyCardEffectRule2 = (
  card: Card,
  state: GameState,
  playerIndex: number
): GameState => {
  const newState: GameState = { ...state };

  const getNextPlayerIndex = (currentIdx: number, steps: number = 1) => {
    return (
      (currentIdx + newState.direction * steps + newState.players.length) %
      newState.players.length
    );
  };

  const opponentIndex = getNextPlayerIndex(playerIndex, 1);

  switch (card.number) {
    case 1: // Hold On
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = { type: "continue", playerIndex: playerIndex };
      break;

    case 2: // Pick Two
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: 2,
        returnTurnTo: playerIndex, // ✅ Required for forced draw loop
      };
      break;

    case 14: // General Market
      newState.currentPlayer = playerIndex; // Same player
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: 1,
        returnTurnTo: playerIndex, // ✅ Required for forced draw loop
      };
      break;

    default: // Normal card
      newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
      newState.pendingAction = null;
      break;
  }

  newState.pile = [...newState.pile, card];
  newState.lastPlayedCard = card;

  newState.players = newState.players.map((p, idx) =>
    idx === playerIndex
      ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
      : p
  );

  return newState;
};
