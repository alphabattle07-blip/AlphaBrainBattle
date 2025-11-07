// whotComputerGameScreen.tsx
import React, {useState, useEffect,useCallback,useMemo,useRef, useLayoutEffect} from "react";
import {View, StyleSheet, useWindowDimensions,Text, Button,
  ActivityIndicator, Pressable} from "react-native";
import { SkFont } from "@shopify/react-native-skia";
import MemoizedBackground from "../core/ui/MemoizedBackground";


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
import { runOnJS, useSharedValue } from "react-native-reanimated";

type GameData = {
  gameState: GameState;
  allCards: Card[];
};



const WhotComputerGameScreen = () => {
  // --- HOOKS ---
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
const { font: loadedFont, whotFont: loadedWhotFont, areLoaded } = useWhotFonts();

  const [stableFont, setStableFont] = useState<SkFont | null>(null);
  const [stableWhotFont, setStableWhotFont] = useState<SkFont | null>(null);

useEffect(() => {
 // This guard ensures we only set the state *once*
 if (areLoaded && !stableFont && loadedFont && loadedWhotFont) {
 console.log("✅ Capturing stable fonts ONCE.");
 setStableFont(loadedFont);
 setStableWhotFont(loadedWhotFont);
 }
}, [areLoaded, stableFont]);

 const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [computerLevel, setComputerLevel] = useState<ComputerLevel>(
    levels[0].value
  );
  const [game, setGame] = useState<GameData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isCardListReady, setIsCardListReady] = useState(false);

  const cardListRef = useRef<AnimatedCardListHandle>(null);
  const prevWidth = useRef(width);
  const prevHeight = useRef(height);

  const [hasDealt, setHasDealt] = useState(false);


const playerHand = useMemo(
  () => game?.gameState.players[0].hand || [],
  [game?.gameState.players[0].hand] // <-- Depend directly on the hand array
);

const marketCardCount = game?.gameState.market.length || 0;

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

  // ✅ FIX: Create a stable `computerState` object for the UI
const [computerState, setComputerState] = useState({
    name: "Computer",
    handLength: 0,
    isCurrentPlayer: false,
  });

  useEffect(() => {
    if (game) {
      const computerPlayer = game.gameState.players[1];
      const isComputerTurn = game.gameState.currentPlayer === 1;
      // ✅ Only update state if there's an actual change
      if (
        computerPlayer.hand.length !== computerState.handLength ||
        isComputerTurn !== computerState.isCurrentPlayer
      ) {
        setComputerState({
          name: computerPlayer.name,
          handLength: computerPlayer.hand.length,
          isCurrentPlayer: isComputerTurn,
        });
      }
    }
  }, [
    game?.gameState.players[1]?.hand.length,
    game?.gameState.currentPlayer,
    game?.gameState.players[1]?.name,
  ]); // Precise dependencies

  // --- CONSTANTS ---
  const playerHandLimit = 5; // The 6 visible slots
  const layoutHandSize = 6;

  // ✅ FIX 2: Show button if paging is active, NOT if animating
  const isPagingActive = playerHand.length > playerHandLimit;
  const showPagingButton = !!game && isPagingActive;
  const gameRef = useRef(game);
  const isAnimatingRef = useRef(isAnimating);
  const isPagingActiveRef = useRef(isPagingActive);

  const playerHandIdsSV = useSharedValue<string[]>([]);
  const lastHandIdStringRef = useRef<string | null>(null); // ✅ NEW: Ref to store last state

