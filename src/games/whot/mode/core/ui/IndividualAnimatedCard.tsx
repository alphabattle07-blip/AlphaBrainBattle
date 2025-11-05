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
import { Card } from "../types"; // Make sure this path is correct
import { CARD_WIDTH, CARD_HEIGHT } from "./whotConfig";
import { AnimatedCard } from "./WhotCardTypes";
import { getCoords } from "../coordinateHelper"; // Make sure this path is correct
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
  playerHandIdsSV: SharedValue<string[]>; // From AnimatedCardList
  width: number;
  height: number;
  onPress: (card: Card) => void;
}

// =================================================================
// 1. The "Firewall" Component
// This component is memoized and ONLY receives stable props.
// It will not re-render when playerHandIdsSV changes.
// =================================================================
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

// =================================================================
// 2. The Main Component
// This component holds all the animation logic.
// =================================================================
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
      // --- Animated Values ---
      const x = useSharedValue(marketPos.x - CARD_WIDTH / 2);
      const y = useSharedValue(marketPos.y - CARD_HEIGHT / 2);
      const rotation = useSharedValue(0); // For fanning the hand
      const zIndex = useSharedValue(1);
      const cardRotate = useSharedValue(0); // For the flip
      const internalX = useSharedValue(0); // For Skia (can be 0)
      const internalY = useSharedValue(0); // For Skia (can be 0)

      // --- Stable Shared Value Props ---
      // We store the 'card' and 'onPress' props (which can change)
      // in shared values. This makes our gesture stable.
      const cardSV = useSharedValue(card);
      const onPressSV = useSharedValue(onPress);

      useEffect(() => {
        cardSV.value = card;
      }, [card, cardSV]);

      useEffect(() => {
        onPressSV.value = onPress;
      }, [onPress, onPressSV]);

      // --- Imperative Handle (for parent control) ---
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
              zIndex.value = 200; // High zIndex during animation
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
                zIndex.value = 50 + (cardIndex || 0); // Settle in pile
              }
              return resolve();
            }

            x.value = withTiming(newX, { duration });
            y.value = withTiming(newY, { duration });
            rotation.value = withTiming(newRot, { duration }, (finished) => {
              if (finished) {
                if (target === "pile") {
                  zIndex.value = 50 + (cardIndex || 0); // Settle in pile
                }
                runOnJS(resolve)();
              }
            });
          });
        },

        async flip(show) {
          return new Promise((resolve) => {
            cardRotate.value = withTiming(
              show ? Math.PI : 0, // 0 = back, PI = front
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

      // --- Tap Gesture ---
      // !! THIS IS THE CRITICAL FIX !!
      const tapGesture = useMemo(
        () =>
          Gesture.Tap().onEnd(() => {
            "worklet";

            // We read all values from shared values *at the moment of the tap*.
            const handIds = playerHandIdsSV.value;
            const currentCard = cardSV.value;
            const currentOnPress = onPressSV.value;

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
        // The dependency array ONLY includes the stable SVs.
        // It does NOT include `playerHandIdsSV`, which stops the
        // gesture from being re-created when paging!
        [cardSV, onPressSV, playerHandIdsSV] // This is correct now, as playerHandIdsSV is a stable SV object.
      );

      // --- Animated Style ---
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

      // --- Skia Data ---
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

      // --- Render ---
      if (!font || !whotFont) {
        // console.warn(`Card ${card.id} missing fonts.`);
        return null;
      }

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