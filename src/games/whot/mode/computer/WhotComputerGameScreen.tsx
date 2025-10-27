// WhotComputerGameScreen.tsx
import React, {useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { View, StyleSheet, useWindowDimensions, Text, Button,
  ActivityIndicator,
} from "react-native";
import { Canvas, Rect } from "@shopify/react-native-skia";
import { runOnJS } from "react-native-reanimated";

import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList";
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
import { initGame, pickCard } from "../core/game";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";
import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";
import { CARD_HEIGHT } from "../core/ui/whotConfig";

type GameData = {
  gameState: GameState;
  allCards: Card[];
};

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

  // ✅ FIX 1: Add a state to track the initial deal
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

  // --- PAGING CONSTANTS ---
  const playerHand = game?.gameState.players[0].hand || [];
  const playerHandLimit = 6;

  const isPagingActive = playerHand.length > playerHandLimit;
  const showPagingButton = !!game && !isAnimating;

  // 🧩 Initialize new game
const initializeGame = useCallback((lvl: ComputerLevel) => {
    // ✅ NEW: Determine rule version based on level
    const ruleVersion = (lvl >= 3) ? "rule2" : "rule1";

  const { gameState, allCards } = initGame(
      ["Player", "Computer"], 
      6, 
      ruleVersion // ✅ UPDATED: Pass the correct rule
    );
    
  setGame({ gameState, allCards });

  setAnimatedCards(allCards);
  setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
  setComputerLevel(lvl);
  setPlayerHandOffset(0);
  setIsCardListReady(false);
  
  // ✅ FIX 2: Set isAnimating to true and hasDealt to false
  setIsAnimating(true); // This will be set to false by the deal effect
  setHasDealt(false); // Reset the deal tracker for the new game
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

 // 🧩 Handle player picking from market
  const handlePickFromMarket = useCallback(async () => {
    const dealer = cardListRef.current;
    if (!game || isAnimating || game.gameState.currentPlayer !== 0 || !dealer) {
      console.log("Cannot pick card now.");
      return;
    }

    setIsAnimating(true);
    const oldState = game.gameState;

    // 1. Get the new state and drawn card(s) from the core logic
    const { newState: stateAfterPick, drawnCards } = pickCard(oldState, 0);

    // If no cards were drawn, just update state and stop
    if (drawnCards.length === 0) {
      setGame((prevGame) => (prevGame ? { ...prevGame, gameState: stateAfterPick } : null));
      setIsAnimating(false);
      return;
    }

    // --- ✅ NEW LOGIC: Re-order the hand so new cards are at the FRONT ---

    // Get the hand as returned by pickCard (new cards are usually at the end)
    const currentHand = stateAfterPick.players[0].hand;
    
    // Create a Set of the new card IDs for easy lookup
    const drawnCardIds = new Set(drawnCards.map(c => c.id));
    
    // Filter out the old cards (cards that were NOT just drawn)
    const oldHandCards = currentHand.filter(
      (card) => !drawnCardIds.has(card.id)
    );
    
    // Create the new hand order: [newlyDrawnCards, ...oldHandCards]
    // This is what you wanted: new card at index 0
    const newHandOrder = [...drawnCards, ...oldHandCards];
    
    // Create the final, modified newState object
    const newState = {
      ...stateAfterPick,
      players: stateAfterPick.players.map((player, index) => {
        if (index === 0) {
          // This is our player, give them the new, re-ordered hand
          return { ...player, hand: newHandOrder };
        }
        return player; // Other players are unchanged
      }),
    };
    // --- ✅ End of re-ordering logic ---


    // 3. Get the *visible* part of the *new, re-ordered* hand
    const newVisibleHand = newHandOrder.slice(
      playerHandOffset,
      playerHandOffset + playerHandLimit
    );
    const newVisibleHandSize = newVisibleHand.length;

    // 4. Animate ALL visible cards in parallel
    const animationPromises: Promise<void>[] = [];

    for (let i = 0; i < newVisibleHand.length; i++) {
      const card = newVisibleHand[i];
      const options = { cardIndex: i, handSize: newVisibleHandSize };

      // This one call animates every card to its new spot.
      // - The NEW card (at i=0) will animate from the MARKET to PLAYER[0].
      // - The OLD card (at i=1) will animate from PLAYER[0] to PLAYER[1].
      // - The OLD card (at i=2) will animate from PLAYER[1] to PLAYER[2].
      // ...and so on. This creates the "shift" effect.
      animationPromises.push(
        dealer.dealCard(card, "player", options, false)
      );

      // If this card is one of the newly drawn ones, it also needs to flip
      if (drawnCardIds.has(card.id)) {
        animationPromises.push(dealer.flipCard(card, true));
      }
    }

    // 5. Animate any NEWLY DRAWN cards that are NOT visible
    // (i.e., they were drawn onto a different "page")
    for (const card of drawnCards) {
      const isVisible = newVisibleHand.some(c => c.id === card.id);
      if (!isVisible) {
        // This card is "off-page", so just animate it to the
        // market pile (where other off-page cards live) and flip it.
        animationPromises.push(
          dealer.dealCard(card, "market", { cardIndex: 0 }, false)
        );
        animationPromises.push(dealer.flipCard(card, true));
      }
    }

    // 6. Wait for ALL animations to finish
    await Promise.all(animationPromises);

    // 7. Now that animations are done, update the game state
    setGame((prevGame) => (prevGame ? { ...prevGame, gameState: newState } : null));
    setIsAnimating(false); // Finish animating

  }, [game, isAnimating, playerHandOffset, playerHandLimit]);
  // ✅ FIX 3: Paging Button Click Handler (Corrected logic)
// ✅ FIX 3: Paging Button Click Handler (Reversed to Anti-Clockwise)
  const handlePagingPress = () => {
    // This is the max index a card can be at and still start a "full" page.
    const maxOffset = playerHand.length - playerHandLimit;

    // If there's no paging, maxOffset will be 0 or negative. Do nothing.
    if (maxOffset <= 0) return;

    // Calculate the "previous" offset
    const prevOffset = playerHandOffset - 1;

    if (prevOffset < 0) {
      // We are at the beginning (index 0), so loop back to the end
      setPlayerHandOffset(maxOffset);
    } else {
      // Go to the previous offset (scroll "left" / anti-clockwise)
      setPlayerHandOffset(prevOffset);
    }
  };

  // 🧩 Animate the card dealing sequence
  useEffect(() => {
    // ✅ FIX 4: Add hasDealt to the condition.
    // This effect should ONLY run if the cards HAVEN'T been dealt yet.
    if (!isCardListReady || !cardListRef.current || !game || hasDealt) {
      return;
    }

    // We also need to make sure we are in the "initial deal" animation state
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

      // Move all cards to market instantly (their start pos)
      for (const card of game.allCards) {
        dealer.dealCard(card, "market", { cardIndex: 0 }, true);
      }
      await delay(50); 

      // --- Now deal them out with animation ---
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

      // "Deal" hidden cards to the market pile (instantly)
      for (const hiddenCard of hiddenPlayerHand) {
        if (!isMounted) return;
        await dealer.dealCard(hiddenCard, "market", { cardIndex: 0 }, true);
      }
      // "Deal" market cards to the market pile (instantly)
      for (const marketCard of market) {
        if (!isMounted) return;
        await dealer.dealCard(marketCard, "market", { cardIndex: 0 }, true);
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
        // ✅ FIX 5: Set hasDealt to true and isAnimating to false
        runOnJS(setHasDealt)(true);
        runOnJS(setIsAnimating)(false);
      }
    };
    
    const timerId = setTimeout(dealSmoothly, 0);
    
    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  // ✅ FIX 6: Update dependency array.
  // This effect runs when the game is ready and the initial deal hasn't happened.
  }, [isCardListReady, game, hasDealt, isAnimating, playerHandLimit]); 

  // --- EFFECT TO HANDLE ROTATION AND PAGING ---
  useEffect(() => {
    // ✅ FIX 7: Add hasDealt check. Don't run this if cards aren't dealt.
    if (!isCardListReady || !cardListRef.current || !game || isAnimating || !hasDealt) {
      return;
    }
    const dealer = cardListRef.current;
    console.log("🔄 Screen rotated or paged, instantly moving cards...");
    const { players, pile, market } = game.gameState; 
    const playerHand = players[0].hand;

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
    // "Deal" hidden cards to market
    hiddenPlayerHand.forEach((card) => {
      if (card) {
        dealer.dealCard(card, "market", { cardIndex: 0 }, true);
      }
    });
    // "Deal" market cards to market
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
  // ✅ FIX 8: Add hasDealt to dependency array
  }, [width, height, isCardListReady, game, isAnimating, playerHandOffset, playerHandLimit, hasDealt]);
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
          <View style={[styles.pagingButtonBase, styles.rightPagingButton]}>
            <Button
              title=">"
              onPress={handlePagingPress}
              color="#FFD700"
            />
          </View>
        )}
      </View>

      {game && (
        <MarketPile
          cards={game.gameState.market}
          font={whotFont}
          smallFont={font}
          width={width}
          height={height}
          onPress={handlePickFromMarket} // This is correct
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
