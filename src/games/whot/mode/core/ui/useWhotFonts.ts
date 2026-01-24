// useWhotFonts.ts
import { useFont } from '@shopify/react-native-skia';
import { useEffect } from 'react';

export const useWhotFonts = () => {
    let font = null;
    let whotFont = null;

    try {
        // Use require once and pass to useFont
        const fontModule = require('../../../../../assets/fonts/SpaceMono-Regular.ttf');
        font = useFont(fontModule, 12);
        whotFont = useFont(fontModule, 24);
    } catch (error) {
        console.error('❌ Error loading Skia fonts:', error);
    }

    const areLoaded = font !== null && whotFont !== null;

    useEffect(() => {
        if (areLoaded) {
            console.log('✅ Skia fonts loaded successfully');
        } else {
            console.warn('⚠️ Skia fonts not loaded yet. Font:', !!font, 'WhotFont:', !!whotFont);
        }
    }, [areLoaded, font, whotFont]);

    return {
        font,
        whotFont,
        areLoaded,
    };
};