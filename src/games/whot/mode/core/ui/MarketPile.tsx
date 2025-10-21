// MarketPile.tsx
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Group, type SkFont, Canvas } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler'; // ✅ Import Gesture Handler
import Animated, { runOnJS } from 'react-native-reanimated'; // ✅ Import Animated
import { WhotCardBack } from './WhotCardBack';
import { CARD_WIDTH, CARD_HEIGHT, Card } from './WhotCardTypes';
import { getCoords } from '../coordinateHelper';

interface MarketPileProps {
  cards: Card[];
  font: SkFont | null;
  smallFont: SkFont | null;
  onPress?: () => void; // ✅ onPress prop
}

export const MarketPile = ({ cards, font, smallFont, onPress }: MarketPileProps) => {
  const marketPos = useMemo(() => getCoords('market'), []);
    
    // ✅ Position the component using a style
  const style = useMemo(() => ({
    position: 'absolute' as const,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
        // ✅ Use top/left for the view's position
    top: marketPos.y - CARD_HEIGHT / 2,
    left: marketPos.x - CARD_WIDTH / 2,
  }), [marketPos]);

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
        // ✅ Wrap everything in the detector
    <GestureDetector gesture={tapGesture}>
            {/* ✅ This is the touchable, positioned view */}
      <Animated.View style={style}>
                {/* ✅ It contains its own canvas */}
        <Canvas style={StyleSheet.absoluteFill}>
                    {/* ✅ Group is now at (0,0) because the parent is positioned */}
          <Group> 
            {cards.map((card, index) => (
              <Group key={card.id} transform={[{ translateY: index * 0.4 }]}>
                <WhotCardBack 
                  width={CARD_WIDTH} 
                  height={CARD_HEIGHT} 
                  font={font} 
                  smallFont={smallFont} 
                />
           </Group>
            ))}
          </Group>
       </Canvas>
      </Animated.View>
    </GestureDetector>
  );
};