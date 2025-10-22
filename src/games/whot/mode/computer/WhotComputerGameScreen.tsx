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
  useWindowDimensions, // ✅ Use this hook
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
// ✅ Import from your whotConfig file
import { CARD_HEIGHT } from "../core/ui/WhotCardTypes"; 

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

  // ✅ START: Dynamic Styles (MOVED TO TOP)
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
  // ✅ END: Dynamic Styles

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
      const dealDelay = 150; // How long to wait between each card

      // Deal one card at a time, alternating
      for (let i = 0; i < handSize; i++) {
        if (!isMounted) return; // Stop if component unmounts

        // 1. Deal to Player
        const playerCard = game.gameState.players[0].hand[i];
        if (playerCard) {
          await dealer.dealCard(
            playerCard,
            "player",
            { cardIndex: i, handSize },
            false
          );
          await delay(dealDelay);
        }

        if (!isMounted) return; // Stop if component unmounts

        // 2. Deal to Computer
        const computerCard = game.gameState.players[1].hand[i];
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

      // Deal the pile card
      if (!isMounted) return;
      const pileCard = game.gameState.pile[0];
      if (pileCard) {
        await dealer.dealCard(pileCard, "pile", { cardIndex: 0 }, false);
      }

      await delay(500); // Wait after all cards are dealt

      if (!isMounted) return;

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

  // --- CONDITIONAL RETURNS (Now safe) ---

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

  // --- MAIN RENDER ---
  // If we get here, all hooks have run, and we are loaded and have a level.

  // 🧩 Main Game Screen
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

      {/* Background */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect
          x={0}
          y={0}
          width={width} // ✅ Use dynamic width
          height={height} // ✅ Use dynamic height
          color="#1E5E4E"
        />
      </Canvas>

      {/* ✅ Hand "Boards" now use dynamic styles */}
      <View style={computerHandStyle} />
      <View style={playerHandStyle} />

      {game && (
        <MarketPile
          cards={game.gameState.market}
          font={whotFont}
          smallFont={font}
          width={width} // ✅ Pass width
          height={height} // ✅ Pass height
          onPress={() => {
            console.log("👉 Market Pile Pressed!");
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
          width={width} // ✅ Pass width
          height={height} // ✅ Pass height
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
  // ✅ Base style for hand containers
  handContainerBase: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 20,
    zIndex: 0,
    height: CARD_HEIGHT + 40,
  },
  // ✅ Portrait styles
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
  // ✅ Landscape styles
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