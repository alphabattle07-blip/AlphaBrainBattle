// games/whot/core/rules2.ts
import { Card, GameState } from "./types";

/**
 * Check if a move is valid in Rule 2.
 */
export const isValidMoveRule2 = (card: Card, state: GameState): boolean => {
    if (state.pile.length === 0) return true;

    const topCard = state.pile[state.pile.length - 1];

    // Must match suit or number
    const baseValid = card.suit === topCard.suit || card.number === topCard.number;
    
    // Rule 2 Extra: If mustPlayNormal is set (after a 1, 2, 14), the card must NOT be a special card.
    if (state.mustPlayNormal) {
        return baseValid && ![1, 2, 14].includes(card.number);
    }
    
    return baseValid;
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
    
    // --- Determine Next Player Index (Base) ---
    const getNextPlayerIndex = (currentIdx: number, steps: number = 1) => {
        return (currentIdx + newState.direction * steps + newState.players.length) % newState.players.length;
    };

    // --- Apply Card Effect and determine next player ---
    switch (card.number) {
        case 1: // Hold On → skip next player
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 2);
            break;

        case 2: // Pick Two (cannot be defended in Rule 2)
            newState.pendingPick = (newState.pendingPick || 0) + 2;
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        case 14: // General Market → all others draw 1
            let marketRemaining = [...newState.market];
            newState.players = newState.players.map((p, idx) => {
                if (idx === playerIndex || marketRemaining.length === 0) return p;
                const drawn = marketRemaining.shift()!;
                return { ...p, hand: [...p.hand, drawn] };
            });
            newState.market = marketRemaining;
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        default:
            // Normal card → just pass turn
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;
    }

    // --- Update State ---
    
    // Push card to pile
    newState.pile = [...newState.pile, card];

    // Remove card from player's hand
    newState.players = newState.players.map((p, idx) =>
        idx === playerIndex
            ? { ...p, hand: p.hand.filter((c) => c.id !== card.id) }
            : p
    );

    // Rule 2 Extra: after a special card, player MUST play a normal card
    newState.mustPlayNormal = [1, 2, 14].includes(card.number);

    return newState;
};