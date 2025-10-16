// games/whot/core/deck.ts (Corrected version)
import { Card, CardSuit } from "./types";

const SUIT_CARDS: { [key in CardSuit]?: number[] } = {
    circle:   [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
    cross:    [1, 2, 3, 5, 7, 10, 11, 13, 14],
    square:   [1, 2, 3, 5, 7, 10, 11, 13, 14],
    star:     [1, 2, 3, 4, 5, 7, 8],
    whot:     [20], // Whot cards are always number 20
};

export const generateDeck = (ruleVersion: "rule1" | "rule2" = "rule1"): Card[] => {
    const deck: Card[] = [];

    // Add normal suit cards based on the authentic distribution
    for (const suit in SUIT_CARDS) {
        const cardSuit = suit as CardSuit;
        SUIT_CARDS[cardSuit]?.forEach(num => {
            deck.push({ id: `${cardSuit}-${num}`, suit: cardSuit, number: num });
        });
    }

    // Add Whot cards (number 20)
    const whotCount = ruleVersion === "rule1" ? 5 : 0; // Rule 2 often has no Whot cards
    for (let i = 1; i <= whotCount; i++) {
        deck.push({ id: `whot-${i}`, suit: "whot", number: 20 });
    }

    return deck;
};

// shuffleDeck function remains the same, it's perfect.
export const shuffleDeck = (deck: Card[]): Card[] => {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};