// AnimatedCardList.tsx (FIXED)
import React, {
 forwardRef,
 useImperativeHandle,
 useRef,
 useState,
 useEffect,
 useMemo, // ✅ Import useMemo
} from "react";
import { StyleSheet, View } from "react-native";
import { SkFont } from "@shopify/react-native-skia"; // ✅ Import SkFont

import IndividualAnimatedCard, {
 IndividualAnimatedCardHandle,
} from "./IndividualAnimatedCard";

import { Card } from "../types";
import { getCoords } from "../coordinateHelper"; // ✅ Import getCoords

// ✅ Define the props expected by WhotComputerGameScreen
interface Props {
 cardsInPlay: Card[];
 playerHand: Card[];
 font: SkFont | null;
 whotFont: SkFont | null;
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
   onCardPress,
   onReady,
  },
  ref
 ) => {
  const [uniqueCards, setUniqueCards] = useState<Card[]>([]);
  const cardRefs = useRef<Record<string, IndividualAnimatedCardHandle | null>>({});
  // ✅ Get the market position to pass down to individual cards
  const marketPosition = useMemo(() => getCoords("market"), []);

  useEffect(() => {
   if (!cardsInPlay) return;
   
   console.log("LOG All cards before unique filtering:", cardsInPlay.map((c) => c.id));
   const seen = new Set<string>();
   const filtered = cardsInPlay.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
   });
   
   console.log("LOG Unique cards after filtering:", filtered.map((c) => c.id));
   setUniqueCards(filtered);

   // ✅ Call onReady when cards are filtered
   // Use setTimeout to ensure refs are set in the render pass after this state update
   const timer = setTimeout(() => {
    if (onReady) {
     console.log("LOG ✅ Card list is ready, calling onReady().");
     onReady();
    }
   }, 0);
   
   return () => clearTimeout(timer);
  }, [cardsInPlay, onReady]); // Add onReady to dependency array

  // ✅ Implement the handle methods your screen expects
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

  // ❌ The old 'dealAll' and related 'dealt' prop logic are removed
  // as WhotComputerGameScreen handles the dealing sequence manually.

  return (
   <View style={styles.container}>
    {/* The Canvas is now inside each IndividualAnimatedCard */}
    {uniqueCards.map((card) => {
     // ✅ Determine if card is in player's hand
     const isPlayerCard = playerHand.some((c) => c.id === card.id);
     
     return (
      <IndividualAnimatedCard
       key={card.id}
       ref={(el) => (cardRefs.current[card.id] = el)}
       card={card}
       // ✅ Pass correct props down
       font={font}
       whotFont={whotFont}
       marketPos={marketPosition}
       isPlayerCard={isPlayerCard} // Note: flip is now controlled by flipCard
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
  // Add pointerEvents to allow tapping through the container
  pointerEvents: "box-none",
 },
});

export default AnimatedCardList;