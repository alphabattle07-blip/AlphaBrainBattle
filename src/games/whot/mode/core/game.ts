import { generateDeck, shuffleDeck } from "./deck";
import { applyCardEffectRule1, isValidMoveRule1 } from "./rules";
import { applyCardEffectRule2, isValidMoveRule2 } from "./rules2";
import {
  Card,
  CardSuit,
  GameState,
  PendingAction,
  Player,
  RuleVersion,
} from "./types";

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

  return applyCardEffect(card, state, playerIndex);
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
    // If pendingAction targets ME, I am giving up on defending.
    if (
      state.pendingAction?.type === "draw" &&
      state.pendingAction.playerIndex === playerIndex
    ) {
        // Return state as-is to trigger 'executeForcedDraw' loop in UI/GameLoop
      return { newState: state, drawnCards: [] };
    }

    // Case B: Voluntary Draw (Ending Combo or No Card)
    // "Turn should only switch when I... Draw from the market"
    const market = [...state.market];
    if (market.length === 0) return { newState: state, drawnCards: [] };

    const drawnCards = market.splice(0, 1); // Draw 1
    const newHand = [...state.players[playerIndex].hand, ...drawnCards];

    const nextPlayer = (playerIndex + state.direction + state.players.length) % state.players.length;

    // Check if I was building a stack that I am now passing to the opponent
    let preservedPendingAction = null;
    if (state.pendingAction?.type === 'draw' && state.pendingAction.playerIndex === nextPlayer) {
        // I played a 2, then drew. The +2 is still for the next player.
        preservedPendingAction = state.pendingAction;
    }

    const newState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer: nextPlayer, // Draw always ends turn in Rule 2
      pendingAction: preservedPendingAction, 
      lastPlayedCard: null, // Reset so next player plays on pile top
    };
    return { newState, drawnCards };
  }

  // --- Rule 1 Logic ---
  if (
    pendingAction?.type === "defend" &&
    pendingAction.playerIndex === playerIndex
  ) {
    // Handle drawing directly when player chooses to pick from market (unable to defend)
    const market = [...state.market];
    if (market.length === 0) {
      // If no cards, turn passes back to attacker
      const attacker = pendingAction.returnTurnTo;
      const newState = {
        ...state,
        currentPlayer: attacker,
        pendingAction: null,
        lastPlayedCard: null,
      };
      return { newState, drawnCards: [] };
    }

    const count = pendingAction.count;
    const drawnCards = market.splice(0, count);
    const newHand = [...state.players[playerIndex].hand, ...drawnCards];

    // Turn back to attacker
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
    if (market.length === 0) {
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
    const newHand = [...state.players[playerIndex].hand, ...drawnCards];

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

  // If market is empty, we must abort correctly
  if (state.market.length === 0) {
    // If we can't draw, return turn to the Attacker immediately
    const nextPlayer = returnTurnTo !== undefined ? returnTurnTo : state.currentPlayer;
    const newState = {
      ...state,
      currentPlayer: nextPlayer,
      pendingAction: null, // Clear action so game resumes
    };
    return { newState, drawnCard: null };
  }

  const market = [...state.market];
  const drawnCard = market.splice(0, 1)[0];
  
  // Add card to start of hand (visual preference)
  const newHand = [drawnCard, ...state.players[playerIndex].hand];
  const remainingCount = count - 1;

  let newPendingAction: PendingAction | null;

  if (remainingCount > 0) {
    // Continue drawing...
    newPendingAction = {
      ...state.pendingAction,
      count: remainingCount,
    };
    
    // State update for the INTERMEDIATE draw
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
    // ✅ FINAL DRAW COMPLETE
    // This is where the "Seize" happened. We must return the turn to the attacker.
    
    const nextPlayer = returnTurnTo !== undefined ? returnTurnTo : playerIndex;
    
    console.log(`✅ Forced draw done. Returning turn to Player ${nextPlayer}`);

    const newState: GameState = {
      ...state,
      market,
      players: state.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      ),
      currentPlayer: nextPlayer, // <--- CRITICAL FIX: Switch player back
      pendingAction: null,       // <--- Clear action so Attacker can play again
      lastPlayedCard: null,      // <--- Reset this so Attacker can play ANY valid card (optional, depending on strictness)
    };
    return { newState, drawnCard };
  }
};

export const checkWinner = (state: GameState): Player | null => {
  return state.players.find((p) => p.hand.length === 0) || null;
};