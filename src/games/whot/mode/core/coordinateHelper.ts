// coordinateHelper.ts (FINAL & CORRECTED)
import { Dimensions } from "react-native";

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 120;

/**
 * Calculates the X and Y coordinates for a card based on its location.
 * @param location - The area where the card should appear ('market', 'pile', 'player', 'computer').
 * @param options - Additional data (card index and hand size).
 * @returns { x, y, rotation } coordinates for the card.
 */
export const getCoords = (
  location: "market" | "player" | "computer" | "pile",
  options: { cardIndex?: number; handSize?: number } = {}
) => {
  // ✅ Get current screen dimensions each time for responsive layout
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
  const { cardIndex = 0, handSize = 1 } = options;

  const deckCenter = {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT / 2 - CARD_HEIGHT / 2,
    rotation: 0,
  };

  switch (location) {
    case "market":
      return {
        x: deckCenter.x - CARD_WIDTH * 0.7,
        y: deckCenter.y,
        rotation: 0,
      };

    case "pile":
      return {
        x: deckCenter.x + CARD_WIDTH * 0.7,
        y: deckCenter.y,
        rotation: 0,
      };

    case "player":
    case "computer": {
      const HAND_GAP = 15; // Gap between cards
      const MAX_VISIBLE_CARDS = 8;

      // Shrink spacing if too many cards
      const effectiveCardWidth =
        handSize > MAX_VISIBLE_CARDS
          ? (SCREEN_WIDTH * 0.9) / handSize
          : CARD_WIDTH + HAND_GAP;

      const totalHandWidth =
        handSize * effectiveCardWidth - (handSize > 1 ? HAND_GAP : 0);
      const startX = (SCREEN_WIDTH - totalHandWidth) / 2;

      const cardX = startX + cardIndex * effectiveCardWidth + CARD_WIDTH / 2;
      const cardY =
        location === "player"
          ? SCREEN_HEIGHT - CARD_HEIGHT * 0.75
          : CARD_HEIGHT * 0.75;

      return {
        x: cardX,
        y: cardY,
        rotation: location === "computer" ? 180 : 0,
      };
    }

    default:
      return deckCenter;
  }
};
