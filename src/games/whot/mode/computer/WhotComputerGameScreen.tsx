// WhotComputerGameScreen.tsx (Corrected)
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, Button } from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";
import { runOnJS } from "react-native-reanimated";

import AnimatedCardList, { AnimatedCardListHandle } from "../core/ui/AnimatedCardList";
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
import { initGame } from "../core/whotLogic";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";

type GameData = ReturnType<typeof initGame>;

const WhotComputerGameScreen = () => {
 const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
 const [computerLevel, setComputerLevel] = useState<ComputerLevel>(levels[0].value);
 const [game, setGame] = useState<GameData | null>(null);
 const [isAnimating, setIsAnimating] = useState(false);
 const [allCards, setAllCards] = useState<Card[]>([]);
 const [isCardListReady, setIsCardListReady] = useState(false);
 const cardListRef = useRef<AnimatedCardListHandle>(null);

 const marketPosition = useMemo(() => {
  const pos = getCoords("market");
  console.log("WhotComputerGameScreen - marketPosition:", pos);
  return pos;
 }, []);

 const initializeGame = useCallback((lvl: ComputerLevel) => {
  const gameData = initGame(["Player", "Computer"], 6);
  setAllCards(gameData.allCards);
  setGame(gameData);
  setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
  setComputerLevel(lvl);
  setIsAnimating(true);
 }, []);

 const handleComputerStateChange = useCallback(
  (newState: GameState) => {
   if (game) {
    setGame((prevGame) => (prevGame ? { ...prevGame, gameState: newState } : null));
   }
  },
  [game]
 );

 useEffect(() => {
  if (!isCardListReady || !cardListRef.current || !game) return;

  const dealer = cardListRef.current;
  let isMounted = true;

  const dealSmoothly = async () => {
   console.log("🎴 Starting smooth deal...");
   const handSize = game.gameState.players[0].hand.length;
   const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

   // 🔄 Overlapping motion (not blocking)
   for (let i = 0; i < handSize; i++) {
    const playerCard = game.gameState.players[0].hand[i];
    const computerCard = game.gameState.players[1].hand[i];

    // 🔥 FIRE-AND-FORGET: Start the animations but DO NOT wait for them to finish.
    if (playerCard) {
     dealer.dealCard(playerCard, "player", { cardIndex: i, handSize }, false);
    }
    if (computerCard) {
     dealer.dealCard(computerCard, "computer", { cardIndex: i, handSize }, false);
    }

    // This delay now just staggers the START time of each animation.
    await delay(150);
   }

   // 🃏 Deal pile card (also fire-and-forget)
   const pileCard = game.gameState.pile[0];
   if (pileCard) {
    dealer.dealCard(pileCard, "pile", { cardIndex: 0, handSize: 1 }, false);
   }

   // ✅ ADDED DELAY: Wait for the last card's travel animation (600ms) to mostly finish.
   await delay(800);

   // 🔁 Flip player & pile cards simultaneously
   const flipPromises: Promise<void>[] = [];
   for (let i = 0; i < handSize; i++) {
    const playerCard = game.gameState.players[0].hand[i];
    if (playerCard) flipPromises.push(dealer.flipCard(playerCard, true));
   }
   if (pileCard) flipPromises.push(dealer.flipCard(pileCard, true));

   // Now we await the flip animations to complete before ending the sequence.
   await Promise.all(flipPromises);
   console.log("✅ Deal complete.");

   runOnJS(setIsAnimating)(false);
  };

  dealSmoothly();

  return () => {
   isMounted = false;
  };
 }, [isCardListReady, game]);

 // ... rest of the component is unchanged
 if (!selectedLevel) {
  return (
   <View style={[styles.container, styles.centerContent]}>
    <Text style={styles.title}>Select Computer Level</Text>
    {levels.map((level) => (
     <View key={level.value} style={styles.levelButtonContainer}>
      <Button
       title={`${level.label}`}
       onPress={() => initializeGame(level.value)}
       color="#1E5E4E"
      />
     </View>
    ))}
   </View>
  );
 }

 return (
  <View style={StyleSheet.absoluteFillObject}>
   {game && (
    <View style={styles.computerUIContainer}>
     <ComputerUI
      state={game.gameState}
      playerIndex={1}
      level={computerLevel}
      onStateChange={handleComputerStateChange}
     />
    </View>
   )}

   <Canvas style={[StyleSheet.absoluteFillObject, isAnimating && { zIndex: 21 }]}>
    <Rect
     x={0}
     y={0}
     width={Dimensions.get("window").width}
     height={Dimensions.get("window").height}
     color="#1E5E4E"
    />
   </Canvas>

   {allCards.length > 0 && (
    <AnimatedCardList
     ref={cardListRef}
     cardsInPlay={allCards}
     marketPos={marketPosition}
     onCardPress={(card) => {
      console.log("Card pressed:", card);
     }}
     onReady={() => {
      console.log("🚀 AnimatedCardList is ready! Starting animations...");
      setIsCardListReady(true);
     }}
    />
   )}
  </View>
 );
};

// ... styles are unchanged



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E5E4E" },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, color: "#FFF", marginBottom: 20, textAlign: "center" },
  levelButtonContainer: { marginBottom: 15, width: 200 },
  computerUIContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 10,
  },
});

export default WhotComputerGameScreen;
