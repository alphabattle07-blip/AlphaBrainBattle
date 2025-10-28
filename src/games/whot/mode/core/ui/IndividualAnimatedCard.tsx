// IndividualAnimatedCard.tsx

import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  memo, // 1. Import memo
} from "react";
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
    target: "player" | "computer" | "pile" | "market",
    options?: any,
    instant?: boolean
  ) => Promise<void>;
  flip: (faceUp: boolean) => Promise<void>;
  teleportTo: (
    target: "player" | "computer" | "pile" | "market",
    options?: any
  ) => void;
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

// 2. Wrap the entire forwardRef in memo()
const IndividualAnimatedCard = memo(
  forwardRef<IndividualAnimatedCardHandle, Props>(
    (
      { card, font, whotFont, marketPos, width, height, onPress },
      ref
    ) => {
      // ... (all the existing code inside the component remains the same)
      const x = useSharedValue(marketPos.x - CARD_WIDTH / 2);
      const y = useSharedValue(marketPos.y - CARD_HEIGHT / 2);
      const rotation = useSharedValue(0); // For fanning the hand

      const zIndex = useSharedValue(1);
      const cardRotate = useSharedValue(0);
      const internalX = useSharedValue(0);
      const internalY = useSharedValue(0);

      // Handle for dealing and flipping
      useImperativeHandle(ref, () => ({
        // ... (teleportTo, dealTo, flip functions)
        teleportTo(target, options) {
          const { cardIndex, handSize } = options || {};

          if (target === "player" || target === "computer") {
            zIndex.value = 100 + (cardIndex || 0);
          } else if (target === "pile") {
            zIndex.value = 50 + (cardIndex || 0);
          } else {
            zIndex.value = 1;
          }

          const {
            x: targetX,
            y: targetY,
            rotation: targetRot,
          } = getCoords(target, { cardIndex, handSize }, width, height);

          const newX = targetX - CARD_WIDTH / 2;
          const newY = targetY - CARD_HEIGHT / 2;
          const newRot = targetRot || 0;

          x.value = newX;
          y.value = newY;
          rotation.value = newRot;
        },

        async dealTo(target, options, instant) {
          return new Promise((resolve) => {
            const { cardIndex, handSize } = options || {};

            if (target === "player" || target === "computer") {
              zIndex.value = 100 + (cardIndex || 0);
            } else if (target === "pile") {
              zIndex.value = 200;
            } else {
              zIndex.value = 1;
            }

            const {
              x: targetX,
              y: targetY,
              rotation: targetRot,
            } = getCoords(target, { cardIndex, handSize }, width, height);

            const newX = targetX - CARD_WIDTH / 2;
            const newY = targetY - CARD_HEIGHT / 2;
            const newRot = targetRot || 0;
            const duration = 500;

            if (instant) {
              x.value = newX;
              y.value = newY;
              rotation.value = newRot;
              if (target === "pile") {
                zIndex.value = 50 + (cardIndex || 0);
              }
              return resolve();
            }

            x.value = withTiming(newX, { duration });
            y.value = withTiming(newY, { duration });
            rotation.value = withTiming(newRot, { duration }, (finished) => {
              if (finished) {
                if (target === "pile") {
                  zIndex.value = 50 + (cardIndex || 0);
                }
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

      if (!font || !whotFont) {
        console.warn(
          `Card ${card.id} is not rendering because fonts are missing.`
        );
        return null;
      }

      // --- Render Logic ---
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
  )
);
export default IndividualAnimatedCard;