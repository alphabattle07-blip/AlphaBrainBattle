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
import { CARD_WIDTH, CARD_HEIGHT } from "./whotConfig"; // ✅ FIX IS HERE
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
      const cardSV = useSharedValue(card);

      // Store onPress in a ref (not SharedValue) to avoid worklet/JS thread issues
      const onPressRef = useRef(onPress);

      useEffect(() => {
        cardSV.value = card;
      }, [card, cardSV]);

      useEffect(() => {
        onPressRef.current = onPress;
      }, [onPress]);

      // Stable callback that worklet can safely call via runOnJS
      const handleCardPress = useMemo(() => (cardData: Card) => {
        if (onPressRef.current) {
          onPressRef.current(cardData);
        }
      }, []);

      // --- Imperative Handle (for parent control) ---
      useImperativeHandle(ref, () => ({
        teleportTo(target, options) {
          const { cardIndex, handSize } = options || {};

          // ✅ This is for teleport, so INSTANT zIndex is correct
          if (target === "player") {
            zIndex.value = 100 + (cardIndex || 0);
          } else if (target === "computer") {
            zIndex.value = 200 + (cardIndex || 0); // <-- 200+
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

            // ✅ --- START OF Z-INDEX FIX --- ✅
            if (instant) {
              // If instant, set the final z-index immediately
              if (target === "player") {
                zIndex.value = 100 + (cardIndex || 0);
              } else if (target === "computer") {
                zIndex.value = 200 + (cardIndex || 0); // <-- 200+
              } else if (target === "pile") {
                zIndex.value = 50 + (cardIndex || 0);
              } else {
                zIndex.value = 1;
              }
            } else {
              // If ANIMATING, do NOT change zIndex here.
              // Let it animate from its current layer.
            }
            // ✅ --- END OF Z-INDEX FIX --- ✅

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
              // (The z-index was already set above)
              return resolve();
            }

            x.value = withTiming(newX, { duration });
            y.value = withTiming(newY, { duration });
            rotation.value = withTiming(newRot, { duration }, (finished) => {
              if (finished) {
                // ✅ --- START OF Z-INDEX FIX 2 --- ✅
                // Animation is done, now "settle" the card
                if (target === "player") {
                  zIndex.value = 100 + (cardIndex || 0);
                } else if (target === "computer") {
                  zIndex.value = 200 + (cardIndex || 0); // <-- 200+
                } else if (target === "pile") {
                  zIndex.value = 50 + (cardIndex || 0); // <-- THIS WAS MISSING IN YOURS
                }
                // ✅ --- END OF Z-INDEX FIX 2 --- ✅
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
      const tapGesture = useMemo(
        () =>
          Gesture.Tap().onEnd(() => {
            "worklet";

            const handIds = playerHandIdsSV.value;
            const currentCard = cardSV.value;

            let isPlayerCard = false;
            for (let i = 0; i < handIds.length; i++) {
              if (handIds[i] === currentCard.id) {
                isPlayerCard = true;
                break;
              }
            }

            if (isPlayerCard) {
              runOnJS(handleCardPress)(currentCard);
            }
          }),
        [cardSV, playerHandIdsSV, handleCardPress]
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