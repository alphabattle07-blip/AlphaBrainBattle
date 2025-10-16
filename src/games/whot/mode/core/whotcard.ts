import { useSharedValue } from 'react-native-reanimated';
import type { CardSuit } from './ui/WhotCardTypes';

export interface AnimatedCard {
  id: string;
  suit: CardSuit;
  number: number;
  x: import('react-native-reanimated').SharedValue<number>;
  y: import('react-native-reanimated').SharedValue<number>;
  rotate: import('react-native-reanimated').SharedValue<number>;
  isFaceUp: import('react-native-reanimated').SharedValue<boolean>;
}

export const useAnimatedCard = (initialCard: {
  id: string;
  suit: CardSuit;
  number: number;
  x?: number;
  y?: number;
  rotate?: number;
  isFaceUp?: boolean;
}): AnimatedCard => {
  const card = {
    ...initialCard,
    x: useSharedValue(initialCard.x ?? 0),
    y: useSharedValue(initialCard.y ?? 0),
    rotate: useSharedValue(initialCard.rotate ?? 0),
    isFaceUp: useSharedValue(initialCard.isFaceUp ?? true),
  };

  return card as AnimatedCard;
};