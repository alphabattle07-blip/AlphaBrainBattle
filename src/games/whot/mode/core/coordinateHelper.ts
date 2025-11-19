// core/coordinateHelper.ts

import { CARD_WIDTH, CARD_HEIGHT } from "../core/ui/whotConfig";

type Target = "player" | "computer" | "pile" | "market";
interface CoordsOptions {
  cardIndex?: number;
  handSize?: number;
}

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
      return {
        x: deckCenterX + CARD_WIDTH * 0.7,
        y: isLandscape ? deckCenterY : screenHeight * 0.45,
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
      return {
        x: deckCenterX - CARD_WIDTH * 0.7,
        y: deckCenterY,
        rotation: 0,
      };

    // --- COMPUTER (Top Hand) ---
    case "computer": {
      const boxTopMargin = isLandscape ? 10 : 20;
      const boxHeight = CARD_HEIGHT + 10;
      // kept your specific Y adjustment
      const y = boxTopMargin + boxHeight / 1.5; 

      if (isLandscape) {
        // Landscape: No overlap
        const spacing = 10;
        const visualWidth = CARD_WIDTH + spacing;
        const totalWidth = handSize * visualWidth - spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
        return { x, y, rotation: 0 };
      } else {
        // ✅ PORTRAIT: FIXED 7-CARD WIDTH LIMIT
        
        const defaultSpacing = CARD_WIDTH * 0.4; // Normal spacing
        const maxCardsBeforeSqueeze = 7; // The limit you requested

        // 1. Calculate the Maximum Allowed Width (Width of exactly 7 cards)
        const maxAllowedWidth = CARD_WIDTH + (maxCardsBeforeSqueeze - 1) * defaultSpacing;

        let visualWidth = defaultSpacing;
        let totalWidth = CARD_WIDTH + (handSize - 1) * defaultSpacing;

        // 2. If handSize > 7, force total width to stay at maxAllowedWidth
        //    and shrink the spacing (visualWidth) to fit.
        if (handSize > maxCardsBeforeSqueeze) {
           totalWidth = maxAllowedWidth;
           visualWidth = (maxAllowedWidth - CARD_WIDTH) / (handSize - 1);
        }

        // 3. Calculate Start Position (Centered + Your Offset)
        // I kept your (screenWidth * 0.07) offset
        const startX = (screenWidth - totalWidth) / 2 + (screenWidth * 0.07);

        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 2;
        
        return { x, y, rotation: 0 };
      }
    }

    // --- PLAYER (Bottom Hand) ---
    case "player": {
      const boxBottomMargin = isLandscape ? 10 : 20;
      const boxHeight = CARD_HEIGHT + 10;
      const y = screenHeight - boxBottomMargin - boxHeight / 2;

      if (isLandscape) {
        const spacing = 10;
        const visualWidth = CARD_WIDTH + spacing;
        const totalWidth = handSize * visualWidth - spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const x = startX + cardIndex * visualWidth + CARD_WIDTH / 1;
        return { x, y, rotation: 0 };
      } else {
        // Player Squeezing logic (unchanged)
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