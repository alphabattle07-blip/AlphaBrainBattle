// File: Alpha-Battle/src/games/whot/mode/core/ui/useWhotFonts.ts
import { useFont } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';

export const useWhotFonts = () => {
  // ✅ Replace with your actual font files in assets/fonts/
  const font = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 20);
  const whotFont = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 30);

  const areLoaded = font !== undefined && whotFont !== undefined;

  return {
    font,
    whotFont,
    areLoaded,
  };
};