useEffect(() => {
 const newHandIds = playerHand.map(c => c.id);
 const newHandIdString = newHandIds.join(','); // e.g., "card1,card2,
 if (newHandIdString !== lastHandIdStringRef.current) {
  // 3. Only if it's *actually* different, update the SharedValue
  console.log("✅ New player hand detected. Updating playerHandIdsSV.value:", newHandIdString);
  playerHandIdsSV.value = newHandIds;
  lastHandIdStringRef.current = newHandIdString; // 4. Store this new string
 } else {
   console.log("LOG: Player hand unchanged. Skipping SV update.");
 }
}, [playerHand, playerHandIdsSV]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    isPagingActiveRef.current = isPagingActive;
  }, [isPagingActive]);

  // 🧩 Initialize new game
  const initializeGame = useCallback((lvl: ComputerLevel) => {
    const ruleVersion = lvl >= 3 ? "rule2" : "rule1";
    const { gameState, allCards } = initGame(
      ["Player", "Computer"],
      5,
      ruleVersion
    );

    setGame({ gameState, allCards });
    setAllCards(allCards);
    setSelectedLevel(levels.find((l) => l.value === lvl)?.label || null);
    setComputerLevel(lvl);
    setIsCardListReady(false);
    setIsAnimating(true);
    setHasDealt(false);
  }, []);

  
 // 🧩 Handle computer AI updates
 const handleComputerTurn = useCallback(async () => {
  const dealer = cardListRef.current;
  // ✅ Read from refs
  const currentGame = gameRef.current;
  const animating = isAnimatingRef.current;

  if (!currentGame || animating || currentGame.gameState.currentPlayer !== 1 || !dealer) {
   return;
  }

  console.log("🤖 Computer's turn...");
  setIsAnimating(true);

  const oldState = currentGame.gameState; // ✅ Use ref's value
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
    
        // ✅ FIX: Apply the same "smart" pick logic in the fallback
    const { newState: pickState, drawnCards } = pickCard(
     oldState,
     computerPlayerIndex
    );
        
        // 1. Set state immediately
        setGame((prevGame) =>
     prevGame ? { ...prevGame, gameState: pickState } : null
    );

    if (drawnCards.length > 0) {
     const newHand = pickState.players[computerPlayerIndex].hand;
     const newHandSize = newHand.length;
          const drawnCardIds = new Set(drawnCards.map(c => c.id));
          const animationPromises: Promise<void>[] = [];

          // 2. Animate new card, teleport old
          newHand.forEach((card, index) => {
            const options = { cardIndex: index, handSize: newHandSize };
            if (drawnCardIds.has(card.id)) {
              animationPromises.push(
                dealer.dealCard(card, "computer", options, false) // Animate
              );
            } else {
              dealer.dealCard(card, "computer", options, true); // Instant
            }
          });
     await Promise.all(animationPromises);
    }
    setIsAnimating(false);
    return;
   }

      // 1. Set state *immediately*
      setGame((prevGame) =>

    prevGame ? { ...prevGame, gameState: newState } : null
   );

   const finalPileIndex = newState.pile.length - 1;
      const animationPromises: Promise<void>[] = [];

      // 2. Animate *only* the played card
   animationPromises.push(
        dealer.dealCard(
      move,
      "pile",
      { cardIndex: finalPileIndex },
      false
     )
      );
   animationPromises.push(dealer.flipCard(move, true));

   const newHand = newState.players[computerPlayerIndex].hand;
   const newHandSize = newHand.length;

      // 3. *Instantly* teleport the remaining hand cards
   newHand.forEach((card, index) =>
    dealer.dealCard(
     card,
     "computer",
     { cardIndex: index, handSize: newHandSize },
     true // true = instant
    )
   );

      // 4. Wait *only* for the played card's animation
   await Promise.all(animationPromises);

  
  } else {
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

   // 1. Immediately update the game state
   setGame((prevGame) =>
    prevGame ? { ...prevGame, gameState: newState } : null
   );

   const newHand = newState.players[computerPlayerIndex].hand;
   const newHandSize = newHand.length;
   const drawnCardIds = new Set(drawnCards.map(c => c.id));
   
   const animationPromises: Promise<void>[] = [];
   
   newHand.forEach((card, index) => {
    const options = { cardIndex: index, handSize: newHandSize };

     if (drawnCardIds.has(card.id)) {
     // 2. This is the NEW card. Animate it.
     animationPromises.push(
      dealer.dealCard(card, "computer", options, false) // false = animate
     );
    } else {
     // 3. This is an OLD card. Teleport it instantly.
     dealer.dealCard(card, "computer", options, true); // true = instant
    }
   });

      // 4. Wait for the new card(s) to finish animating
   await Promise.all(animationPromises);
  }

    // 5. This is the final step for all branches
  setIsAnimating(false);
 }, [computerLevel]);

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
    // ✅ Read from refs
    const currentGame = gameRef.current;
    const animating = isAnimatingRef.current;

    if (!currentGame || animating || currentGame.gameState.currentPlayer !== 0 || !dealer) {
      console.log("Cannot pick card now.");
      return;
    }

    setIsAnimating(true);
    const oldState = currentGame.gameState; // ✅ Use ref's value

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
    
   const newVisibleHand = newHandOrder.slice(0, playerHandLimit);
  const oldVisibleHand = oldState.players[0].hand.slice(0, playerHandLimit);
  const newVisibleHandIds = new Set(newVisibleHand.map((c) => c.id));
  const cardsLeaving = oldVisibleHand.filter(
   (c) => !newVisibleHandIds.has(c.id)
  );
  setGame((prevGame) =>
   prevGame ? { ...prevGame, gameState: newState } : null
  );


    const animationPromises: Promise<void>[] = [];
     // Animate new visible hand
  newVisibleHand.forEach((card, index) => {
   const options = { cardIndex: index, handSize: layoutHandSize };
   animationPromises.push(dealer.dealCard(card, "player", options, false));

   if (drawnCardIds.has(card.id)) {
    animationPromises.push(dealer.flipCard(card, true));
   }
  });

  

  // Animate "leaving" cards off-screen
  cardsLeaving.forEach((card, index) => {
   animationPromises.push(
    dealer.dealCard(
     card,
     "player",
     { cardIndex: playerHandLimit + index, handSize: layoutHandSize },
     false
    )
   );
  });
    // Handle cards that were drawn but are *still* not visible
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

    setIsAnimating(false);
  }, [playerHandLimit]); // ✅ 'game' and 'isAnimating' removed

 // 🧩 (♠️) Handle player playing a card
 const handlePlayCard = useCallback(
  async (card: Card) => {
   const dealer = cardListRef.current;
   const currentGame = gameRef.current;
   const animating = isAnimatingRef.current;

   if (!currentGame || animating || currentGame.gameState.currentPlayer !== 0 || !dealer) {
    console.log("Cannot play card now.");
    return;
   }

   setIsAnimating(true);

   let newState: GameState;
   const playedCard: Card = card;

   // --- 2. Call Game Logic ---
   try {
    newState = playCard(
     currentGame.gameState, 0, card, currentGame.gameState.ruleVersion
    );
   } catch (error: any) {
    console.log("Invalid move:", error.message);
    setIsAnimating(false);
    return;
   }

   // --- 4. Calculate card positions ---
   const oldPlayerHand = currentGame.gameState.players[0].hand;
   const oldVisibleHand = oldPlayerHand.slice(0, playerHandLimit);
   const oldVisibleHandIds = new Set(oldVisibleHand.map((c) => c.id));

   const newHand = newState.players[0].hand;
   const newVisibleHand = newHand.slice(0, playerHandLimit);

   const newlyVisibleCards: Card[] = [];
   newVisibleHand.forEach((handCard) => {
    if (!oldVisibleHandIds.has(handCard.id)) {
     newlyVisibleCards.push(handCard);
    }
   });

     setGame((prevGame) =>
    prevGame ? { ...prevGame, gameState: newState } : null
   );

   // Teleport "new" cards to an "off-screen-LEFT" position
   if (newlyVisibleCards.length > 0) {
    newlyVisibleCards.forEach((newCard, index) => {
     const offscreenIndex = playerHandLimit + index;
     dealer.teleportCard(newCard, "player", {
       cardIndex: offscreenIndex,
      handSize: layoutHandSize
     });
    });
   }

   // --- 5. Start animation promises ---
   const animationPromises: Promise<void>[] = [];

   const finalPileIndex = newState.pile.length - 1;
   // Animate the played card to the pile
   animationPromises.push(
    dealer.dealCard(playedCard, "pile", { cardIndex: finalPileIndex }, false)
   );
   animationPromises.push(dealer.flipCard(playedCard, true));

   // Animate all visible cards to their new (or old) positions
   newVisibleHand.forEach((handCard, index) => {
    animationPromises.push(
     dealer.dealCard(
      handCard,
      "player",
      { cardIndex: index, handSize: layoutHandSize },
      false // Animate!
     )
    );
   });

   // --- 6. Wait for animations and update state ---
   await Promise.all(animationPromises);

      // 🛑 --- REMOVE setGame FROM HERE --- 🛑
   // setGame((prevGame) => ... ); // <-- This was the bug

   setIsAnimating(false);
  },
  [playerHandLimit]
 ); 
