import React, { forwardRef, useImperativeHandle } from "react";
import { Group, Skia, type SkFont } from "@shopify/react-native-skia";
import Animated, {
 useSharedValue,
 withTiming,
 Easing,
 runOnJS,
 useDerivedValue,
} from "react-native-reanimated";

import { AnimatedWhotCard } from "./AnimatedWhotCard";
import type { Card } from "./WhotCardTypes";
import { CARD_WIDTH, CARD_HEIGHT } from "./WhotCardTypes";

export type AnimatedCardValues = {
 x: Animated.SharedValue<number>;
 y: Animated.SharedValue<number>;
};

export interface IndividualCardHandle {
 moveCard: (targetX: number, targetY: number) => Promise<void>;
 flipCard: (isFaceUp: boolean) => Promise<void>;
 animatedValues: AnimatedCardValues;
}

interface IndividualAnimatedCardProps {
 card: Card;
 initialPosition: { x: number; y: number };
 initialIndex: number;
 // ✅ Accept fonts as props
 font: SkFont;
 whotFont: SkFont;
}

const IndividualAnimatedCard = forwardRef<IndividualCardHandle, IndividualAnimatedCardProps>(
 ({ card, initialPosition, initialIndex, font, whotFont }, ref) => {
  const x = useSharedValue(initialPosition.x - CARD_WIDTH / 2);
  const y = useSharedValue(initialPosition.y - CARD_HEIGHT / 2);
  const rotate = useSharedValue(0);

  const matrix = useDerivedValue(() => {
   "worklet";
   const m = Skia.Matrix();
   m.translate(x.value, y.value);
   return m;
  });

  useImperativeHandle(ref, () => ({
   moveCard: (targetX, targetY) => {
    return new Promise((resolve) => {
     const onComplete = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(resolve)();
     };
     x.value = withTiming(
      targetX - CARD_WIDTH / 2,
      { duration: 600, easing: Easing.out(Easing.cubic) },
      onComplete
     );
     y.value = withTiming(
      targetY - CARD_HEIGHT / 2,
      { duration: 600, easing: Easing.out(Easing.cubic) }
     );
    });
   },
   flipCard: (isFaceUp) => {
    return new Promise((resolve) => {
     const onComplete = (finished?: boolean) => {
      "worklet";
      if (finished) runOnJS(resolve)();
     };
     rotate.value = withTiming(
      isFaceUp ? Math.PI : 0,
      { duration: 500 },
      onComplete
     );
    });
   },
   animatedValues: { x, y },
  }));

  return (
   <Group matrix={matrix}>
    <AnimatedWhotCard
     card={{
      ...card,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      rotate,
     }}
     // ✅ Pass fonts down
     font={font}
     whotFont={whotFont}
    />
   </Group>
  );
 }
);

export default IndividualAnimatedCard;
