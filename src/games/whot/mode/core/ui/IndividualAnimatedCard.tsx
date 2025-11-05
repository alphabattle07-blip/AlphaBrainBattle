// IndividualAnimatedCard.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  memo,
  useEffect,
} from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
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

interface CardRendererProps {
  card: AnimatedCard;
  font: SkFont;
  whotFont: SkFont;
  style: any; // The animated style
  gesture: any; // The tap gesture
}

const MemoizedCardRenderer = memo(
  ({ card, font, whotFont, style, gesture }: CardRendererProps) => {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={style}>
          <Canvas style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <AnimatedWhotCard
              card={card}
              font={font}
              whotFont={whotFont}
            />
          </Canvas>
        </Animated.View>
      </GestureDetector>
    );
  }
);

const IndividualAnimatedCard = memo(
  forwardRef<IndividualAnimatedCardHandle, Props>(
    (
      {
        card,
        font,
        whotFont,
        marketPos,
        playerHandIdsSV, 
        width,
        height,
        onPress,
      },
      ref
    ) => {
      // console.log(`LOG: 🔴 Card ${card.id} re-rendered.`); // Optional: remove for cleaner logs
      const x = useSharedValue(marketPos.x - CARD_WIDTH / 2);
      const y = useSharedValue(marketPos.y - CARD_HEIGHT / 2);
      const rotation = useSharedValue(0); // For fanning the hand

      const zIndex = useSharedValue(1);
      const cardRotate = useSharedValue(0);
      const internalX = useSharedValue(0);
      const internalY = useSharedValue(0);

      const cardSV = useSharedValue(card);
      const onPressSV = useSharedValue(onPress);

       useEffect(() => {
        cardSV.value = card;
      }, [card, cardSV]);

      useEffect(() => {
        onPressSV.value = onPress;
      }, [onPress, onPressSV]);

      // Handle for dealing and flipping
      useImperativeHandle(ref, () => ({
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
// IndividualAnimatedCard.tsx

const tapGesture = useMemo(
        () =>
          Gesture.Tap().onEnd(() => {
            "worklet"; 

            // 5. ✅ Read from the new shared values
            const handIds = playerHandIdsSV.value;
            const currentCard = cardSV.value; // Read from SV
            const currentOnPress = onPressSV.value; // Read from SV

            let isPlayerCard = false;
            for (let i = 0; i < handIds.length; i++) {
              if (handIds[i] === currentCard.id) {
                isPlayerCard = true;
                break;
              }
            }

            if (isPlayerCard && currentOnPress) {
              runOnJS(currentOnPress)(currentCard);
            }
          }),
        [ cardSV, onPressSV] // 6. ✅ Use the STABLE shared value objects as dependencies
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
    <MemoizedCardRenderer
     card={animatedCard}
     font={font}
     whotFont={whotFont}
     style={animatedStyle}
     gesture={tapGesture}
    />
   );
  }
 )
);
export default IndividualAnimatedCard;