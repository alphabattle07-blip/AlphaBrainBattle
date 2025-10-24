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
import { CARD_HEIGHT } from "../core/ui/whotConfig";

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
  const [playerHandOffset, setPlayerHandOffset] = useState(0);

  const cardListRef = useRef<AnimatedCardListHandle>(null);

  // --- Memos ---
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

  // --- PAGING CONSTANTS ---
 const playerHand = game?.gameState.players[0].hand || [];
 const playerHandLimit = 6; // ✅ Always 6 now

  // ✅ FIX 1: Logic for a single button
  // Paging is active if the hand size is larger than the limit
  const isPagingActive = playerHand.length > playerHandLimit;
  // Show the button if paging is active and we're not in the middle of the initial deal
  const showPagingButton = !!game && !isAnimating; // ✅ Always show when game is active


  // 🧩 Initialize new game
  const initializeGame = useCallback((lvl: ComputerLevel) => {
    const { gameState, allCards } = initGame(["Player", "Computer"], 6);
    setGame({ gameState, allCards });

    const cardsToAnimate = [
      ...gameState.players[0].hand,
      ...gameState.players[1].hand,
      ...gameState.pile,
    ].filter(Boolean) as Card[];

    setAnimatedCards(cardsToAnimate);
    setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
    setComputerLevel(lvl);
    setPlayerHandOffset(0);
    setIsCardListReady(false);
    setIsAnimating(true);
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

  // ✅ FIX 2: Paging Button Click Handler
  const handlePagingPress = () => {
    // This is the max index a card can be at and still start a "full" page.
    // e.g., 7 cards, limit 5. Max offset is (7 - 5) = 2.
    // Offsets will be 0, 1, 2.
    const maxOffset = playerHand.length - playerHandLimit;
    const nextOffset = playerHandOffset + 1;

    if (nextOffset > maxOffset) {
      setPlayerHandOffset(0); // Loop back to start
    } else {
      setPlayerHandOffset(nextOffset);
    }
  };

  // 🧩 Animate the card dealing sequence
  useEffect(() => {
    if (!isCardListReady || !cardListRef.current || !game || !isAnimating) {
      return;
    }
    const dealer = cardListRef.current;
    let isMounted = true;
    const dealSmoothly = async () => {
      console.log("🎴 Starting smooth deal...");
      const { players, pile } = game.gameState;
      const playerHand = players[0].hand;
      const computerHand = players[1].hand;
      const computerHandSize = computerHand.length;
      const playerHandLimit = 6;
      const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
      const hiddenPlayerHand = playerHand.slice(playerHandLimit);
      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const dealDelay = 150;
      for (let i = 0; i < computerHandSize; i++) {
        if (!isMounted) return;
        const computerCard = computerHand[i];
        if (computerCard) {
          await dealer.dealCard(
            computerCard,
            "computer",
            { cardIndex: i, handSize: computerHandSize },
            false
          );
          await delay(dealDelay);
        }
      }
      for (let i = 0; i < visiblePlayerHand.length; i++) {
        if (!isMounted) return;
        const playerCard = visiblePlayerHand[i];
        if (playerCard) {
          await dealer.dealCard(
            playerCard,
            "player",
            { cardIndex: i, handSize: visiblePlayerHand.length },
            false
          );
          await delay(dealDelay);
        }
      }
      for (const hiddenCard of hiddenPlayerHand) {
        if (!isMounted) return;
        await dealer.dealCard(hiddenCard, "market", { cardIndex: 0 }, true);
      }
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
  }, [isCardListReady, game, width, height, isAnimating]);

  // --- EFFECT TO HANDLE ROTATION AND PAGING ---
  useEffect(() => {
    if (!isCardListReady || !cardListRef.current || !game || isAnimating) {
      return;
    }
    const dealer = cardListRef.current;
    console.log("🔄 Screen rotated or paged, instantly moving cards...");
    const playerHand = game.gameState.players[0].hand;
    const visiblePlayerHand = playerHand.slice(
      playerHandOffset,
      playerHandOffset + playerHandLimit
    );
    const hiddenPlayerHand = [
      ...playerHand.slice(0, playerHandOffset),
      ...playerHand.slice(playerHandOffset + playerHandLimit),
    ];
    const visibleHandSize = visiblePlayerHand.length;
    visiblePlayerHand.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "player",
          { cardIndex: index, handSize: visibleHandSize },
          true
        );
      }
    });
    hiddenPlayerHand.forEach((card) => {
      if (card) {
        dealer.dealCard(card, "market", { cardIndex: 0 }, true);
      }
    });
    const computerHand = game.gameState.players[1].hand;
    const computerHandSize = computerHand.length;
    computerHand.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "computer",
          { cardIndex: index, handSize: computerHandSize },
          true
        );
      }
    });
    const pile = game.gameState.pile;
    pile.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "pile",
          { cardIndex: index, handSize: pile.length },
          true
        );
      }
    });
  }, [width, height, isCardListReady, game, isAnimating, playerHandOffset]);
  // --- END OF EFFECT ---

  // --- CONDITIONAL RETURNS ---
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

      {/* ✅ --- PAGING BUTTONS (FIX 3) --- */}
      <View
        style={[
          styles.pagingContainer,
          isLandscape
            ? styles.pagingContainerLandscape
            : styles.pagingContainerPortrait,
        ]}
        pointerEvents="box-none" // Container doesn't block clicks
      >
        {/* Only render the single button if paging is active */}
        {showPagingButton && (
          <View style={[styles.pagingButtonBase, styles.rightPagingButton]}>
            <Button
              title=">" // You can change this to a "rotate" icon
              onPress={handlePagingPress}
              color="#FFD700"
            />
          </View>
        )}
      </View>
      {/* ✅ --- END PAGING BUTTONS --- */}

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
    height: CARD_HEIGHT + 10,
    overflow: "hidden", // ✅ hide outside cards
    justifyContent: "center",
    alignItems: "center",
  },
  playerHandContainerPortrait: {
    bottom: "12%",
    left: "3%",
    right: "10%",
    width: "auto"
  },
  computerHandContainerPortrait: {
    top: 40,
    left: "5%",
    right: "5%",
    width: "auto"
  },
  playerHandContainerLandscape: {
    bottom: 8,
     left: "19%",
    right: "19%",
    width: "auto",
  },
  computerHandContainerLandscape: {
    top: 8,
    left: "19%",
    right: "19%",
    width: "auto",
  },
pagingContainer: {
    position: "absolute",
    zIndex: 100, // Above cards
  },
  pagingContainerPortrait: {
    bottom: 40, // Match player hand
    left: "5%", // Match player hand
    width: "90%", // Match player hand
    height: CARD_HEIGHT + 40, // Match player hand
  },
  pagingContainerLandscape: {
    bottom: 20, // Match player hand
    left: "5%", // Match player hand
    width: "90%", // Match player hand
    height: CARD_HEIGHT + 40, // Match player hand
  },
  pagingButtonBase: {
    position: "absolute",
    width: 44,
    height: 60,
    // Center the button vertically inside the hand container
    top: (CARD_HEIGHT + 40 - 60) / 2,
    justifyContent: "center",
    pointerEvents: "auto", // Enable clicks on the button itself
  },
  rightPagingButton: {
    right: 0, // Aligns to the right of pagingContainer
  },
});

export default WhotComputerGameScreen;
