// useWhotFonts.ts
import { useFont } from '@shopify/react-native-skia';

export const useWhotFonts = () => {
const font = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 20);
const whotFont = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 30);

const areLoaded = font !== null && whotFont !== null;

return {
 font,
 whotFont,
 areLoaded,
};
};