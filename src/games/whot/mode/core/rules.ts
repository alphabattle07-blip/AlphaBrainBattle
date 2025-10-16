// games/whot/core/rules.ts
import { Card, GameState } from "./types";
import { CardSuit } from "./ui/WhotCardTypes";

/**
 * Check if a move is valid based on current pile + rules.
 */
export const isValidMove = (card: Card, state: GameState): boolean => {
    const topCard = state.pile[state.pile.length - 1];
    const calledSuit = state.calledSuit;

    // If Whot was played and a suit was called → must follow that
    if (calledSuit && topCard.suit === "whot") {
        return card.suit === calledSuit || card.suit === "whot";
    }

    // Otherwise → must match suit or number or be a Whot
    return (
        card.suit === topCard.suit ||
        card.number === topCard.number ||
        card.suit === "whot"
    );
};

/**
 * Apply special card effects to the game state.
 */
export const applyCardEffect = (
    card: Card,
    state: GameState,
    playerIndex: number
): GameState => {
    const newState: GameState = { ...state };
    
    // --- Determine Next Player Index (Base) ---
    const getNextPlayerIndex = (currentIdx: number, steps: number = 1) => {
        return (currentIdx + newState.direction * steps + newState.players.length) % newState.players.length;
    };

    switch (card.number) {
        case 1: // Hold On → skip next player
        case 8: // Suspension (skip next player)
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 2);
            break;

        case 2: // Pick Two
            newState.pendingPick = (newState.pendingPick || 0) + 2;
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        case 5: // Pick Three
            newState.pendingPick = (newState.pendingPick || 0) + 3;
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        case 14: // General Market → all other players draw 1
            let marketRemaining = [...newState.market];
            newState.players = newState.players.map((p, idx) => {
                if (idx === playerIndex || marketRemaining.length === 0) return p; 
                const drawn = marketRemaining.shift()!;
                return { ...p, hand: [...p.hand, drawn] };
            });
            newState.market = marketRemaining;
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        case 20: // Whot → Call Shape
            // UI must set newState.calledSuit after this
            newState.calledSuit = undefined; 
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;

        default:
            // Normal card → just pass turn
            newState.currentPlayer = getNextPlayerIndex(playerIndex, 1);
            break;
    }

    // --- Update State ---
    
    // Push the card to pile
    newState.pile = [...newState.pile, card];

    // Remove from player's hand
    newState.players = newState.players.map((p, idx) => {
        if (idx !== playerIndex) return p;
        return { ...p, hand: p.hand.filter((c) => c.id !== card.id) };
    });
    
    // Reset mustPlayNormal
    newState.mustPlayNormal = false; 

    return newState;
};