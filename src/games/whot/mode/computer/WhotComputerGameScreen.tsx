// whotComputerGameScreen.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  Button,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SkFont } from "@shopify/react-native-skia";
import MemoizedBackground from "../core/ui/MemoizedBackground";
import WhotSuitSelector from "../core/ui/WhotSuitSelector"; // <--- ADD THIS
import { CardSuit } from "../core/types"; // <--- ADD THIS
import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList";
import { Card, GameState } from "../core/types";
import { getCoords } from "../core/coordinateHelper";
// ✅ FIX 1: ADDED 'executeForcedDraw'
import { initGame, pickCard, playCard, executeForcedDraw } from "../core/game";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";

import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";
import { CARD_WIDTH, CARD_HEIGHT } from "../core/ui/whotConfig";
import { chooseComputerMove, chooseComputerSuit } from "./whotComputerLogic";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import ActiveSuitCard from "../core/ui/ActiveSuitCard";

type GameData = {
  gameState: GameState;
  allCards: Card[];
};

const WhotComputerGameScreen = () => {
  // --- HOOKS ---
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { font: loadedFont, whotFont: loadedWhotFont, areLoaded } =
    useWhotFonts();

  // ✅ --- STABILIZATION FIX 1: STABLE DIMENSIONS & FONTS --- ✅
  const [stableWidth, setStableWidth] = useState(width);
  const [stableHeight, setStableHeight] = useState(height);
  const [stableFont, setStableFont] = useState<SkFont | null>(null);
  const [stableWhotFont, setStableWhotFont] = useState<SkFont | null>(null);
  const pileCoords = useMemo(() => {
    return getCoords("pile", { cardIndex: 0 }, stableWidth, stableHeight);
  }, [stableWidth, stableHeight]);

  useLayoutEffect(() => {
    const widthChanged = Math.abs(stableWidth - width) > 1;
    const heightChanged = Math.abs(stableHeight - height) > 1;

    if (widthChanged) {
      setStableWidth(width);
    }
    if (heightChanged) {
      setStableHeight(height);
    }
  }, [width, height, stableWidth, stableHeight]);

  useEffect(() => {
    if (areLoaded && !stableFont && loadedFont && loadedWhotFont) {
      console.log("✅ Capturing stable fonts ONCE.");
      setStableFont(loadedFont);
      setStableWhotFont(loadedWhotFont);
    }
  }, [areLoaded, stableFont, loadedFont, loadedWhotFont]);
  // --- END STABILIZATION FIX 1 ---

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [computerLevel, setComputerLevel] = useState<ComputerLevel>(
    levels[0].value
  );
  const [game, setGame] = useState<GameData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [isCardListReady, setIsCardListReady] = useState(false);

  const cardListRef = useRef<AnimatedCardListHandle>(null);
  const [hasDealt, setHasDealt] = useState(false);

  const playerHand = useMemo(
    () => game?.gameState.players[0].hand || [],
    [game?.gameState.players[0].hand]
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

  // ✅ --- STABILIZATION FIX 2: ELIMINATE DOUBLE-RENDER --- ✅
  // We use useMemo to prevent the "double render" flick.
  const computerState = useMemo(() => {
    if (!game) {
      return {
        name: "Computer",
        handLength: 0,
        isCurrentPlayer: false,
      };
    }
    const computerPlayer = game.gameState.players[1];
    const isComputerTurn = game.gameState.currentPlayer === 1;
    return {
      name: computerPlayer.name,
      handLength: computerPlayer.hand.length,
      isCurrentPlayer: isComputerTurn,
    };
  }, [
    game?.gameState.players[1]?.name,
    game?.gameState.players[1]?.hand.length,
    game?.gameState.currentPlayer,
  ]);
  // --- END STABILIZATION FIX 2 ---

  // --- CONSTANTS ---
  const playerHandLimit = 5;
  const layoutHandSize = 6;

  const isPagingActive = playerHand.length > playerHandLimit;
  const showPagingButton = !!game && isPagingActive;
  const gameRef = useRef(game);
  const isAnimatingRef = useRef(isAnimating);
  const isPagingActiveRef = useRef(isPagingActive);

  const playerHandIdsSV = useSharedValue<string[]>([]);
  const lastHandIdStringRef = useRef<string | null>(null);

  useEffect(() => {
    const newHandIds = playerHand.map((c) => c.id);
    const newHandIdString = newHandIds.join(",");
    if (newHandIdString !== lastHandIdStringRef.current) {
      playerHandIdsSV.value = newHandIds;
      lastHandIdStringRef.current = newHandIdString;
    } else {
      console.log("LOG: Player hand unchanged. Skipping SV update.");
    }
  }, [playerHand]);

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

  // 🧩 ✅ HELPER: Runs the sequential draw loop
 const runForcedDrawSequence = useCallback(
    async (startingState: GameState): Promise<GameState> => {
      const dealer = cardListRef.current;
      if (!dealer) return startingState;

      let currentState = startingState;
      const drawAction = currentState.pendingAction;

      if (!drawAction || drawAction.type !== "draw") {
        return startingState;
      }

      const { playerIndex, count } = drawAction;
      const target = playerIndex === 0 ? "player" : "computer";

      console.log(`🔥 Forcing ${target} to draw ${count} card(s) sequentially.`);

      for (let i = 0; i < count; i++) {
        // 1. Execute logic for *one* draw
        const { newState, drawnCard } = executeForcedDraw(currentState);

        if (!drawnCard) {
          console.warn("Market empty, stopping forced draw.");
          currentState = newState;
          break;
        }

        // 2. Set state for this single draw
        runOnJS(setGame)((prev) => {
          gameRef.current = prev ? { ...prev, gameState: newState } : null;
          return gameRef.current;
        });

        // 3. Animate the card & Shift existing cards
        // We get the NEW hand (where drawnCard is at index 0)
        const targetPlayer = newState.players[playerIndex];
        const visibleHand = targetPlayer.hand.slice(0, layoutHandSize);
        
        const animationPromises: Promise<void>[] = [];

        // Loop through the visible hand to animate everyone
        visibleHand.forEach((card, index) => {
          const isTheNewCard = card.id === drawnCard.id;
          
          // Logic: If it's the new card, it flies from market.
          // If it's an old card, it slides to its new index (Shifting right).
          animationPromises.push(
            dealer.dealCard(
              card, 
              target, 
              { 
                cardIndex: index, // ✅ New card goes to 0, others shift to 1, 2...
                handSize: layoutHandSize 
              }, 
              false // smooth animation
            )
          );

          // Flip if it is the new card and it's the player
          if (isTheNewCard && target === "player") {
             animationPromises.push(dealer.flipCard(drawnCard, true));
          }
        });

        await Promise.all(animationPromises);

        // 4. Update currentState for the *next* iteration
        currentState = newState;

        await new Promise((res) => setTimeout(res, 300)); // Sequential delay between cards
      }

      console.log("🔥 Forced draw complete.");
      return currentState;
    },
    [layoutHandSize]
  );
   
const handleSuitSelection = useCallback((selectedSuit: CardSuit) => {
    const currentGame = gameRef.current;
    if (!currentGame) return;

    const { gameState } = currentGame;
    const { pendingAction } = gameState;

    // Must be in 'call_suit' mode
    if (!pendingAction || pendingAction.type !== "call_suit") return;

    console.log(`🎨 Suit Selected: ${selectedSuit} by Player ${pendingAction.playerIndex}`);

    const newState: GameState = {
      ...gameState,
      calledSuit: selectedSuit, // ✅ Sets the Active Shape in Center
      pendingAction: null,
      currentPlayer:
        pendingAction.nextAction === "pass"
          ? (gameState.currentPlayer + 1) % gameState.players.length
          : gameState.currentPlayer,
    };

    setGame((prev) => (prev ? { ...prev, gameState: newState } : null));
  }, []);
  
const activeCalledSuit = useMemo(() => {
    if (!game) return null;
    const { pile, calledSuit } = game.gameState;
    const topCard = pile[pile.length - 1];

    // Show if top card is 20 and a suit is active
    if (topCard?.number === 20 && calledSuit) {
      return calledSuit;
    }
    return null;
  }, [game?.gameState.pile, game?.gameState.calledSuit]);

  const SPECIAL_CARD_DELAY = 500;
  // 🧩 Handle computer AI updates
 const handleComputerTurn = useCallback(async () => {
    const dealer = cardListRef.current;
    const currentGame = gameRef.current;
    const animating = isAnimatingRef.current;

    // 1. Safety Checks
    if (
      !currentGame ||
      animating ||
      currentGame.gameState.currentPlayer !== 1 ||
      !dealer
    ) {
      return;
    }

    console.log("🤖 Computer's turn starting...");
    setIsAnimating(true);

    try {
      const oldState = currentGame.gameState;
      const { ruleVersion } = oldState;
      const computerPlayerIndex = 1;

      // 2. AI Decides Move
      const move = chooseComputerMove(
        oldState,
        computerPlayerIndex,
        computerLevel
      );

      // ---------------------------------------------
      // CASE A: COMPUTER PLAYS A CARD
      // ---------------------------------------------
      if (move) {
        console.log("🤖 Computer chose to PLAY:", move.id);

        let newState: GameState;
        try {
          newState = playCard(oldState, computerPlayerIndex, move, ruleVersion);
        } catch (e: any) {
          console.error("🤖 AI Logic Error (Invalid Move):", e.message);
          // FALLBACK: If AI messes up, force it to pick a card
          const { newState: pickState, drawnCards } = pickCard(
            oldState,
            computerPlayerIndex
          );
          setGame((prevGame) =>
            prevGame ? { ...prevGame, gameState: pickState } : null
          );
          // Animate the forced pick
          if (drawnCards.length > 0) {
            const newHand = pickState.players[computerPlayerIndex].hand;
            const promises = newHand.map((card, index) =>
              dealer.dealCard(
                card,
                "computer",
                { cardIndex: index, handSize: layoutHandSize },
                false
              )
            );
            await Promise.all(promises);
          }
          return; // Exit
        }

        // 3. Update State (Card leaves hand logic)
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );

        // 4. Animate Card to Pile
        const finalPileIndex = newState.pile.length - 1;
        const animationPromises: Promise<void>[] = [];

        // Move card to pile
        animationPromises.push(
          dealer.dealCard(
            move,
            "pile",
            { cardIndex: finalPileIndex },
            false
          )
        );
        // Flip face up
        animationPromises.push(dealer.flipCard(move, true));

        // Reorganize Computer Hand (Shift remaining cards)
        const newHand = newState.players[computerPlayerIndex].hand;
        newHand.forEach((card, index) =>
          animationPromises.push(
            dealer.dealCard(
              card,
              "computer",
              { cardIndex: index, handSize: layoutHandSize },
              true // Instant shift for cleaner look
            )
          )
        );

        await Promise.all(animationPromises);

        // ============================================================
        // ✅ NEW LOGIC: HANDLE WHOT (20) SUIT SELECTION
        // ============================================================
        if (
          newState.pendingAction?.type === "call_suit" &&
          newState.pendingAction.playerIndex === computerPlayerIndex
        ) {
          console.log("🤖 Computer played WHOT! Thinking of suit...");
          
          // 1. AI Logic: Choose best suit based on hand
          const bestSuit = chooseComputerSuit(newState.players[computerPlayerIndex].hand);
          
          // 2. Realistic Delay
          await new Promise((res) => setTimeout(res, 800));

          console.log(`🤖 Computer calls: ${bestSuit}`);

          // 3. Resolve the Action (Update State)
          const finalState: GameState = {
            ...newState,
            calledSuit: bestSuit, // Sets active shape in center
            pendingAction: null,  // Clear action
            // Pass turn if rule says so (usually 'pass' for Whot)
            currentPlayer:
              newState.pendingAction.nextAction === "pass"
                ? (newState.currentPlayer + 1) % newState.players.length
                : newState.currentPlayer,
          };

          // 4. Update Game
          setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));
          
          // Exit here, turn is fully complete
          return; 
        }
        // ============================================================

        // 5. Handle Forced Draws (Attack Cards: 14, 2, 5)
        if (newState.pendingAction?.type === "draw") {
          console.log(`⏳ Attack card played! Waiting ${SPECIAL_CARD_DELAY}ms...`);
          await new Promise((resolve) =>
            setTimeout(resolve, SPECIAL_CARD_DELAY)
          );

          const finalState = await runForcedDrawSequence(newState);
          setGame((prevGame) =>
            prevGame ? { ...prevGame, gameState: finalState } : null
          );
        }

      } else {
        // ---------------------------------------------
        // CASE B: COMPUTER PICKS A CARD
        // ---------------------------------------------
        console.log("🤖 Computer chose to PICK");
        
        const { newState, drawnCards } = pickCard(oldState, computerPlayerIndex);
        
        if (drawnCards.length === 0) {
          // Market empty logic
          setGame((prevGame) =>
            prevGame ? { ...prevGame, gameState: newState } : null
          );
          return;
        }

        console.log(`🤖 Computer drew ${drawnCards.length} card(s).`);
        
        // Update State
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );

        // Animate Draw
        const newHand = newState.players[computerPlayerIndex].hand;
        const animationPromises: Promise<void>[] = [];
        
        // We only animate the *new* hand layout. 
        // Ideally we'd animate just the new card, but re-laying out is safer for alignment.
        newHand.forEach((card, index) => {
          animationPromises.push(
            dealer.dealCard(
              card, 
              "computer", 
              { cardIndex: index, handSize: layoutHandSize }, 
              false
            )
          );
        });
        
        await Promise.all(animationPromises);
      }
    } catch (err) {
      console.error("🔥 Error during handleComputerTurn:", err);
    } finally {
      setIsAnimating(false);
    }
  }, [computerLevel, runForcedDrawSequence, layoutHandSize]);

  // ✅ --- STABILIZATION FIX 3: STABLE CALLBACKS --- ✅
  const handlePickFromMarket = useCallback(async () => {
    const dealer = cardListRef.current;
    const currentGame = gameRef.current;
    const animating = isAnimatingRef.current;
    if (
      !currentGame ||
      animating ||
      currentGame.gameState.currentPlayer !== 0 ||
      !dealer
    ) {
      return;
    }
    setIsAnimating(true);
    const oldState = currentGame.gameState;
    const { newState: stateAfterPick, drawnCards } = pickCard(oldState, 0);
    if (drawnCards.length === 0) {
      setGame((prevGame) =>
        prevGame ? { ...prevGame, gameState: stateAfterPick } : null
      );
      setIsAnimating(false);
      return;
    }
    const currentHand = stateAfterPick.players[0].hand;
    const drawnCardIds = new Set(drawnCards.map((c) => c.id));
    const oldHandCards = currentHand.filter(
      (card) => !drawnCardIds.has(card.id)
    );
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
    newVisibleHand.forEach((card, index) => {
      const options = { cardIndex: index, handSize: layoutHandSize };
      animationPromises.push(dealer.dealCard(card, "player", options, false));
      if (drawnCardIds.has(card.id)) {
        animationPromises.push(dealer.flipCard(card, true));
      }
    });
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
    for (const card of drawnCards) {
      const isVisible = newVisibleHand.some((c) => c.id === card.id);
      if (!isVisible) {
        animationPromises.push(
          dealer.dealCard(card, "market", { cardIndex: 0 }, false)
        );
        animationPromises.push(dealer.flipCard(card, true));
      }
    }
    await Promise.all(animationPromises);
    setIsAnimating(false);
  }, []); // ✅ Empty array makes this function stable

  const handlePagingPress = useCallback(async () => {
    const dealer = cardListRef.current;
    const currentGame = gameRef.current;
    const animating = isAnimatingRef.current;
    const pagingActive = isPagingActiveRef.current;
    if (!dealer || animating || !currentGame || !pagingActive) return;
    setIsAnimating(true);
    const oldHand = currentGame.gameState.players[0].hand;
    const oldVisibleHand = oldHand.slice(0, playerHandLimit);
    const cardToMove = oldHand[oldHand.length - 1];
    const remainingCards = oldHand.slice(0, oldHand.length - 1);
    const newHand = [cardToMove, ...remainingCards];
    const newVisibleHand = newHand.slice(0, playerHandLimit);
    const cardEntering = cardToMove;
    const cardLeaving = oldVisibleHand[playerHandLimit - 1];
    const newState = {
      ...currentGame.gameState,
      players: currentGame.gameState.players.map((p, i) =>
        i === 0 ? { ...p, hand: newHand } : p
      ),
    };
    setGame((prevGame) =>
      prevGame ? { ...prevGame, gameState: newState } : null
    );
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
          false
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
  }, []); // ✅ Empty array makes this function stable

  const onCardListReady = useCallback(() => {
    console.log("✅ Card list ready!");
    setIsCardListReady(true);
  }, []); // ✅ Empty array makes this function stable

  const handlePlayCard = useCallback(
    async (card: Card) => {
      const dealer = cardListRef.current;
      const currentGame = gameRef.current;
      const animating = isAnimatingRef.current;
      if (
        !currentGame ||
        animating ||
        currentGame.gameState.currentPlayer !== 0 ||
        !dealer
      ) {
        return;
      }

      // 1. Set animating flag
      setIsAnimating(true);

      // 2. Wrap ALL logic in a try/finally
      try {
        let newState: GameState;
        const playedCard: Card = card;

        try {
          newState = playCard(
            currentGame.gameState,
            0,
            card,
            currentGame.gameState.ruleVersion
          );
        } catch (error: any) {
          console.log("Invalid move:", error.message);
          // Don't just return, let the 'finally' block run
          return;
        }

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

        // Set intermediate state
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );

        if (newlyVisibleCards.length > 0) {
          newlyVisibleCards.forEach((newCard, index) => {
            const offscreenIndex = playerHandLimit + index;
            dealer.teleportCard(newCard, "player", {
              cardIndex: offscreenIndex,
              handSize: layoutHandSize,
            });
          });
        }

        const animationPromises: Promise<void>[] = [];
        const finalPileIndex = newState.pile.length - 1;
        animationPromises.push(
          dealer.dealCard(playedCard, "pile", { cardIndex: finalPileIndex }, false)
        );
        animationPromises.push(dealer.flipCard(playedCard, true));

        newVisibleHand.forEach((handCard, index) => {
          animationPromises.push(
            dealer.dealCard(
              handCard,
              "player",
              { cardIndex: index, handSize: layoutHandSize },
              false
            )
          );
        });

        await Promise.all(animationPromises);

        // Check if this move triggered a forced draw
     if (newState.pendingAction?.type === "draw") {
          console.log(`⏳ Special card played! Waiting ${SPECIAL_CARD_DELAY}ms...`);
          await new Promise((resolve) => setTimeout(resolve, SPECIAL_CARD_DELAY));

          const finalState = await runForcedDrawSequence(newState);
          setGame((prevGame) =>
            prevGame ? { ...prevGame, gameState: finalState } : null
          );
        }
      } catch (err) {
        console.error("Error during handlePlayCard:", err);
      } finally {
        setIsAnimating(false);
      }
    },
    [runForcedDrawSequence, layoutHandSize, playerHandLimit]
  );

  const showSuitSelector = useMemo(() => {
        if (!game) return false;
        const { pendingAction, currentPlayer } = game.gameState;
        // Show if waiting for suit call AND it is Player 0 (Human)
        return (
            pendingAction?.type === "call_suit" && 
            pendingAction.playerIndex === 0
        );
    }, [game?.gameState.pendingAction, game?.gameState.currentPlayer]);
  
  // ✅ FIX 2: THIS 'useEffect' WAS MISSING
  // 🧩 EFFECT: Trigger Computer's Turn
  useEffect(() => {
    // Basic guards: Don't run if game isn't ready or an animation is in progress
    if (!game || isAnimating || !hasDealt) {
      return;
    }

    // Do not run AI if a 'draw' action is pending for *any* player
    // The draw sequence loop will handle this.
    if (game.gameState.pendingAction?.type === "draw") {
      return;
    }

    // It's the computer's turn (player index 1)
    if (game.gameState.currentPlayer === 1) {
      // "Thinking" delay
      const timer = setTimeout(() => {
        runOnJS(handleComputerTurn)();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [
    game?.gameState.currentPlayer,
    game?.gameState.pendingAction,
    isAnimating,
    hasDealt,
    handleComputerTurn,
  ]);

  // 🧩 EFFECT: Initial Smooth Deal Animation
  useEffect(() => {
    if (
      !isCardListReady ||
      !cardListRef.current ||
      !game ||
      hasDealt ||
      !isAnimating
    ) {
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
            { cardIndex: i, handSize: layoutHandSize },
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
      visiblePlayerHand.forEach((card) => {
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

  // Handle Screen Rotation
  useLayoutEffect(() => {
    const currentGame = gameRef.current;
    const animating = isAnimatingRef.current;
    if (
      !isCardListReady ||
      !cardListRef.current ||
      !currentGame ||
      animating ||
      !hasDealt
    ) {
      return;
    }
    console.log(
      "🔄 Screen rotated (using stable layout), instantly moving cards..."
    );
    const dealer = cardListRef.current;
    const { players, pile, market } = currentGame.gameState;
    const playerHand = players[0].hand;
    const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
    const hiddenPlayerHand = playerHand.slice(playerHandLimit);
    visiblePlayerHand.forEach((card, index) => {
      if (card) {
        dealer.dealCard(
          card,
          "player",
          { cardIndex: index, handSize: layoutHandSize },
          true
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
          { cardIndex: index, handSize: layoutHandSize },
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
  }, [
    stableWidth, // ✅ React to STABLE width
    stableHeight, // ✅ React to STABLE height
    isCardListReady,
    hasDealt,
  ]);

  if (!areLoaded || !stableFont || !stableWhotFont) {
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
          {/* ✅ Pass the stable computerState */}
          <ComputerUI computerState={computerState} level={computerLevel} />
        </View>
      )}
      {/* ✅ Pass stable props to all children */}
      <MemoizedBackground width={stableWidth} height={stableHeight} />
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
            onPress={handlePagingPress} // ✅ Pass stable prop
            style={({ pressed }) => [
              styles.pagingButtonBase,
              styles.rightPagingButton,
              pressed && { backgroundColor: "#e6c200" },
            ]}
          >
            <Text style={styles.pagingIcon}>{">"}</Text>
          </Pressable>
        )}
      </View>

      {game && (
        <MarketPile
          count={marketCardCount}
          font={stableWhotFont}
          smallFont={stableFont}
          width={stableWidth} // ✅ Pass stable prop
          height={stableHeight} // ✅ Pass stable prop
          onPress={handlePickFromMarket} // ✅ Pass stable prop
        />
      )}
      {allCards.length > 0 && stableFont && stableWhotFont && (
        <AnimatedCardList
          ref={cardListRef}
          cardsInPlay={allCards}
          playerHandIdsSV={playerHandIdsSV}
          font={stableFont} // ✅ Pass stable prop
          whotFont={stableWhotFont} // ✅ Pass stable prop
          width={stableWidth} // ✅ Pass stable prop
          height={stableHeight} // ✅ Pass stable prop
          onCardPress={handlePlayCard} // ✅ Pass stable prop
          onReady={onCardListReady} // ✅ Pass stable prop
        />
      )}
       
       {/* ✅ RENDER THE ACTIVE SUIT ON TOP OF PILE */}
       {activeCalledSuit && stableFont && (
        <ActiveSuitCard
          suit={activeCalledSuit}
          x={pileCoords.x} // ✅ Uses exact pile center X
          y={pileCoords.y} // ✅ Uses exact pile center Y
          font={stableFont}
        />
      )}

      <WhotSuitSelector
          isVisible={showSuitSelector}
          onSelectSuit={handleSuitSelection}
          width={stableWidth}
          height={stableHeight}
          font={stableFont}
        />
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
    left: "26%",
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