// In whotComputerGameScreen.tsx

 const handlePagingPress = useCallback(async () => {
  const dealer = cardListRef.current;
  // ✅ Read from refs
  const currentGame = gameRef.current;
  const animating = isAnimatingRef.current;
  const pagingActive = isPagingActiveRef.current;

  if (!dealer || animating || !currentGame || !pagingActive) return;

  setIsAnimating(true);

  // --- 1. Get Old Hand ---
  const oldHand = currentGame.gameState.players[0].hand; // ✅ Use ref's value
  const oldVisibleHand = oldHand.slice(0, playerHandLimit);

  // --- 2. Calculate New Hand (Rotate RIGHT) ---
  const cardToMove = oldHand[oldHand.length - 1];
  const remainingCards = oldHand.slice(0, oldHand.length - 1);
  const newHand = [cardToMove, ...remainingCards];

  // --- 3. Get New Visible Sets ---
  const newVisibleHand = newHand.slice(0, playerHandLimit);
  const cardEntering = cardToMove;
  const cardLeaving = oldVisibleHand[playerHandLimit - 1];

    // ✅ --- START OF FIX --- ✅
    // 4. Update the game state with the new rotated hand *immediately*
  const newState = {
   ...currentGame.gameState, // ✅ Use ref's value
   players: currentGame.gameState.players.map((p, i) =>
    i === 0 ? { ...p, hand: newHand } : p
   ),
  };
  setGame((prevGame) =>
   prevGame ? { ...prevGame, gameState: newState } : null
  );
    // ✅ --- END OF FIX --- ✅

  if (cardEntering) {
   dealer.teleportCard(cardEntering, "player", {
    cardIndex: -1,
    handSize: layoutHandSize,
   });
  }

  const animationPromises: Promise<void>[] = [];

  newVisibleHand.forEach((card, index) => {
   animationPromises.push(
    dealer.dealCard(
     card,
     "player",
     { cardIndex: index, handSize: layoutHandSize },
     false // Animate
    )
   );
  });

  if (cardLeaving) {
   animationPromises.push(
    dealer.dealCard(
     cardLeaving,
     "player",
     { cardIndex: playerHandLimit, handSize: layoutHandSize },
     false 
    )
   );
  }

  await Promise.all(animationPromises);

  setIsAnimating(false);
 }, [playerHandLimit]); 
  // 🧩 EFFECT: Initial Smooth Deal Animation
 useEffect(() => {
 if (!isCardListReady || !cardListRef.current || !game || hasDealt || !isAnimating) {
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
   const hiddenPlayerHand = playerHand.slice(playerHandLimit); // We'll use this

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
      { cardIndex: i, handSize: layoutHandSize },
      false
     );
     await delay(dealDelay);
    }
   }
  for (const card of hiddenPlayerHand) {
        if (!isMounted) return;
        if (card) {
          dealer.dealCard(card, "market", { cardIndex: 0 }, true);
        }
      }
   for (const pileCard of pile) {
    if (pileCard) {
     await dealer.dealCard(pileCard, "pile", { cardIndex: 0 }, false);
    }
   }
   await delay(500);
   if (!isMounted) return;

   const flipPromises: Promise<void>[] = [];
   // ✅ OPTIMIZATION: Only flip the visible cards
   visiblePlayerHand.forEach((card) => {
    if (card) flipPromises.push(dealer.flipCard(card, true));
   });
   // (The hidden cards will be flipped when/if they are paged into view)

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

