import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { Canvas, type SkFont } from "@shopify/react-native-skia";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import type { Card } from "./WhotCardTypes";
import { getCoords } from "../coordinateHelper";
import { CARD_WIDTH, CARD_HEIGHT } from "./WhotCardTypes";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import IndividualAnimatedCard, {
 IndividualCardHandle,
 AnimatedCardValues,
} from "./IndividualAnimatedCard";

export interface AnimatedCardListHandle {
 dealCard: (
  card: Card,
  target: "player" | "computer" | "pile",
  options: { cardIndex: number; handSize: number },
  shouldFlip: boolean
 ) => Promise<void>;
 flipCard: (card: Card, isFaceUp: boolean) => Promise<void>;
}

interface AnimatedCardListProps {
 cardsInPlay: Card[];
 marketPos: { x: number; y: number };
 onCardPress: (card: Card) => void;
 onReady: () => void;
 // ✅ Accept fonts as props
 font: SkFont;
 whotFont: SkFont;
}

const AnimatedCardList = forwardRef<
 AnimatedCardListHandle,
 AnimatedCardListProps
>(({ cardsInPlay, marketPos, onCardPress, onReady, font, whotFont }, ref) => {
 const cardRefs = useRef<{ [id: string]: IndividualCardHandle | null }>({});
 const cardAnimatedValues = useSharedValue<{
  [id: string]: AnimatedCardValues | undefined;
 }>({});
 const hasCalledReady = useRef(false);
 const [refsReadyCount, setRefsReadyCount] = useState(0);

 useImperativeHandle(ref, () => ({
  dealCard: async (cardToDeal, target, options, shouldFlip) => {
   const cardRef = cardRefs.current[cardToDeal.id];
   if (!cardRef) return;
   const coords = getCoords(target, options);
   const movePromise = cardRef.moveCard(coords.x, coords.y);
   const flipPromise = shouldFlip ? cardRef.flipCard(true) : Promise.resolve();
   await Promise.all([movePromise, flipPromise]);
  },
  flipCard: async (cardToFlip, isFaceUp) => {
   const cardRef = cardRefs.current[cardToFlip.id];
   if (!cardRef) return;
   await cardRef.flipCard(isFaceUp);
  },
 }));

 useEffect(() => {
  if (refsReadyCount === cardsInPlay.length && cardsInPlay.length > 0 && !hasCalledReady.current) {
   console.log("🚀 AnimatedCardList is ready! Starting animations...");
   onReady();
   hasCalledReady.current = true;
  }
 }, [refsReadyCount, cardsInPlay.length, onReady]);

 const tapGesture = Gesture.Tap().onEnd((event) => {
  "worklet";
  console.log("Tap detected at:", event.x, event.y);
  for (let i = cardsInPlay.length - 1; i >= 0; i--) {
   const card = cardsInPlay[i];
   const animatedValues = cardAnimatedValues.value[card.id];
   if (!animatedValues) {
    console.log("No animated values for card:", card.id);
    continue;
   }
   const { x, y } = animatedValues;
   console.log(`Checking card ${card.id}: x=${x.value}, y=${y.value}, width=${CARD_WIDTH}, height=${CARD_HEIGHT}`);
   if (
    event.x >= x.value &&
    event.x <= x.value + CARD_WIDTH &&
    event.y >= y.value &&
    event.y <= y.value + CARD_HEIGHT
   ) {
    console.log("Card tapped:", card);
    runOnJS(onCardPress)(card);
    break;
   }
  }
 });

 return (
  <GestureDetector gesture={tapGesture}>
   <Canvas style={StyleSheet.absoluteFill}>
    {cardsInPlay.map((card, index) => (
     <IndividualAnimatedCard
      key={card.id}
      ref={(el) => {
       if (el === null) {
        delete cardRefs.current[card.id];
        const newValues = { ...cardAnimatedValues.value };
        delete newValues[card.id];
        cardAnimatedValues.value = newValues;
        setRefsReadyCount(prev => prev - 1);
       } else {
        cardRefs.current[card.id] = el;
        cardAnimatedValues.value = {
         ...cardAnimatedValues.value,
         [card.id]: el.animatedValues,
        };
        setRefsReadyCount(prev => prev + 1);
       }
      }}
      card={card}
      initialPosition={marketPos}
      initialIndex={index}
      // ✅ Pass fonts down
      font={font}
      whotFont={whotFont}
     />
    ))}
   </Canvas>
  </GestureDetector>
 );
});

AnimatedCardList.displayName = "AnimatedCardList";
export default AnimatedCardList;
