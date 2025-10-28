// whotComputerGameScreen.tsx
import React, {useState, useEffect, useCallback,useMemo,useRef,
} from "react";
import { View, StyleSheet, useWindowDimensions, Text, Button,
  ActivityIndicator, Pressable, } from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";
import { runOnJS } from "react-native-reanimated";

import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList";
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
import { initGame, pickCard, playCard } from "../core/game";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";
import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";
import { CARD_HEIGHT } from "../core/ui/whotConfig";
import { chooseComputerMove } from "./whotComputerLogic";

type GameData = {
  gameState: GameState;
  allCards: Card[];
};

const WhotComputerGameScreen = () => {
  // --- HOOKS ---
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

  // ✅ FIX 1: Add refs to track screen dimensions for rotation
  const prevWidth = useRef(width);
  const prevHeight = useRef(height);

  const [hasDealt, setHasDealt] = useState(false);

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

  // --- CONSTANTS ---
  const playerHand = game?.gameState.players[0].hand || [];
  const playerHandLimit = 6; // The 6 visible slots

  // ✅ FIX 2: Show button if paging is active, NOT if animating
  const isPagingActive = playerHand.length > playerHandLimit;
  const showPagingButton = !!game && isPagingActive;

  // 🧩 Initialize new game
  const initializeGame = useCallback((lvl: ComputerLevel) => {
    const ruleVersion = lvl >= 3 ? "rule2" : "rule1";
    const { gameState, allCards } = initGame(
      ["Player", "Computer"],
      6,
      ruleVersion
    );

    setGame({ gameState, allCards });
    setAnimatedCards(allCards);
    setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
    setComputerLevel(lvl);
    setIsCardListReady(false);
    setIsAnimating(true);
    setHasDealt(false);
  }, []);

  // 🧩 Handle computer AI updates
  const handleComputerTurn = useCallback(async () => {
    const dealer = cardListRef.current;
    if (!game || isAnimating || game.gameState.currentPlayer !== 1 || !dealer) {
      return;
    }

    console.log("🤖 Computer's turn...");
    setIsAnimating(true);

    const oldState = game.gameState;
    const { ruleVersion } = oldState;
    const computerPlayerIndex = 1;

    const move = chooseComputerMove(oldState, computerPlayerIndex, computerLevel);

    // --- Handle PLAYING A CARD ---
    if (move) {
      console.log("🤖 Computer chose to PLAY:", move.id);
      let newState: GameState;

      try {
        newState = playCard(oldState, computerPlayerIndex, move, ruleVersion);
      } catch (e: any) {
        console.error(
          "🤖 Computer AI chose invalid card, forcing pick.",
          e.message
        );
        // Fallback: Force a pick
        const { newState: pickState, drawnCards } = pickCard(
          oldState,
          computerPlayerIndex
        );
        if (drawnCards.length > 0) {
          const newHand = pickState.players[computerPlayerIndex].hand;
          const newHandSize = newHand.length;
          await Promise.all(
            newHand.map((card, index) =>
              dealer.dealCard(
                card,
                "computer",
                { cardIndex: index, handSize: newHandSize },
                false
              )
            )
          );
        }
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: pickState } : null
        );
        setIsAnimating(false);
        return;
      }

      const finalPileIndex = newState.pile.length - 1;
      await dealer.dealCard(
        move,
        "pile",
        { cardIndex: finalPileIndex },
        false
      );
      await dealer.flipCard(move, true);

      const newHand = newState.players[computerPlayerIndex].hand;
      const newHandSize = newHand.length;
      await Promise.all(
        newHand.map((card, index) =>
          dealer.dealCard(
            card,
            "computer",
            { cardIndex: index, handSize: newHandSize },
            false
          )
        )
      );

      setGame((prevGame) =>
        prevGame ? { ...prevGame, gameState: newState } : null
      );
    } else {
      // --- Handle PICKING A CARD ---
      console.log("🤖 Computer chose to PICK");

      const { newState, drawnCards } = pickCard(oldState, computerPlayerIndex);

      if (drawnCards.length === 0) {
        console.warn("🤖 Computer tried to pick, but market is empty.");
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );
        setIsAnimating(false);
        return;
      }

      console.log(`🤖 Computer drew ${drawnCards.length} card(s).`);

      const newHand = newState.players[computerPlayerIndex].hand;
      const newHandSize = newHand.length;
      await Promise.all(
        newHand.map((card, index) =>
          dealer.dealCard(
            card,
            "computer",
            { cardIndex: index, handSize: newHandSize },
            false
          )
        )
      );

      setGame((prevGame) =>
        prevGame ? { ...prevGame, gameState: newState } : null
      );
    }

    setIsAnimating(false);
  }, [game, isAnimating, computerLevel]);

  // 🧩 EFFECT: Trigger Computer's Turn
  useEffect(() => {
    if (!game || isAnimating || !hasDealt) return;

    if (game.gameState.currentPlayer === 1) {
      const timer = setTimeout(() => {
        runOnJS(handleComputerTurn)();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [game?.gameState.currentPlayer, isAnimating, hasDealt, handleComputerTurn]);

  // 🧩 (🌀) Handle player picking from market
  const handlePickFromMarket = useCallback(async () => {
    const dealer = cardListRef.current;
    if (!game || isAnimating || game.gameState.currentPlayer !== 0 || !dealer) {
      console.log("Cannot pick card now.");
      return;
    }

    setIsAnimating(true);
    const oldState = game.gameState;

    const { newState: stateAfterPick, drawnCards } = pickCard(oldState, 0);

    if (drawnCards.length === 0) {
      setGame((prevGame) =>
        prevGame ? { ...prevGame, gameState: stateAfterPick } : null
      );
      setIsAnimating(false);
      return;
    }

    // --- CAROUSEL LOGIC: Re-order the hand so new cards are at the FRONT ---
    const currentHand = stateAfterPick.players[0].hand;
    const drawnCardIds = new Set(drawnCards.map((c) => c.id));
    const oldHandCards = currentHand.filter(
      (card) => !drawnCardIds.has(card.id)
    );
    // New hand order: [newlyDrawnCards, ...oldHandCards]
    const newHandOrder = [...drawnCards, ...oldHandCards];

    const newState = {
      ...stateAfterPick,
      players: stateAfterPick.players.map((player, index) => {
        if (index === 0) {
          return { ...player, hand: newHandOrder };
        }
        return player;
      }),
    };
    // --- End of re-ordering logic ---

    // 3. Get the *visible* part of the *new, re-ordered* hand
    const newVisibleHand = newHandOrder.slice(0, playerHandLimit);
    const newVisibleHandSize = newVisibleHand.length;

    // 4. Find cards that are moving OFF screen (to the left)
    const oldVisibleHand = oldState.players[0].hand.slice(0, playerHandLimit);
    const newVisibleHandIds = new Set(newVisibleHand.map((c) => c.id));
    const cardsLeaving = oldVisibleHand.filter(
      (c) => !newVisibleHandIds.has(c.id)
    );

    // 5. Teleport "entering" cards (the new ones) to an off-screen-RIGHT
    drawnCards.forEach((card, index) => {
      dealer.teleportCard(card, "player", {
        cardIndex: -1 - index,
        handSize: newVisibleHandSize,
      });
    });

    // 6. Animate ALL visible cards in parallel
    const animationPromises: Promise<void>[] = [];

    newVisibleHand.forEach((card, index) => {
      const options = { cardIndex: index, handSize: newVisibleHandSize };
      animationPromises.push(dealer.dealCard(card, "player", options, false));

      if (drawnCardIds.has(card.id)) {
        animationPromises.push(dealer.flipCard(card, true));
      }
    });

    // 7. Animate "leaving" cards to an off-screen-LEFT position
    cardsLeaving.forEach((card, index) => {
      animationPromises.push(
        dealer.dealCard(
          card,
          "player",
          { cardIndex: playerHandLimit + index, handSize: newVisibleHandSize },
          false
        )
      );
    });

    // 8. Handle cards that were drawn but are *still* not visible
    for (const card of drawnCards) {
      const isVisible = newVisibleHand.some((c) => c.id === card.id);
      if (!isVisible) {
        animationPromises.push(
          dealer.dealCard(card, "market", { cardIndex: 0 }, false)
        );
        animationPromises.push(dealer.flipCard(card, true));
      }
    }

    // 9. Wait for ALL animations to finish
    await Promise.all(animationPromises);

    // 10. Teleport "left" cards to market now they're off-screen
    cardsLeaving.forEach((card) => {
      dealer.teleportCard(card, "market", { cardIndex: 0 });
    });

    // 11. Update the game state
    setGame((prevGame) =>
      prevGame ? { ...prevGame, gameState: newState } : null
    );
    setIsAnimating(false);
  }, [game, isAnimating, playerHandLimit]);

  // 🧩 (♠️) Handle player playing a card
  const handlePlayCard = useCallback(
    async (card: Card) => {
      const dealer = cardListRef.current;
      if (!game || isAnimating || game.gameState.currentPlayer !== 0 || !dealer) {
        console.log("Cannot play card now.");
        return;
      }

      setIsAnimating(true);

      let newState: GameState;
      const playedCard: Card = card;

      // --- 2. Call Game Logic ---
      try {
        newState = playCard(
          game.gameState,
          0, // playerIndex
          card,
          game.gameState.ruleVersion
        );
      } catch (error: any) {
        console.log("Invalid move:", error.message);
        setIsAnimating(false);
        return;
      }

      // --- 4. Handle Valid Move (Animate!) ---

      // 4a. Get old hand state (visible part)
      const oldPlayerHand = game.gameState.players[0].hand;
      const oldVisibleHand = oldPlayerHand.slice(0, playerHandLimit);
      const oldVisibleHandIds = new Set(oldVisibleHand.map((c) => c.id));

      // 4b. Get new hand state (visible part)
      const newHand = newState.players[0].hand;
      const newVisibleHand = newHand.slice(0, playerHandLimit);
      const newVisibleHandSize = newVisibleHand.length;

      // 4d. Find card(s) that are about to become visible (from the left)
      const newlyVisibleCards: Card[] = [];
      newVisibleHand.forEach((handCard) => {
        if (!oldVisibleHandIds.has(handCard.id)) {
          newlyVisibleCards.push(handCard);
        }
      });

      // 4e. Teleport them to an "off-screen-LEFT" position *before* animating
      if (newlyVisibleCards.length > 0) {
        newlyVisibleCards.forEach((newCard, index) => {
          const offscreenIndex = playerHandLimit + index;
          dealer.teleportCard(newCard, "player", {
            cardIndex: offscreenIndex,
            handSize: newVisibleHandSize + newlyVisibleCards.length,
          });
        });
      }

      // 4f. Start animation promises
      const animationPromises: Promise<void>[] = [];

      const finalPileIndex = newState.pile.length - 1;
      // Promise 1: Animate the played card to the pile
      animationPromises.push(
        dealer.dealCard(playedCard, "pile", { cardIndex: finalPileIndex }, false)
      );
      animationPromises.push(dealer.flipCard(playedCard, true));

      // Promise 2: Animate all *newly* visible cards
      // This animates "squeezed" cards (clockwise) AND "newly visible" cards (from left)
      newVisibleHand.forEach((handCard, index) => {
        animationPromises.push(
          dealer.dealCard(
            handCard,
            "player",
            // ✅ FIX: Always use the MAX hand size for positioning
            { cardIndex: index, handSize: playerHandLimit }, // ✅ This anchors the cards to the right
            false // Animate!
          )
        );
      });

      // --- 5. Wait for animations and update state ---
      await Promise.all(animationPromises);

      setGame((prevGame) =>
        prevGame ? { ...prevGame, gameState: newState } : null
      );
      setIsAnimating(false);
    },
    [game, isAnimating, playerHandLimit]
  );

  // ✅ ==========================================================
  // ✅ (🔄) REPLACED handlePagingPress with "Rotate Right" logic
  // ✅ ==========================================================
  const handlePagingPress = useCallback(async () => {
    const dealer = cardListRef.current;
    if (!dealer || isAnimating || !game || !isPagingActive) return;

    setIsAnimating(true);

    // --- 1. Get Old Hand ---
    const oldHand = game.gameState.players[0].hand;
    const oldVisibleHand = oldHand.slice(0, playerHandLimit);

    // --- 2. Calculate New Hand (Rotate RIGHT) ---
    // Move the LAST card (oldest invisible) to the FRONT
    const cardToMove = oldHand[oldHand.length - 1];
    const remainingCards = oldHand.slice(0, oldHand.length - 1);
    const newHand = [cardToMove, ...remainingCards];

    // --- 3. Get New Visible Sets ---
    const newVisibleHand = newHand.slice(0, playerHandLimit);
    const newVisibleHandSize = newVisibleHand.length;

    // Card entering from RIGHT (pos 0)
    const cardEntering = cardToMove;
    // Card leaving to LEFT (was at pos 5)
    const cardLeaving = oldVisibleHand[playerHandLimit - 1];

    // --- 4. Teleport "Entering" Card ---
    if (cardEntering) {
      // Teleport to the "off-screen-RIGHT" position (index -1)
      dealer.teleportCard(cardEntering, "player", {
        cardIndex: -1,
        handSize: newVisibleHandSize,
      });
    }

    // --- 5. Animate All ---
    const animationPromises: Promise<void>[] = [];

    // Animate "Staying" and "Entering" cards to their *new* positions
    newVisibleHand.forEach((card, index) => {
      animationPromises.push(
        dealer.dealCard(
          card,
          "player",
          { cardIndex: index, handSize: newVisibleHandSize },
          false // Animate
        )
      );
    });

    // Animate "Leaving" card to the "off-screen-LEFT" (pos 6)
    if (cardLeaving) {
      animationPromises.push(
        dealer.dealCard(
          cardLeaving,
          "player",
          { cardIndex: playerHandLimit, handSize: newVisibleHandSize },
          false // Animate
        )
      );
    }

    // --- 6. Wait and Update State ---
    await Promise.all(animationPromises);

    // Now, update the game state with the new rotated hand
    const newState = {
      ...game.gameState,
      players: game.gameState.players.map((p, i) =>
        i === 0 ? { ...p, hand: newHand } : p
      ),
    };
    setGame((prevGame) =>
      prevGame ? { ...prevGame, gameState: newState } : null
    );

    // Instantly move the "left" card to the market pile
    if (cardLeaving) {
      dealer.teleportCard(cardLeaving, "market", { cardIndex: 0 });
    }

    setIsAnimating(false);
  }, [game, isAnimating, isPagingActive, playerHandLimit]);
  // ✅ ==========================================================
  // ✅ END OF REPLACEMENT
  // ✅ ==========================================================

  // 🧩 Animate the card dealing sequence
  useEffect(() => {
    if (!isCardListReady || !cardListRef.current || !game || hasDealt) {
      return;
    }
    if (!isAnimating) {
      return;
    }

    const dealer = cardListRef.current;
    let isMounted = true;

    const dealSmoothly = async () => {
      console.log("🎴 Starting smooth deal... (This should only run once)");
      const { players, pile, market } = game.gameState;
      const playerHand = players[0].hand;
      const computerHand = players[1].hand;
      const computerHandSize = computerHand.length;

      const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
      const hiddenPlayerHand = playerHand.slice(playerHandLimit);

      const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
      const dealDelay = 150;

      // Move all cards to market instantly
      for (const card of game.allCards) {
        dealer.dealCard(card, "market", { cardIndex: 0 }, true);
      }
      await delay(50);

      // --- Deal out with animation ---
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

      // ✅ FIX 3: Remove redundant loops that cause blinking
      // "Deal" hidden cards to the market pile (instantly)
      /*
      for (const hiddenCard of hiddenPlayerHand) {
        if (!isMounted) return;
        await dealer.dealCard(hiddenCard, "market", { cardIndex: 0 }, true);
      }
      */
      // "Deal" market cards to the market pile (instantly)
      /*
      for (const marketCard of market) {
        if (!isMounted) return;
        await dealer.dealCard(marketCard, "market", { cardIndex: 0 }, true);
      }
      */
      // --- END OF FIX 3 ---

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
        runOnJS(setHasDealt)(true);
        runOnJS(setIsAnimating)(false);
      }
    };

    const timerId = setTimeout(dealSmoothly, 0);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isCardListReady, game, hasDealt, isAnimating, playerHandLimit]);

  // ✅ FIX 4: Replaced this entire effect to *only* run on actual rotation
  // --- EFFECT TO HANDLE ROTATION (INSTANT) ---
  useEffect(() => {
    if (
      !isCardListReady ||
      !cardListRef.current ||
      !game ||
      isAnimating || // Don't run during other animations
      !hasDealt
    ) {
      return;
    }

    // Check if the screen dimensions *actually* changed
    const hasRotated =
      prevWidth.current !== width || prevHeight.current !== height;

    if (hasRotated) {
      console.log("🔄 Screen rotated, instantly moving cards...");
      const dealer = cardListRef.current;
      const { players, pile, market } = game.gameState;
      const playerHand = players[0].hand;

      const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
      const hiddenPlayerHand = playerHand.slice(playerHandLimit);
      const visibleHandSize = visiblePlayerHand.length;

      visiblePlayerHand.forEach((card, index) => {
        if (card) {
          dealer.dealCard(
            card,
            "player",
            { cardIndex: index, handSize: visibleHandSize },
            true // Instant
          );
        }
      });
      hiddenPlayerHand.forEach((card) => {
        if (card) {
          dealer.dealCard(card, "market", { cardIndex: 0 }, true);
        }
      });
      market.forEach((card) => {
        if (card) {
          dealer.dealCard(card, "market", { cardIndex: 0 }, true);
        }
      });
      const computerHand = players[1].hand;
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

      // Update the refs
      prevWidth.current = width;
      prevHeight.current = height;
    }
  }, [
    width, // Trigger
    height, // Trigger
    isCardListReady,
    game, // Needed to re-run and get latest state
    isAnimating, // Needed for the guard
    playerHandLimit,
    hasDealt,
  ]);
  // --- END OF FIX 4 ---

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
          />
        </View>
      )}
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} color="#1E5E4E" />
      </Canvas>
      <View style={computerHandStyle} />
      <View style={playerHandStyle} />

      <View
        style={[
          styles.pagingContainer,
          isLandscape
            ? styles.pagingContainerLandscape
            : styles.pagingContainerPortrait,
        ]}
        pointerEvents="box-none"
      >
        {showPagingButton && (
          <Pressable
            onPress={handlePagingPress}
            style={({ pressed }) => [
              styles.pagingButtonBase,
              styles.rightPagingButton,
              pressed && { backgroundColor: "#e6c200" }, // darker yellow when pressed
            ]}
          >
            <Text style={styles.pagingIcon}>{">"}</Text>
          </Pressable>
        )}
      </View>

      {game && (
        <MarketPile
          cards={game.gameState.market}
          font={whotFont}
          smallFont={font}
          width={width}
          height={height}
          onPress={handlePickFromMarket} // ✅ (🌀)
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
          onCardPress={handlePlayCard} // ✅ (♠️)
          onReady={() => {
            console.log("✅ Card list ready!");
            setIsCardListReady(true);
          }}
        />
      )}
    </View>
  );
};

