import { useFont } from '@shopify/react-native-skia';

export const useWhotFonts = () => {
// ✅ Use the reliable relative path. Go up 6 levels from /ui to the project root.
const font = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 20);
const whotFont = useFont(require('../../../../../assets/fonts/SpaceMono-Regular.ttf'), 30);

const areLoaded = font !== null && whotFont !== null;

return {
 font,
 whotFont,
 areLoaded,
};
};