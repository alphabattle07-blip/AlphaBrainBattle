// AnimatedCardList.tsx (CORRECTED)

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';

import { Card, AnimatedCard, CARD_WIDTH, CARD_HEIGHT } from "./WhotCardTypes";
import { getCoords } from '../coordinateHelper';
import IndividualAnimatedCard, { IndividualCardHandle } from './IndividualAnimatedCard';
import { AnimatedWhotCard } from './AnimatedWhotCard';

export interface AnimatedCardListHandle {
    dealCard: (card: Card, target: 'player' | 'computer' | 'pile', options: { cardIndex: number; handSize: number }, shouldFlip: boolean) => Promise<void>;
    flipCard: (card: Card, isFaceUp: boolean) => Promise<void>;
}

interface AnimatedCardListProps {
    cardsInPlay: Card[];
    marketPos: { x: number; y: number };
    onCardPress: (card: Card) => void;
    onReady?: () => void;
}

const AnimatedCardList = forwardRef<AnimatedCardListHandle, AnimatedCardListProps>(
  ({ cardsInPlay, marketPos, onCardPress, onReady }, ref) => {
    const cardRefs = useRef<{ [key: string]: IndividualCardHandle | null }>({});
    const [readyToDraw, setReadyToDraw] = React.useState(false);

    useImperativeHandle(ref, () => ({
      dealCard: async (cardToDeal, target, options, shouldFlip) => {
        const cardRef = cardRefs.current[cardToDeal.id];
        if (!cardRef) return;

        const targetCoords = getCoords(target, options);
        const movePromise = cardRef.moveCard(targetCoords.x, targetCoords.y);
        const flipPromise = shouldFlip ? cardRef.flipCard(true) : Promise.resolve();

        await Promise.all([movePromise, flipPromise]);
      },
      flipCard: async (cardToFlip, isFaceUp) => {
        const cardRef = cardRefs.current[cardToFlip.id];
        if (!cardRef) return;
        await cardRef.flipCard(isFaceUp);
      },
    }));

    // ✅ Detect when all refs are attached
React.useEffect(() => {
      const allAttached = cardsInPlay.every(card => cardRefs.current[card.id]);
      if (allAttached && !readyToDraw) {
        setReadyToDraw(true);
        // ✨ This is the magic! Tell the parent we are ready.
        if (onReady) {
          onReady();
        }
      }
    }, [cardsInPlay, readyToDraw, onReady]); //

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* ✅ LAYER 1: Draw only when refs are ready */}
        <Canvas style={StyleSheet.absoluteFill}>
          {readyToDraw &&
            cardsInPlay.map((card, i) => {
              const cardRef = cardRefs.current[card.id];
              if (!cardRef) return null;

              const animatedCardData: AnimatedCard = {
                ...card,
                ...cardRef.animatedValues,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                initialIndex: i,
              };
              return <AnimatedWhotCard key={card.id} card={animatedCardData} />;
            })}
        </Canvas>

        {/* ✅ LAYER 2: Gesture + animation sources */}
        {cardsInPlay.map(card => (
          <IndividualAnimatedCard
            key={card.id}
            ref={el => {
              cardRefs.current[card.id] = el;
            }}
            card={card}
            initialPosition={marketPos}
            onPress={onCardPress}
          />
        ))}
      </View>
    );
  }
);


AnimatedCardList.displayName = 'AnimatedCardList';
export default AnimatedCardList;