// Using the styles you provided
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E5E4E" },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
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
    borderTopLeftRadius: 20,
    zIndex: 0,
    height: CARD_HEIGHT + 10,
    overflow: "hidden", // ✅ hide outside cards
    justifyContent: "center",
    alignItems: "center",
  },
  playerHandContainerPortrait: {
    bottom: "12%",
    left: "3%",
    right: "15%",
    width: "auto",
  },
  computerHandContainerPortrait: {
    top: 40,
    left: "5%",
    right: "5%",
    width: "auto",
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
    zIndex: 100,
    left: 0,
    right: 0,
    height: CARD_HEIGHT + 10,
    pointerEvents: "box-none",
  },

  pagingContainerPortrait: {
    bottom: "12%",
  },

  pagingContainerLandscape: {
    bottom: 8,
  },

  pagingButtonBase: {
    position: "absolute",
    right: 0,
    width: "12%", // takes up the right 15%
    height: CARD_HEIGHT + 10, // same height as box
    backgroundColor: "#FFD700", // solid gold yellow
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5, // shadow for Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  pagingIcon: {
    fontSize: 36, // big bold arrow
    fontWeight: "bold",
    color: "#000",
  },

  rightPagingButton: {
    marginRight: "3%",
  },
});
export default WhotComputerGameScreen;