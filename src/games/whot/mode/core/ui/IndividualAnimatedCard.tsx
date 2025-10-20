// IndividualAnimatedCard.tsx (FIXED)
import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
 useSharedValue,
 useAnimatedStyle,
 withTiming,
 runOnJS,
} from "react-native-reanimated";
import { Canvas, SkFont } from "@shopify/react-native-skia";
import { Card } from "../types";
import {
 CARD_WIDTH,
 CARD_HEIGHT,
 AnimatedCard,
} from "./WhotCardTypes";
import { getCoords } from "../coordinateHelper";
import { AnimatedWhotCard } from "./AnimatedWhotCard";

export interface IndividualAnimatedCardHandle {
 dealTo: (
  target: "player" | "computer" | "pile",
  options?: any,
  instant?: boolean
 ) => Promise<void>;
 flip: (faceUp: boolean) => Promise<void>;
}

interface Props {
 card: Card;
 font: SkFont | null;
 whotFont: SkFont | null;
 marketPos: { x: number; y: number };
 isPlayerCard: boolean;
 onPress?: (card: Card) => void;
}

const IndividualAnimatedCard = forwardRef<IndividualAnimatedCardHandle, Props>(
 ({ card, font, whotFont, marketPos, onPress }, ref) => {
  
  // ✅ FIX 1: Early return is now at the VERY TOP.
  // This ensures hooks are never called conditionally.
  if (!font || !whotFont) {
   console.warn(`Card ${card.id} is not rendering because fonts are missing.`);
   return null;
  }

  // --- All Hooks are called below this line ---

  // Shared values for the ANCHOR POINT (top-left) of the Animated.View
  const x = useSharedValue(marketPos.x - CARD_WIDTH / 2);
  const y = useSharedValue(marketPos.y - CARD_HEIGHT / 2);
  const rotation = useSharedValue(0); // For fanning the hand (0deg, 5deg, etc.)
  
  // Shared value for the 3D FLIP animation (0 to PI)
  const cardRotate = useSharedValue(0);

  // ✅ FIX 2: Internal shared values are now at the top level.
  // These are for the Skia canvas (which doesn't move, its parent does)
  const internalX = useSharedValue(0);
  const internalY = useSharedValue(0);

  // Handle for dealing and flipping
  useImperativeHandle(ref, () => ({
   async dealTo(target, options, instant) {
    return new Promise((resolve) => {
     const { cardIndex, handSize } = options || {};
     const {
      x: targetX,
      y: targetY,
      rotation: targetRot,
     } = getCoords(target, { cardIndex, handSize });

     // Animate to top-left corner (center - half-size)
     const newX = targetX - CARD_WIDTH / 2;
     const newY = targetY - CARD_HEIGHT / 2;
     const newRot = targetRot || 0;
     const duration = 500;

     if (instant) {
      x.value = newX;
      y.value = newY;
      rotation.value = newRot;
      return resolve();
     }

     x.value = withTiming(newX, { duration });
     y.value = withTiming(newY, { duration });
     rotation.value = withTiming(newRot, { duration }, (finished) => {
      if (finished) {
       runOnJS(resolve)();
      }
     });
    });
   },

   async flip(show) {
    return new Promise((resolve) => {
     cardRotate.value = withTiming(
      show ? Math.PI : 0,
      { duration: 300 },
      (finished) => {
       if (finished) {
        runOnJS(resolve)();
       }
      }
      );
 	   });
   },
  }));

  // Tap gesture
  const tapGesture = useMemo(
   () =>
    Gesture.Tap().onEnd(() => {
     if (onPress) {
    	  runOnJS(onPress)(card);
     }
    }),
   [card, onPress]
 	);

  // Style for the parent Animated.View
  const animatedStyle = useAnimatedStyle(() => ({
   position: "absolute",
 	  width: CARD_WIDTH,
 	  height: CARD_HEIGHT,
 	  transform: [
 	   { translateX: x.value },
 	   { translateY: y.value },
 	   { rotate: `${rotation.value}deg` },
 	  ],
 	}));

  // ✅ FIX 3: useMemo now references the top-level shared values.
  const animatedCard: AnimatedCard = useMemo(
   () => ({
 	   ...card,
 	   x: internalX,
 	   y: internalY,
 	 	  rotate: cardRotate,
 	   width: CARD_WIDTH,
 	 	  height: CARD_HEIGHT,
 	   initialIndex: 0,
 	  }),
 	  [card, cardRotate, internalX, internalY] // Add new dependencies
 	);

 	return (
 	  <GestureDetector gesture={tapGesture}>
 	  <Animated.View style={animatedStyle}>
 	 	  <Canvas style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
 	 	 	  <AnimatedWhotCard
 	 	 	 	  card={animatedCard}
 	 	 	 	  font={font}
  	 	 	 	 whotFont={whotFont}
 	 	 	 	/>
 	 	 	  </Canvas>
 	 	  </Animated.View>
 	  </GestureDetector>
 	);
 }
);

export default IndividualAnimatedCard;