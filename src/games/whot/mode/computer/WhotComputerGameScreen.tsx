// WhotComputerGameScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Button,
  ActivityIndicator,
} from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";
import { runOnJS } from "react-native-reanimated";

import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList"; // ✅ this now includes dealCard & flipCard
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
import { initGame } from "../core/whotLogic";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";
import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";

type GameData = ReturnType<typeof initGame>;

const WhotComputerGameScreen = () => {
  // ✅ Load fonts
  const { font, whotFont, areLoaded } = useWhotFonts();

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [computerLevel, setComputerLevel] = useState<ComputerLevel>(
    levels[0].value
  );
  const [game, setGame] = useState<GameData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedCards, setAnimatedCards] = useState<Card[]>([]);
  const [isCardListReady, setIsCardListReady] = useState(false);

  const cardListRef = useRef<AnimatedCardListHandle>(null);
  const marketPosition = useMemo(() => getCoords("market"), []);

  // 🧩 Initialize new game
  const initializeGame = useCallback((lvl: ComputerLevel) => {
    const { gameState, allCards } = initGame(["Player", "Computer"], 6);
    setGame({ gameState, allCards });

    const cardsToAnimate = [
      ...gameState.players[0].hand,
      ...gameState.players[1].hand,
      gameState.pile[0],
    ].filter(Boolean) as Card[];

    setAnimatedCards(cardsToAnimate);
    setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
    setComputerLevel(lvl);
    setIsAnimating(true);
    setIsCardListReady(false);
  }, []);

  // 🧩 Handle computer AI updates
  const handleComputerStateChange = useCallback(
    (newState: GameState) => {
      if (game) {
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );
      }
    },
    [game]
  );

  // 🧩 Animate the card dealing sequence
  useEffect(() => {
    if (!isCardListReady || !cardListRef.current || !game) return;

    const dealer = cardListRef.current;
    let isMounted = true;

    const dealSmoothly = async () => {
      console.log("🎴 Starting smooth deal...");
      const handSize = game.gameState.players[0].hand.length;
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

      // Deal to both player and computer hands
      for (let i = 0; i < handSize; i++) {
        const playerCard = game.gameState.players[0].hand[i];
        const computerCard = game.gameState.players[1].hand[i];

        const playerPromise = playerCard
          ? dealer.dealCard(
              playerCard,
              "player",
              { cardIndex: i, handSize },
              false
            )
          : Promise.resolve();

        const computerPromise = computerCard
          ? dealer.dealCard(
              computerCard,
              "computer",
              { cardIndex: i, handSize },
              false
            )
          : Promise.resolve();

        await Promise.all([playerPromise, computerPromise]);
        if (playerCard || computerCard) await delay(150);
      }

      // Deal the pile card
      const pileCard = game.gameState.pile[0];
      if (pileCard)
        await dealer.dealCard(pileCard, "pile", { cardIndex: 0 }, false);

      await delay(500);

      // Flip player and pile cards
      const flipPromises: Promise<void>[] = [];
      game.gameState.players[0].hand.forEach((playerCard) => {
        if (playerCard) flipPromises.push(dealer.flipCard(playerCard, true));
      });
      if (pileCard) flipPromises.push(dealer.flipCard(pileCard, true));

      await Promise.all(flipPromises);

      console.log("✅ Deal complete.");
      if (isMounted) {
        runOnJS(setIsAnimating)(false);
      }
    };

    const timerId = setTimeout(dealSmoothly, 0);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isCardListReady, game]);

  // 🕓 Show loading indicator until fonts are ready
  if (!areLoaded) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.title}>Loading Game...</Text>
      </View>
    );
  }

  // 🧩 Choose level screen
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

  // 🧩 Main Game Screen
  return (
    <View style={styles.container}>
      {game && (
        <View style={[styles.computerUIContainer, { pointerEvents: "box-none" }]}>
          <ComputerUI
            state={game.gameState}
            playerIndex={1}
            level={computerLevel}
            onStateChange={handleComputerStateChange}
          />
        </View>
      )}

      {/* Background */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect
          x={0}
          y={0}
          width={Dimensions.get("window").width}
          height={Dimensions.get("window").height}
          color="#1E5E4E"
        />
      
      </Canvas>
        {game && (
          <MarketPile
            cards={game.gameState.market}
            font={whotFont}
            smallFont={font}
            onPress={() => {
      console.log("👉 Market Pile Pressed! (using GestureDetector)");
     }}
          />
        )}

      {/* 🃏 Card Rendering Layer */}
      {animatedCards.length > 0 && font && whotFont && (
        <AnimatedCardList
          ref={cardListRef}
          cardsInPlay={animatedCards}
          playerHand={game?.gameState.players[0].hand || []}
          font={font}
          whotFont={whotFont}
          onCardPress={(card) => {
            console.log("🃏 Card pressed:", card);
          }}
          onReady={() => {
            console.log("✅ Card list ready!");
            setIsCardListReady(true);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E5E4E" },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 24, color: "#FFF", margin: 20, textAlign: "center" },
  levelButtonContainer: { marginBottom: 15, width: 200 },
  computerUIContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 10,
  },
});

export default WhotComputerGameScreen;
