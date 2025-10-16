// games/whot/core/game.ts
import { Card, GameState, Player, RuleVersion } from "./types";
import { generateDeck, shuffleDeck } from "./deck";
import { isValidMove as isValidMoveRule1, applyCardEffect as applyCardEffectRule1 } from "./rules";
import { isValidMoveRule2, applyCardEffectRule2 } from "./rules2";

/**
 * Initialize a new game.
 */
export const initGame = (
    playerNames: string[],
    startingHand: number = 5,
    ruleVersion: RuleVersion = "rule1"
): GameState => {
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

    // This logic ensures the game starts with a playable card on top
    for(let i = 0; i < market.length; i++) {
        const card = market[i];
        if (![1, 2, 5, 8, 14, 20].includes(card.number)) {
             firstCard = card;
             initialMarket = [...market.slice(0, i), ...market.slice(i + 1)];
             break;
        }
    }
    
    // Fallback if the entire deck is special (unlikely but safe)
    if (!firstCard!) {
         firstCard = market[0];
         initialMarket = market.slice(1);
    }
    
    const pile: Card[] = [firstCard!];

    return {
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
    
    // Apply effects, update turn, move card, and remove from hand
    let newState = applyCardEffect(card, state, playerIndex);

    // If the played card was a WHOT (20), the current player must now call a suit.
    // The UI must handle the modal for the suit call and then call an update function.
    if (card.number === 20 && ruleVersion === 'rule1') {
        // Set currentPlayer back to the player who played Whot to wait for suit call
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
): GameState => {
    if (state.market.length === 0) throw new Error("Market is empty!");

    const newState: GameState = { ...state };

    let cardsToPick = newState.pendingPick || 1;
    
    // Handle market depletion
    if (cardsToPick > newState.market.length) {
        cardsToPick = newState.market.length;
    }

    const drawn = newState.market.slice(0, cardsToPick);
    newState.market = newState.market.slice(cardsToPick);

    // Add cards to player's hand
    newState.players = newState.players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p
    );

    // Pass turn
    const nextPlayer =
        (playerIndex + newState.direction + newState.players.length) %
        newState.players.length;

    newState.currentPlayer = nextPlayer;
    newState.pendingPick = 0; // Reset pick counter
    newState.mustPlayNormal = false; 

    return newState;
};

/**
 * Check winner.
 */
export const checkWinner = (state: GameState): Player | null => {
    return state.players.find((p) => p.hand.length === 0) || null;
};