// core/ui/AnimatedCardList.tsx

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useMemo,
  memo, // 1. Import memo
  useCallback, // 2. Import useCallback
} from "react";
import { StyleSheet, View } from "react-native";
import { SkFont } from "@shopify/react-native-skia";

import IndividualAnimatedCard, {
  IndividualAnimatedCardHandle,
} from "./IndividualAnimatedCard";

import { Card } from "../types";
import { getCoords } from "../coordinateHelper";

interface Props {
  cardsInPlay: Card[];
  playerHand: Card[];
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
        playerHand,
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
      const [uniqueCards, setUniqueCards] = useState<Card[]>([]);
      const cardRefs = useRef<
        Record<string, IndividualAnimatedCardHandle | null>
      >({});

      const marketPosition = useMemo(
        () => getCoords("market", {}, width, height),
        [width, height]
      );

      useEffect(() => {
        if (!cardsInPlay) return;

        const seen = new Set<string>();
        const filtered = cardsInPlay.filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });

        setUniqueCards(filtered);

        const timer = setTimeout(() => {
          if (onReady) {
            console.log("LOG ✅ Card list is ready, calling onReady().");
            onReady();
          }
        }, 0);

        return () => clearTimeout(timer);
      }, [cardsInPlay, onReady]);

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
            const isPlayerCard = playerHand.some((c) => c.id === card.id);

            return (
              <IndividualAnimatedCard
                key={card.id}
                ref={(el) => (cardRefs.current[card.id] = el)}
                card={card}
                font={font}
                whotFont={whotFont}
                marketPos={marketPosition}
                isPlayerCard={isPlayerCard}
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