// In whotComputerGameScreen.tsx

useLayoutEffect(() => {
 const currentGame = gameRef.current;
  const animating = isAnimatingRef.current; // We still read it

 const hasRotated =
 prevWidth.current !== width || prevHeight.current !== height;
  if (!hasRotated) {
   return;
  }

 if (
 !isCardListReady ||
 !cardListRef.current ||
 !currentGame || 
  animating ||  
 !hasDealt
 ) {
 return;
 }

 console.log("🔄 Screen rotated (interrupting if needed), instantly moving cards...");
 const dealer = cardListRef.current;
 const { players, pile, market } = currentGame.gameState; 
 const playerHand = players[0].hand;

 const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
 const hiddenPlayerHand = playerHand.slice(playerHandLimit);
 
 visiblePlayerHand.forEach((card, index) => {
  if (card) {
  dealer.dealCard(
   card, "player",
   { cardIndex: index, handSize: layoutHandSize },
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
   card, "computer",
   { cardIndex: index, handSize: computerHandSize },
   true
  );
  }
 });
 pile.forEach((card, index) => {
  if (card) {
  dealer.dealCard(
   card, "pile",
   { cardIndex: index, handSize: pile.length },
   true
  );
  }
 });
 
   // Update the refs so this doesn't run again
 prevWidth.current = width;
 prevHeight.current = height;
 
}, [
 width, 
 height,
 isCardListReady,
 hasDealt,
]);
  // --- END OF FIX 4 ---

  // ✅ FIX 6: Stabilize the onReady callback
  const onCardListReady = useCallback(() => {
    console.log("✅ Card list ready!");
    setIsCardListReady(true);
  }, []); // Empty array means it will never be recreated

if (!areLoaded || !stableFont || !stableWhotFont) { // Wait for our stable state
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

            computerState={computerState}
            level={computerLevel}
          />
        </View>
      )}
      <MemoizedBackground width={width} height={height} />
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
            onPress={handlePagingPress} // ✅ Now stable
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
          count={marketCardCount} // ✅ USE STABLE PROP
          font={stableWhotFont} // 6. ✅ PASS THE STABLE STATE PROP
          smallFont={stableFont} // 6. ✅ PASS THE STABLE STATE PROP
          width={width}
          height={height}
          onPress={handlePickFromMarket} // ✅ Now stable
        />
      )}
      {allCards.length > 0 && stableFont && stableWhotFont && (
        <AnimatedCardList
          ref={cardListRef}
          cardsInPlay={allCards}
          playerHandIdsSV={playerHandIdsSV} // ✅ NEW
          font={stableFont} // 8. ✅ PASS THE STABLE STATE PROP
          whotFont={stableWhotFont} // 8. ✅ PASS THE STABLE STATE PROP
          width={width}
          height={height}
          onCardPress={handlePlayCard} // ✅ Now stable
          onReady={onCardListReady} // ✅ Now stable
        />
      )}
    </View>
  );
};
export default WhotComputerGameScreen;

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
