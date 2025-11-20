import {
  Card,
  GameState,
  Player,
  RuleVersion,
  PendingAction,
  CardSuit,
} from "./types";
import { generateDeck, shuffleDeck } from "./deck";
import { isValidMoveRule1, applyCardEffectRule1, isValidMoveRule2, applyCardEffectRule2 } from "./rules";

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
 * Check if a move is valid in Rule 2.
 */
export const isValidMoveRule2 = (card: Card, state: GameState): boolean => {
  if (state.pile.length === 0) return true;
  const topCard = state.pile[state.pile.length - 1];
  const activeCard = state.lastPlayedCard || topCard;

  // --- 1. Defense Scenario (Player is under attack) ---
  if (
    state.pendingAction?.type === "draw" &&
    state.pendingAction.playerIndex === state.currentPlayer
  ) {
    // You are under attack! You can only play Defense cards (2 or 14).
    // We allow switching between 2 and 14 during defense.
    if (card.number === 2 || card.number === 14) {
      // Strictly, you usually need to match the number to stack (2 on 2).
      // However, to allow "switching", we can allow 2 on 14 or 14 on 2 if suits match,
      // OR purely based on them being defensive cards.
      // Implementation: Allow if Number matches OR Suit matches.
      return (
        card.number === activeCard.number ||
        card.suit === activeCard.suit ||
        // Allow cross-stacking 2 and 14 regardless of suit if it's a "defensive" move?
        // Based on "I should be able to stack them... switch to another special number",
        // we allow playing 2 or 14 on a 2 or 14.
        ((activeCard.number === 2 || activeCard.number === 14) &&
          (card.number === 2 || card.number === 14))
      );
    }
    return false; // Cannot play normal cards while under attack
  }

  // --- 2. Normal / Combo Scenario ---
  
  // If the previous card was a special card played by THIS player (retained turn),
  // they must follow standard matching rules (Suit or Number).
  // Note: "Hold On" (1) allows playing anything that matches suit/number.
  
  return card.suit === activeCard.suit || card.number === activeCard.number;
};

/**
 * Apply Rule 2 effects.
 * Implements "Retain Turn" logic for 1, 2, and 14.
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

  // Determine current accumulated penalty (if any)
  // If the player was defending, they are taking the existing penalty and ADDING to it.
  // If the player is starting a combo, penalty starts at 0.
  let currentPenalty = 0;
  if (
    state.pendingAction?.type === "draw" &&
    state.pendingAction.playerIndex === playerIndex // Was targeting me
  ) {
    currentPenalty = state.pendingAction.count;
  } else if (
    state.pendingAction?.type === "draw" &&
    state.pendingAction.playerIndex === opponentIndex // I'm already building a stack
  ) {
    currentPenalty = state.pendingAction.count;
  }

  // --- Apply Card Effect ---
  switch (card.number) {
    case 1: // Hold On
      // Retain Turn. No penalty added.
      newState.currentPlayer = playerIndex;
      // If there was an existing penalty targeting the opponent (e.g. I played 2 then 1), preserve it.
      // If I was under attack (defending) and played 1... wait, 1 isn't a defensive card usually.
      // But assuming standard flow, 1 just pauses.
      // We ensure pendingAction targets the opponent if we have a stack.
      if (currentPenalty > 0) {
        newState.pendingAction = {
            type: "draw",
            playerIndex: opponentIndex,
            count: currentPenalty,
            returnTurnTo: playerIndex
        }
      } else {
          // Just a normal Hold On
          newState.pendingAction = { type: 'continue', playerIndex };
      }
      break;

    case 2: // Pick Two
      // Retain Turn (Combo!).
      newState.currentPlayer = playerIndex; 
      // Add to penalty targeting NEXT player.
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: currentPenalty + 2,
        returnTurnTo: playerIndex,
      };
      break;

    case 14: // General Market
      // Retain Turn (Combo!).
      newState.currentPlayer = playerIndex;
      // Add to penalty targeting NEXT player.
      newState.pendingAction = {
        type: "draw",
        playerIndex: opponentIndex,
        count: currentPenalty + 1,
        returnTurnTo: playerIndex,
      };
      break;

    default: // Normal card
      // Play Normal -> ENDS TURN.
      newState.currentPlayer = opponentIndex;
      
      // If we had built up a penalty (e.g. 2 -> 2 -> 5), that penalty is now LIVE for the opponent.
      if (currentPenalty > 0) {
         // The pending action already exists (targeting opponent) from the previous card.
         // We just need to ensure it stays.
         // However, 'lastPlayedCard' logic in isValidMove might need to know the 'attack' source.
         // The state updates below will handle the pile.
         newState.pendingAction = {
            type: "draw",
            playerIndex: opponentIndex,
            count: currentPenalty,
            returnTurnTo: playerIndex // irrelevant now as turn passed
         }
      } else {
         newState.pendingAction = null;
      }
      break;
  }

  // --- Update State ---
  newState.pile = [...newState.pile, card];
  newState.lastPlayedCard = card; 

  // Remove card from player's hand
  newState.players = newState.players.map((p, idx) =>
    idx === playerIndex
      ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
      : p
  );

  return newState;
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
  card: Card
): GameState => {
  const { isValidMove, applyCardEffect } = useRuleSet(state.ruleVersion);

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

  // --- Rule 1 Logic (Unchanged) ---
  if (
    pendingAction?.type === "defend" &&
    pendingAction.playerIndex === playerIndex
  ) {
    const opponentIndex =
      (playerIndex - state.direction + state.players.length) %
      state.players.length;

    const newState: GameState = {
      ...state,
      pendingAction: {
        type: "draw",
        playerIndex: playerIndex,
        count: pendingPick,
        returnTurnTo: opponentIndex,
      },
      pendingPick: 0,
    };
    return { newState, drawnCards: [] };
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