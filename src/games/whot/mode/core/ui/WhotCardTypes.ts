import type { SkFont } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export type CardSuit = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

export interface Card {
    id: string;
    suit: string;
    number?: number;
    rank: string;
}

// Animated Card structure used by Skia/Reanimated
export interface AnimatedCard extends Card {
    x: SharedValue<number>;
    y: SharedValue<number>;
    rotate: SharedValue<number>; // 0 to 1 (0 to 180 
    width: number;
    height: number;
    initialIndex: number;
}
export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 120;