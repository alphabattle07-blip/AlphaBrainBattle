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
      // ✅ FIX 2: This is the new layout.
      // It's ALWAYS in the center, just offset to the left.
      if (isLandscape) {
        return {
          x: deckCenterX - CARD_WIDTH * 0.7,
          y: deckCenterY,
          rotation: 0,
        };
      }
      // Your working portrait logic (bottom-right)
      return {
    x: deckCenterX - CARD_WIDTH * 0.7,
    y: deckCenterY , // perfectly centered vertically
    rotation: 0,
  };

    // --- COMPUTER (Top Hand) ---
    case "computer": {
      const boxTopMargin = isLandscape ? 20 : 40;
      const boxHeight = CARD_HEIGHT + 40;
      const y = boxTopMargin + boxHeight / 2;

      if (isLandscape) {
        // Landscape: No overlap
        const spacing = 10;
        const visualWidth = CARD_WIDTH + spacing;
        const totalWidth = handSize * visualWidth - spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
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
// --- PLAYER (Bottom Hand) ---
case "player": {
  const boxBottomMargin = isLandscape ? 20 : 40;
  const boxHeight = CARD_HEIGHT + 40;

  // ✅ FIX: Only lift card up in portrait
  const y = isLandscape
    ? screenHeight - boxBottomMargin - boxHeight / 2 // landscape stays the same
    : screenHeight - boxBottomMargin - boxHeight / 2 + 74; // portrait lifted

  if (isLandscape) {
    // Landscape: No overlap (unchanged)
    const spacing = 10;
    const visualWidth = CARD_WIDTH + spacing;
    const totalWidth = handSize * visualWidth - spacing;
    const startX = (screenWidth - totalWidth) / 2;
    const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
    return { x, y, rotation: 0 };
  } else {
    // Portrait: Squeezing logic (unchanged)
    const maxPlayerWidth = screenWidth * 0.9;
    const defaultVisualWidth = CARD_WIDTH * 0.6;
    let totalWidth = CARD_WIDTH + (handSize - 1) * defaultVisualWidth;
    let visualWidth = defaultVisualWidth;

    if (totalWidth > maxPlayerWidth && handSize > 1) {
      visualWidth = (maxPlayerWidth - CARD_WIDTH) / (handSize - 1);
      totalWidth = maxPlayerWidth;
    }

    const startX = (screenWidth - totalWidth) / 2;
    const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
    return { x, y, rotation: 0 };
  }
}


    default:
      return { x: screenWidth / 2, y: screenHeight / 2, rotation: 0 };
  }
};