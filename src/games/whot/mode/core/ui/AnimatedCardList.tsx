// core/ui/AnimatedCardList.tsx

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useMemo,
  memo, // 1. Import memo
  useCallback,
  MutableRefObject, // 2. Import useCallback
} from "react";
import { StyleSheet, View } from "react-native";
import { SkFont } from "@shopify/react-native-skia";
import { SharedValue } from "react-native-reanimated";

import IndividualAnimatedCard, {
  IndividualAnimatedCardHandle,
} from "./IndividualAnimatedCard";

import { Card } from "../types";
import { getCoords } from "../coordinateHelper";

interface Props {
  cardsInPlay: Card[];
  playerHandIdsSV: SharedValue<string[]>; // 2. ✅ NEW
  font: SkFont | null;
  whotFont: SkFont | null;
  width: number;
  height: number;
  onCardPress?: (card: Card) => void;
  onReady?: () => void;
}
export interface AnimatedCardListHandle {
  dealCard: (
    card: Card,
    target: "player" | "computer" | "pile" | "market",
    options: { cardIndex: number; handSize?: number },
    instant?: boolean
  ) => Promise<void>;
  teleportCard: (
    card: Card,
    target: "player" | "computer" | "pile" | "market",
    options: { cardIndex: number; handSize?: number }
  ) => void;

  flipCard: (card: Card, faceUp: boolean) => Promise<void>;
}

const AnimatedCardList = memo(
  forwardRef<AnimatedCardListHandle, Props>(
    (
      {
        cardsInPlay,
        playerHandIdsSV,
        font,
        whotFont,
        width,
        height,
        onCardPress,
        onReady,
      },
      ref
    ) => {
      console.log("LOG: 🔴 AnimatedCardList re-rendered."); // As seen in your logs
      // const [uniqueCards, setUniqueCards] = useState<Card[]>([]);
      const cardRefs = useRef<
        Record<string, IndividualAnimatedCardHandle | null>
      >({});

      const marketPosition = useMemo(
        () => getCoords("market", {}, width, height),
        [width, height]
      );

      const uniqueCards = useMemo(() => {
    console.log("LOG: 🧬 Recalculating uniqueCards list (should only be once)");
    if (!cardsInPlay) return [];

    const seen = new Set<string>();
    return cardsInPlay.filter((c) => {
     if (seen.has(c.id)) return false;
     seen.add(c.id);
     return true;
    });
   }, [cardsInPlay]);

useEffect(() => {
    // We are "ready" as soon as we have cards to render
    if (uniqueCards.length > 0 && onReady) {
     const timer = setTimeout(() => {
      console.log("LOG ✅ Card list is ready, calling onReady().");
      onReady();
     }, 0);
     return () => clearTimeout(timer);
    }
    // Depend on the memoized list and the stable onReady callback
   }, [uniqueCards, onReady]);

      useImperativeHandle(ref, () => ({
        async dealCard(card, target, options, instant) {
          const cardRef = cardRefs.current[card.id];
          if (cardRef) {
            await cardRef.dealTo(target, options, instant);
          } else {
            console.warn(`No ref found for card ${card.id} to deal.`);
          }
        },

        teleportCard(card, target, options) {
          const cardRef = cardRefs.current[card.id];
          if (cardRef) {
            cardRef.teleportTo(target, options); // Changed to teleportTo
          } else {
            console.warn(`No ref found for card ${card.id} to teleport.`);
          }
        },
        async flipCard(card, faceUp) {
          const cardRef = cardRefs.current[card.id];
          if (cardRef) {
            await cardRef.flip(faceUp);
          } else {
            console.warn(`No ref found for card ${card.id} to flip.`);
          }
        },
      }));

      const handleCardPress = useCallback(
        (card: Card) => {
          if (onCardPress) {
            onCardPress(card);
          }
        },
        [onCardPress] // Dependency is stable
      );

      return (
        <View style={styles.container}>
         {uniqueCards.map((card) => {
            // ✅ READ FROM THE REF
            

            return (
              <IndividualAnimatedCard
                key={card.id}
                ref={(el) => (cardRefs.current[card.id] = el)}
                card={card}
                font={font}
                whotFont={whotFont}
                marketPos={marketPosition}
                playerHandIdsSV={playerHandIdsSV}
                width={width}
                height={height}
                // 4. ✅ PASS THE STABLE FUNCTION
                onPress={handleCardPress}
              />
            );
          })}
        </View>
      );
    }
  )
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none", // Allow taps to pass through
  },
});

export default AnimatedCardList;