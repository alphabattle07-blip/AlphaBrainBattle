// core/ui/AnimatedCardList.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import { StyleSheet, View } from "react-native";
import { SkFont } from "@shopify/react-native-skia";

import IndividualAnimatedCard, {
  IndividualAnimatedCardHandle,
} from "./IndividualAnimatedCard";

import { Card } from "../types";
import { getCoords } from "../coordinateHelper";

// ✅ Define the props
interface Props {
  cardsInPlay: Card[];
  playerHand: Card[];
  font: SkFont | null;
  whotFont: SkFont | null;
  width: number; // ✅ Screen width
  height: number; // ✅ Screen height
  onCardPress?: (card: Card) => void;
  onReady?: () => void;
}

// ✅ Define the correct handle API
export interface AnimatedCardListHandle {
  dealCard: (
    card: Card,
    target: "player" | "computer" | "pile",
    options: { cardIndex: number; handSize?: number },
    instant?: boolean
  ) => Promise<void>;
  flipCard: (card: Card, faceUp: boolean) => Promise<void>;
}

const AnimatedCardList = forwardRef<AnimatedCardListHandle, Props>(
  (
    {
      cardsInPlay,
      playerHand,
      font,
      whotFont,
      width, // ✅ Get width
      height, // ✅ Get height
      onCardPress,
      onReady,
    },
    ref
  ) => {
    const [uniqueCards, setUniqueCards] = useState<Card[]>([]);
    const cardRefs =
      useRef<Record<string, IndividualAnimatedCardHandle | null>>({});

    // ✅ Get the market position dynamically
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

    // ✅ Implement the handle methods
    useImperativeHandle(ref, () => ({
      async dealCard(card, target, options, instant) {
        const cardRef = cardRefs.current[card.id];
        if (cardRef) {
          await cardRef.dealTo(target, options, instant);
        } else {
          console.warn(`No ref found for card ${card.id} to deal.`);
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
              width={width} // ✅ Pass width down
              height={height} // ✅ Pass height down
              onPress={onCardPress}
            />
          );
        })}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    pointerEvents: "box-none",
  },
});

export default AnimatedCardList;