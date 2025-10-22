// core/coordinateHelper.ts
// (Replace the old file with this)

import { CARD_WIDTH, CARD_HEIGHT } from "./ui/WhotCardTypes";

type Target = "player" | "computer" | "pile" | "market";
interface CoordsOptions {
  cardIndex?: number;
  handSize?: number;
}

/**
 * Calculates the target x, y (center) and rotation for a card
 * based on the current screen dimensions.
 */
export const getCoords = (
  target: Target,
  options: CoordsOptions = {},
  screenWidth: number,
  screenHeight: number
): { x: number; y: number; rotation: number } => {
  const { cardIndex = 0, handSize = 1 } = options;
  const isLandscape = screenWidth > screenHeight;

  switch (target) {
    // --- PILE (Played Cards) ---
    case "pile":
      if (isLandscape) {
        // Middle-Right in Landscape
        return {
          x: screenWidth * 0.65,
          y: screenHeight / 2,
          rotation: 0,
        };
      }
      // Middle-Center in Portrait
      return {
        x: screenWidth / 2,
        y: screenHeight * 0.45,
        rotation: 0,
      };

    // --- MARKET (Draw Pile) ---
    case "market":
      if (isLandscape) {
        // Middle-Left in Landscape
        return {
          x: screenWidth * 0.35,
          y: screenHeight / 2,
          rotation: 0,
        };
      }
      // Bottom-Right in Portrait (near player hand)
      return {
        x: screenWidth * 0.75,
        y: screenHeight * 0.7,
        rotation: 0,
      };

    // --- COMPUTER (Top Hand) ---
    case "computer": {
      const y = isLandscape ? screenHeight * 0.2 : screenHeight * 0.15;
      const maxComputerWidth = screenWidth * 0.7;
      const defaultVisualWidth = CARD_WIDTH * 0.4; // Overlap by 60%

      let totalWidth = CARD_WIDTH + (handSize - 1) * defaultVisualWidth;
      let visualWidth = defaultVisualWidth;

      // Squeeze cards if they don't fit
      if (totalWidth > maxComputerWidth && handSize > 1) {
        visualWidth = (maxComputerWidth - CARD_WIDTH) / (handSize - 1);
        totalWidth = maxComputerWidth;
      }

      const startX = (screenWidth - totalWidth) / 2;
      const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;

      return { x, y, rotation: 0 };
    }

    // --- PLAYER (Bottom Hand) ---
    case "player": {
      const y = isLandscape ? screenHeight * 0.8 : screenHeight * 0.85;
      const maxPlayerWidth = screenWidth * 0.9;
      const defaultVisualWidth = CARD_WIDTH * 0.5; // Overlap by 50%

      let totalWidth = CARD_WIDTH + (handSize - 1) * defaultVisualWidth;
      let visualWidth = defaultVisualWidth;

      // Squeeze cards if they don't fit
      if (totalWidth > maxPlayerWidth && handSize > 1) {
        visualWidth = (maxPlayerWidth - CARD_WIDTH) / (handSize - 1);
        totalWidth = maxPlayerWidth;
      }

      const startX = (screenWidth - totalWidth) / 2;
      const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;

      return { x, y, rotation: 0 };
    }

    default:
      return { x: screenWidth / 2, y: screenHeight / 2, rotation: 0 };
  }
};