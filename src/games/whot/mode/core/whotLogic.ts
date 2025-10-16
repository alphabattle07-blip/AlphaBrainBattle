// whotLogic.ts

import { initGame as initializeCoreGame } from '../core/game'; // Adjust path to your game.ts
import { Card } from '../core/types'; // Adjust path to your types.ts

/**
 * This function acts as a bridge between your core game logic and the UI component.
 * It initializes the game and then returns BOTH the game state and a flat array
 * of all cards, which is needed by AnimatedCardList to render everything.
 */
export const initGame = (players: string[], handSize: number) => {
    // 1. Initialize the game using your core logic function
    const gameState = initializeCoreGame(players, handSize, "rule1");

    // 2. Combine all cards from the game state into a single array for animation
    const allCards: Card[] = [
        ...gameState.market,
        ...gameState.pile,
    ];
    gameState.players.forEach(player => {
        allCards.push(...player.hand);
    });

    console.log("All cards before unique filtering:", allCards.map(c => c.id));

    // 3. Ensure no duplicate card objects exist (important for refs)
    const uniqueCards = allCards.filter((card, index, self) => 
        index === self.findIndex((c) => c.id === card.id)
    );

    console.log("Unique cards after filtering:", uniqueCards.map(c => c.id));

    return {
        gameState,
        allCards: uniqueCards,
    };
};