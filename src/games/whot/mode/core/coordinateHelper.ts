// core/coordinateHelper.ts (FIXED)

// ✅ FIX 1: Import from the correct config file
import { CARD_WIDTH, CARD_HEIGHT } from "../core/ui/whotConfig";

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

  const deckCenterX = screenWidth / 2;
  const deckCenterY = screenHeight / 2;

  switch (target) {
    // --- PILE (Played Cards) ---
    case "pile":
      // ✅ FIX 2: This is the new layout.
      // It's ALWAYS in the center, just offset to the right.
      return {
        x: deckCenterX + CARD_WIDTH * 0.7,
        y: isLandscape ? deckCenterY : screenHeight * 0.45, // Use 45% Y in portrait
        rotation: 0,
      };

    // --- MARKET (Draw Pile) ---
case "market":
  if (isLandscape) {
    return {
      x: deckCenterX - CARD_WIDTH * 2,
      y: deckCenterY + 8,
      rotation: 0,
    };
  }
  // ✅ FIXED: Center the market in portrait mode too
  return {
    x: deckCenterX - CARD_WIDTH * 0.7,
    y: deckCenterY, // perfectly centered vertically
    rotation: 0,
  };


    // --- COMPUTER (Top Hand) ---
    case "computer": {
      const boxTopMargin = isLandscape ? 10 : 20;
      const boxHeight = CARD_HEIGHT + 10;
      const y = boxTopMargin + boxHeight / 2;

      if (isLandscape) {
        // Landscape: No overlap
        const spacing = 10;
        const visualWidth = CARD_WIDTH + spacing;
        const totalWidth = handSize * visualWidth - spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 1;
        return { x, y, rotation: 0 };
      } else {
        // Portrait: "Squeezing" logic
        const maxComputerWidth = screenWidth * 0.7;
        const defaultVisualWidth = CARD_WIDTH * 0.4;
        let totalWidth = CARD_WIDTH + (handSize - 1) * defaultVisualWidth;
        let visualWidth = defaultVisualWidth;

        if (totalWidth > maxComputerWidth && handSize > 1) {
          visualWidth = (maxComputerWidth - CARD_WIDTH) / (handSize - 1);
          totalWidth = maxComputerWidth;
        }
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
        return { x, y, rotation: 0 };
      }
    }

    // --- PLAYER (Bottom Hand) ---
    case "player": {
      const boxBottomMargin = isLandscape ? 10 : 20;
      // ✅ FIX 3: Typo fix (was CARD_HEIGHT + 4)
      const boxHeight = CARD_HEIGHT + 10;
      // ✅ FIX 3: Typo fix (was boxHeight / 16)
      const y = screenHeight - boxBottomMargin - boxHeight / 2;

      if (isLandscape) {
        // Landscape: No overlap
        const spacing = 10;
        const visualWidth = CARD_WIDTH + spacing;
        const totalWidth = handSize * visualWidth - spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 1;
        return { x, y, rotation: 0 };
      } else {
        // Portrait: "Squeezing" logic
        const maxPlayerWidth = screenWidth * 0.9;
        const defaultVisualWidth = CARD_WIDTH * 0.6;
        let totalWidth = CARD_WIDTH + (handSize - 1) * defaultVisualWidth;
        let visualWidth = defaultVisualWidth;

        if (totalWidth > maxPlayerWidth && handSize > 1) {
          visualWidth = (maxPlayerWidth - CARD_WIDTH) / (handSize - 1);
          totalWidth = maxPlayerWidth;
        }
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 6;
        return { x, y, rotation: 0 };
      }
    }

    default:
      return { x: screenWidth / 2, y: screenHeight / 2, rotation: 0 };
  }
};