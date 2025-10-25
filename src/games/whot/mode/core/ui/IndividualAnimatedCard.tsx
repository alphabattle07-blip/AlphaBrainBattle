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
import { CARD_WIDTH, CARD_HEIGHT } from "./whotConfig";
import { AnimatedCard } from "./WhotCardTypes";
import { getCoords } from "../coordinateHelper";
import { AnimatedWhotCard } from "./AnimatedWhotCard";

export interface IndividualAnimatedCardHandle {
  dealTo: (
    target: "player" | "computer" | "pile" | "market", // ✅ Added "market"
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
  width: number; // Screen width
  height: number; // Screen height
  onPress?: (card: Card) => void;
}

const IndividualAnimatedCard = forwardRef<IndividualAnimatedCardHandle, Props>(
  (
    {
      card,
      font,
      whotFont,
      marketPos,
      width,
      height,
      onPress,
    },
    ref
  ) => {
    // Shared values for the ANCHOR POINT (top-left) of the Animated.View
    const x = useSharedValue(marketPos.x - CARD_WIDTH / 2);
    const y = useSharedValue(marketPos.y - CARD_HEIGHT / 2);
    const rotation = useSharedValue(0); // For fanning the hand

    // ✅ 1. Add a shared value for zIndex
    const zIndex = useSharedValue(1);

    // Shared value for the 3D FLIP animation (0 to PI)
    const cardRotate = useSharedValue(0);

    // Internal shared values for the Skia canvas
    const internalX = useSharedValue(0);
    const internalY = useSharedValue(0);

    // Handle for dealing and flipping
    useImperativeHandle(ref, () => ({
      async dealTo(target, options, instant) {
        return new Promise((resolve) => {
          const { cardIndex, handSize } = options || {};

          // ✅ 2. Update the zIndex based on the target and index
          // We add 100 to make sure player cards are always on top
          if (target === "player" || target === "computer") {
            // Card at index 0 gets zIndex 100
            // Card at index 1 gets zIndex 101 (and appears ON TOP of card 0)
            // This is the stacking you want!
            zIndex.value = 100 + (cardIndex || 0);
          } else if (target === "pile") {
            // Pile cards stack too, but below the hand
            zIndex.value = 50 + (cardIndex || 0);
          } else {
            // Market cards are at the bottom
            zIndex.value = 1;
          }

          const {
            x: targetX,
            y: targetY,
            rotation: targetRot,
          } = getCoords(target, { cardIndex, handSize }, width, height);

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
      // ✅ 3. Use the zIndex shared value
      zIndex: zIndex.value,
    }));

    // Data for the Skia <AnimatedWhotCard>
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
      [card, cardRotate, internalX, internalY]
    );

    // ✅ --- FIX: CONDITIONAL RETURN IS NOW *AFTER* ALL HOOKS ---
    // This is safe. All hooks have run, so React is happy.
    if (!font || !whotFont) {
      console.warn(`Card ${card.id} is not rendering because fonts are missing.`);
      return null;
    }

    // --- Render Logic ---
    // If we get here, font and whotFont are guaranteed to be loaded.
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