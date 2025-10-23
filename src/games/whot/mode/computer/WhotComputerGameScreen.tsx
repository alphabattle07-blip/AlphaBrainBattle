// WhotComputerGameScreen.tsx (FIXED)
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  Button,
  ActivityIndicator,
} from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";
import { runOnJS } from "react-native-reanimated";

import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList";
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
import { initGame } from "../core/whotLogic";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";
import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";
import { CARD_HEIGHT } from "../core/ui/whotConfig"; // ✅ Correct import

type GameData = ReturnType<typeof initGame>;

const WhotComputerGameScreen = () => {
  // --- ALL HOOKS MUST BE AT THE TOP ---
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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

  const playerHandStyle = useMemo(
    () => [
      styles.handContainerBase,
      isLandscape
        ? styles.playerHandContainerLandscape
        : styles.playerHandContainerPortrait,
    ],
    [isLandscape]
  );

  const computerHandStyle = useMemo(
    () => [
      styles.handContainerBase,
      isLandscape
        ? styles.computerHandContainerLandscape
        : styles.computerHandContainerPortrait,
    ],
    [isLandscape]
  );

  // 🧩 Initialize new game
  const initializeGame = useCallback((lvl: ComputerLevel) => {
    const { gameState, allCards } = initGame(["Player", "Computer"], 6);
    setGame({ gameState, allCards });

    const cardsToAnimate = [
      ...gameState.players[0].hand,
      ...gameState.players[1].hand,
      ...gameState.pile, // ✅ Animate ALL pile cards
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
      const { players, pile } = game.gameState;
      const handSize = players[0].hand.length;
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const dealDelay = 150;

      for (let i = 0; i < handSize; i++) {
        if (!isMounted) return;
        const playerCard = players[0].hand[i];
        if (playerCard) {
          await dealer.dealCard(
            playerCard,
            "player",
            { cardIndex: i, handSize },
            false
          );
          await delay(dealDelay);
        }

        if (!isMounted) return;
        const computerCard = players[1].hand[i];
        if (computerCard) {
          await dealer.dealCard(
            computerCard,
            "computer",
            { cardIndex: i, handSize },
            false
          );
          await delay(dealDelay);
        }
      }

      if (!isMounted) return;
      // Deal all pile cards to the pile spot
      for (const pileCard of pile) {
         if (pileCard) {
           await dealer.dealCard(pileCard, "pile", { cardIndex: 0 }, false);
         }
      }
      
      await delay(500);
      if (!isMounted) return;

      const flipPromises: Promise<void>[] = [];
      players[0].hand.forEach((card) => {
        if (card) flipPromises.push(dealer.flipCard(card, true));
      });
      // Flip the TOP card of the pile
      const topPileCard = pile[pile.length - 1];
      if (topPileCard) {
        flipPromises.push(dealer.flipCard(topPileCard, true));
      }

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
  }, [isCardListReady, game]); // This effect runs ONCE when 'game' is created

  // ✅ --- NEW EFFECT TO HANDLE ROTATION ---
  useEffect(() => {
    // Don't run this if the list isn't ready or we're in the middle of the initial deal
    if (!isCardListReady || !cardListRef.current || !game || isAnimating) {
      return;
    }

    const dealer = cardListRef.current;
    console.log("🔄 Screen rotated, instantly moving cards...");

    // 1. Move Player Hand
    const playerHand = game.gameState.players[0].hand;
    const playerHandSize = playerHand.length;
    playerHand.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "player",
          { cardIndex: index, handSize: playerHandSize },
          true // true for instant
        );
      }
    });

    // 2. Move Computer Hand
    const computerHand = game.gameState.players[1].hand;
    const computerHandSize = computerHand.length;
    computerHand.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "computer",
          { cardIndex: index, handSize: computerHandSize },
          true // true for instant
        );
      }
    });

    // 3. Move Pile Cards
    const pile = game.gameState.pile;
    pile.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "pile",
          { cardIndex: index, handSize: pile.length },
          true // true for instant
        );
      }
    });
  }, [width, height, isCardListReady, game, isAnimating]); // Dependencies
  // ✅ --- END OF NEW EFFECT ---

  // --- CONDITIONAL RETURNS (Now safe) ---
  if (!areLoaded) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.title}>Loading Game...</Text>
      </View>
    );
  }

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

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      {game && (
        <View
          style={[styles.computerUIContainer, { pointerEvents: "box-none" }]}
        >
          <ComputerUI
            state={game.gameState}
            playerIndex={1}
            level={computerLevel}
            onStateChange={handleComputerStateChange}
          />
        </View>
      )}

      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} color="#1E5E4E" />
      </Canvas>

      <View style={computerHandStyle} />
      <View style={playerHandStyle} />

      {game && (
        <MarketPile
          cards={game.gameState.market}
          font={whotFont}
          smallFont={font}
          width={width}
          height={height}
          onPress={() => {
            console.log("👉 Market Pile Pressed!");
          }}
        />
      )}

      {animatedCards.length > 0 && font && whotFont && (
        <AnimatedCardList
          ref={cardListRef}
          cardsInPlay={animatedCards}
          playerHand={game?.gameState.players[0].hand || []}
          font={font}
          whotFont={whotFont}
          width={width}
          height={height}
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
  handContainerBase: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 20,
    zIndex: 0,
    height: CARD_HEIGHT + 40,
  },
  playerHandContainerPortrait: {
    bottom: 40,
    left: "5%",
    width: "90%",
  },
  computerHandContainerPortrait: {
    top: 40,
    left: "10%",
    width: "80%",
  },
  playerHandContainerLandscape: {
    bottom: 20,
    left: "5%",
    width: "90%",
  },
  computerHandContainerLandscape: {
    top: 20,
    left: "10%",
    width: "80%",
  },
});

export default WhotComputerGameScreen;