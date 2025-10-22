// core/ui/MarketPile.tsx
// (Replace the old file with this)

import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Group, type SkFont, Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from "react-native-reanimated";
import { WhotCardBack } from './WhotCardBack';
import { Card } from '../types';
import { CARD_WIDTH, CARD_HEIGHT } from "./WhotCardTypes";
import { getCoords } from '../coordinateHelper';

interface MarketPileProps {
  cards: Card[];
  font: SkFont | null;
  smallFont: SkFont | null;
  onPress?: () => void;
  width: number; // ✅ Screen width
  height: number; // ✅ Screen height
}

export const MarketPile = ({
  cards,
  font,
  smallFont,
  onPress,
  width,
  height,
}: MarketPileProps) => {
  // ✅ Calculate position based on screen size
  const marketPos = useMemo(
    () => getCoords('market', {}, width, height),
    [width, height]
  );

  // ✅ Position the component using a style
  const style = useMemo(
    () => ({
      position: 'absolute' as const,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      top: marketPos.y - CARD_HEIGHT / 2,
      left: marketPos.x - CARD_WIDTH / 2,
      zIndex: 5, // Make sure it's clickable
    }),
    [marketPos]
  );

  // ✅ Create the tap gesture
  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        if (onPress) {
          runOnJS(onPress)();
        }
      }),
    [onPress]
  );

  // ✅ Don't render if no cards or no fonts
  if (cards.length === 0 || !font || !smallFont) {
    return null;
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={style}>
        {/* Canvas for the card back */}
        <Canvas style={StyleSheet.absoluteFill}>
          <Group>
            <WhotCardBack
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              font={font}
              smallFont={smallFont}
            />
          </Group>
        </Canvas>

        {/* ✅ Native View for the count badge */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{cards.length}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    left: -12,
    top: 8,
    backgroundColor: '#00008B', // Dark Blue
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});