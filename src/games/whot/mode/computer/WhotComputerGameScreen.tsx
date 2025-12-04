// whotComputerGameScreen.tsx
import { SkFont } from "@shopify/react-native-skia";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { getCoords } from "../core/coordinateHelper";
import { Card, CardSuit, GameState } from "../core/types"; // <--- ADD THIS
import AnimatedCardList, {
  AnimatedCardListHandle,
} from "../core/ui/AnimatedCardList";
import MemoizedBackground from "../core/ui/MemoizedBackground";
import WhotSuitSelector from "../core/ui/WhotSuitSelector"; // <--- ADD THIS
// ✅ FIX 1: ADDED 'executeForcedDraw'
import { callSuit, executeForcedDraw, getReshuffledState, initGame, pickCard, playCard } from "../core/game";
import ComputerUI, { ComputerLevel, levels } from "./whotComputerUI";

import { usePlayerProfile } from "@/src/hooks/usePlayerProfile";
import { runOnJS, useSharedValue } from "react-native-reanimated";
import ActiveSuitCard from "../core/ui/ActiveSuitCard";
import GameOverModal from "../core/ui/GameOverModal";
import { MarketPile } from "../core/ui/MarketPile";
import { useWhotFonts } from "../core/ui/useWhotFonts";
import { CARD_HEIGHT } from "../core/ui/whotConfig";
import WhotPlayerProfile from "../core/ui/whotplayerProfile";
import { chooseComputerMove, chooseComputerSuit } from "./whotComputerLogic";

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
  const playerProfile = usePlayerProfile("whot");

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

  const playerState = useMemo(() => {
    if (!game) {
      return {
        name: playerProfile.name,
        rating: playerProfile.rating,
        country: playerProfile.country,
        avatar: playerProfile.avatar,
        handLength: 0,
        isCurrentPlayer: false,
      };
    }

    return {
      name: playerProfile.name,
      rating: playerProfile.rating,
      country: playerProfile.country,
      avatar: playerProfile.avatar,
      handLength: game.gameState.players[0].hand.length,
      isCurrentPlayer: game.gameState.currentPlayer === 0,
    };
  }, [
    game?.gameState.players[0]?.hand.length,
    game?.gameState.currentPlayer,
    playerProfile,
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

  const SPECIAL_CARD_DELAY = 500;

  const animateReshuffle = useCallback(async () => {
    const dealer = cardListRef.current;
    const currentGame = gameRef.current;
    if (!dealer || !currentGame) return;

    console.log("🔄 Animating reshuffle...");

    const currentPile = currentGame.gameState.pile;

    // 1. Identify the Survivor (The card that stays on top)
    const survivorCard = currentPile[currentPile.length - 1];

    // 2. Identify the cards leaving (All cards except the survivor)
    const pileToRecycle = currentPile.slice(0, currentPile.length - 1);

    // ✅ FIX: Reset the Survivor Card's visual index to 0.
    // This ensures that the NEXT card played (which will be index 1)
    // renders ON TOP of this survivor card.
    if (survivorCard) {
      // "teleportCard" updates the internal position state instantly without flying around
      dealer.teleportCard(survivorCard, "pile", { cardIndex: 0 });
    }

    // 3. Create animation promises for the cards leaving
    const reshufflePromises = pileToRecycle.map((card) => {
      // Animate each card flying from the pile to the market's position
      return dealer.dealCard(card, "market", { cardIndex: 0 }, false);
    });
    // 4. Wait for all animations to complete
    await Promise.all(reshufflePromises);

    // 5. Flip all recycled cards face down
    const flipPromises = pileToRecycle.map((card) =>
      dealer.flipCard(card, false)
    );
    await Promise.all(flipPromises);

    // 6. Short delay for visual effect
    await new Promise((res) => setTimeout(res, 300));

    console.log("✅ Reshuffle animation complete.");
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
        let { newState, drawnCard } = executeForcedDraw(currentState);

        if (!drawnCard) {
          console.log("Market empty during forced draw, reshuffling...");
          // Animate the reshuffle
          await animateReshuffle();
          // Get the new state from the game logic
          const reshuffledState = getReshuffledState(currentState);
          // Update game state
          runOnJS(setGame)((prev) => prev ? { ...prev, gameState: reshuffledState } : null);
          // Retry the draw on the reshuffled state
          const retryResult = executeForcedDraw(reshuffledState);
          newState = retryResult.newState;
          drawnCard = retryResult.drawnCard;
          if (!drawnCard) {
            console.warn("Still no card after reshuffle, stopping forced draw.");
            currentState = newState;
            break;
          }
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
          const isTheNewCard = card.id === drawnCard!.id;

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
            animationPromises.push(dealer.flipCard(drawnCard!, true));
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
    [layoutHandSize, animateReshuffle]
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
          newState = playCard(oldState, computerPlayerIndex, move);
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
                { cardIndex: index, handSize: newHand.length },
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
              { cardIndex: index, handSize: newHand.length },
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
        // ✅ --- AUTO-REFILL LOGIC ---
        // After a successful move, check if the market is empty
        const stateAfterPlay = gameRef.current?.gameState;
        if (stateAfterPlay && stateAfterPlay.market.length === 0) {
          console.log("🤖 Computer's move emptied the market. Auto-refilling...");
          await new Promise((res) => setTimeout(res, 500)); // Visual delay
          await animateReshuffle();
          const finalState = getReshuffledState(stateAfterPlay);
          setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));
        }
        // --- END AUTO-REFILL ---
 
       } else {
         // ---------------------------------------------
         // CASE B: COMPUTER PICKS A CARD
        // ---------------------------------------------
        console.log("🤖 Computer chose to PICK");

        // ✅ NEW LOGIC: If computer is defending, convert to a draw sequence
        if (oldState.pendingAction?.type === "defend") {
          console.log("🤖 Computer cannot defend. Converting to draw sequence.");
          const drawState: GameState = {
            ...oldState,
            pendingAction: {
              type: "draw",
              playerIndex: oldState.pendingAction.playerIndex,
              count: oldState.pendingAction.count,
              returnTurnTo: oldState.pendingAction.returnTurnTo,
            },
          };
          // Run the animation sequence
          const finalState = await runForcedDrawSequence(drawState);
          setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));
          return; // Exit here
        }

        // --- This is now the REGULAR (non-forced) pick logic ---
        const { newState, drawnCards } = pickCard(oldState, computerPlayerIndex);

        if (drawnCards.length === 0) {
          console.log("🤖 Market is empty. Computer must reshuffle.");
          // 1. Animate the reshuffle
          await animateReshuffle();
          // 2. Get the new state from the game logic
          const reshuffledState = getReshuffledState(oldState);
          // 3. NOW, execute the pick on the NEW state
          const { newState: finalState, drawnCards: newDrawnCards } = pickCard(
            reshuffledState,
            computerPlayerIndex
          );
          // 4. Update the game with the final state
          setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));
          // 5. Animate the single card draw
          if (newDrawnCards.length > 0) {
            const newHand = finalState.players[computerPlayerIndex].hand;
            const promises = newHand.map((card, index) =>
              dealer.dealCard(
                card,
                "computer",
                { cardIndex: index, handSize: newHand.length },
                false
              )
            );
            await Promise.all(promises);
          }
          return; // Stop here, the pick is done.
        }

        console.log(`🤖 Computer drew ${drawnCards.length} card(s).`);

        // Update State
        setGame((prevGame) =>
          prevGame ? { ...prevGame, gameState: newState } : null
        );

        // Animate Draw
        const newHand = newState.players[computerPlayerIndex].hand;
        const animationPromises: Promise<void>[] = [];

        newHand.forEach((card, index) => {
          animationPromises.push(
            dealer.dealCard(
              card,
              "computer",
              { cardIndex: index, handSize: newHand.length },
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

    const oldState = currentGame.gameState;

    // ✅ NEW: Check if this is a forced draw or a defense-to-draw for the player
    if (
      (oldState.pendingAction?.type === "draw" ||
        oldState.pendingAction?.type === "defend") &&
      oldState.pendingAction.playerIndex === 0
    ) {
      console.log("👉 Player is under a forced draw. Running sequence...");
      setIsAnimating(true);
      try {
        // ✅ If defending, convert to a draw action before running the sequence
        const stateToDraw =
          oldState.pendingAction?.type === "defend"
            ? {
                ...oldState,
                pendingAction: {
                  type: "draw" as const,
                  playerIndex: oldState.pendingAction.playerIndex,
                  count: oldState.pendingAction.count,
                  returnTurnTo: oldState.pendingAction.returnTurnTo,
                },
              }
            : oldState;

        const finalState = await runForcedDrawSequence(stateToDraw);
        setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));
      } catch (e) {
        console.error("Error during player forced draw:", e);
      } finally {
        setIsAnimating(false);
      }
      return; // Exit here
    }

    // ✅ MODIFICATION: If market is empty, trigger the refill logic
    if (oldState.market.length === 0) {
      console.log("👉 Player tapped empty market. Starting refill...");
      setIsAnimating(true);

      // 1. Animate the reshuffle
      await animateReshuffle();

      // 2. Get the new state from the game logic
      const reshuffledState = getReshuffledState(oldState);

      // 3. NOW, execute the pick on the NEW state
      const { newState: finalState, drawnCards } = pickCard(reshuffledState, 0);

      // 4. Update the game with the final state
      setGame((prev) => (prev ? { ...prev, gameState: finalState } : null));

      // 5. Animate the single card draw
      if (drawnCards.length > 0) {
        const drawnCard = drawnCards[0];
        const newHand = finalState.players[0].hand;

        // Animate the new card flying to the player's hand
        await dealer.dealCard(
          drawnCard,
          "player",
          { cardIndex: 0, handSize: layoutHandSize },
          false
        );
        await dealer.flipCard(drawnCard, true);

        // Shift the rest of the hand instantly
        newHand.slice(1).forEach((card, index) => {
          dealer.dealCard(
            card,
            "player",
            { cardIndex: index + 1, handSize: layoutHandSize },
            true
          );
        });
      }

      setIsAnimating(false);
      return; // Stop here, the pick is done.
    }

    // --- This is now the REGULAR (non-forced) draw logic ---
    setIsAnimating(true);
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

const handleRestart = useCallback(() => {
    if (selectedLevel) {
      const lvlValue = levels.find((l) => l.label === selectedLevel)?.value || 1;

      console.log("🔄 RESTARTING: Wiping state...");

      // 1. HARD RESET: Clear everything to force components to unmount
      setGame(null);       
      setAllCards([]);     
      setHasDealt(false);
      setIsCardListReady(false);
      setIsAnimating(false);

      // 2. Re-initialize after a short delay
      setTimeout(() => {
        console.log("🚀 RESTARTING: Initializing new game...");
        initializeGame(lvlValue);
      }, 100);
    }
  }, [selectedLevel, initializeGame]);

  // 👇 This was likely missing or deleted
  const handleNewBattle = useCallback(() => {
    setSelectedLevel(null);
    setGame(null); // Optional: Clear the background game while choosing a level
  }, []);

  useEffect(() => {
    const revealCards = async () => {
      const dealer = cardListRef.current;
      // Check if game is over and we haven't animated the reveal yet
      if (game?.gameState.winner && dealer) {
        console.log("🏆 Game Over! Revealing Computer Hand...");

        const computerHand = game.gameState.players[1].hand;
        const revealPromises: Promise<void>[] = [];

        // Force flip all computer cards face up
        computerHand.forEach((card) => {
          revealPromises.push(dealer.flipCard(card, true)); // true = face up
        });

        await Promise.all(revealPromises);
      }
    };

    revealCards();
  }, [game?.gameState.winner]);

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
            card
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
            { cardIndex: i, handSize: computerHand.length },
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
    
    // Safety checks
    if (
      !isCardListReady ||
      !cardListRef.current ||
      !currentGame ||
      animating ||
      !hasDealt
    ) {
      return;
    }

    console.log("🔄 Screen rotated. Snapping cards to new layout...");
    
    const dealer = cardListRef.current;
    const { players, pile, market } = currentGame.gameState;

    // We use requestAnimationFrame to ensure the new dimensions (stableWidth/Height)
    // are fully applied to the view before we calculate coordinates.
    requestAnimationFrame(() => {
        const playerHand = players[0].hand;
        
        // Split hand into Visible vs Hidden
        const visiblePlayerHand = playerHand.slice(0, playerHandLimit);
        const hiddenPlayerHand = playerHand.slice(playerHandLimit);

        // 1. Reposition VISIBLE cards (Indexes 0, 1, 2, 3, 4)
        // These keep their index so they spread out normally.
        visiblePlayerHand.forEach((card, index) => {
            if (card) {
                dealer.dealCard(
                    card,
                    "player",
                    { cardIndex: index, handSize: layoutHandSize },
                    true // true = Instant snap (no animation)
                );
            }
        });
        hiddenPlayerHand.forEach((card) => {
            if (card) {
                dealer.dealCard(
                    card,
                    "player",
                    { 
                        cardIndex: playerHandLimit, // <--- Constant (e.g., 5)
                        handSize: layoutHandSize 
                    },
                    true // Instant snap
                );
            }
        });

        // 3. Reposition Market (No change)
        market.forEach((card) => {
            if (card) {
                dealer.dealCard(card, "market", { cardIndex: 0 }, true);
            }
        });

        // 4. Reposition Computer Hand (No change)
        const computerHand = players[1].hand;
        computerHand.forEach((card, index) => {
            if (card) {
                dealer.dealCard(
                    card,
                    "computer",
                    { cardIndex: index, handSize: computerHand.length },
                    true
                );
            }
        });

        // 5. Reposition Pile (No change)
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
    });

  }, [
    stableWidth, // Trigger when width changes
    stableHeight, // Trigger when height changes
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

      {game && (
        <View
          style={[styles.playerUIContainer, { pointerEvents: "box-none" }]}
        >
          <WhotPlayerProfile
            name={playerState.name}
            rating={playerState.rating}
            country={playerState.country}
            avatar={playerState.avatar}
            cardCount={playerState.handLength}
            isCurrentPlayer={playerState.isCurrentPlayer}
            showCardCount={true}
          />
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
      <GameOverModal
        visible={!!game?.gameState.winner}
        winner={game?.gameState.winner || null}
        onRematch={handleRestart}
        onNewBattle={handleNewBattle}
        level={computerLevel}
        playerName={playerState.name}
        opponentName={computerState.name}
        playerRating={playerState.rating}
        result={
          game?.gameState.winner?.id.includes("player-0")
            ? "win"
            : game?.gameState.winner
            ? "loss"
            : "draw"
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <WhotPlayerProfile
            name={playerState.name}
            rating={playerState.rating}
            country={playerState.country}
            avatar={playerState.avatar}
            cardCount={playerState.handLength}
            isCurrentPlayer={false}
            showCardCount={false}
          />
          <WhotPlayerProfile
            name={computerState.name}
            rating={levels.find(l => l.value === computerLevel)?.rating || 1250}
            country="AI"
            avatar={null}
            cardCount={computerState.handLength}
            isCurrentPlayer={false}
            isAI={true}
            showCardCount={false}
          />
        </View>
      </GameOverModal>
    </View>
  );
};
export default WhotComputerGameScreen;

// Using the styles you provided
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffffff" },
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
  playerUIContainer: {
    position: "absolute",
    bottom: 40,
    right: 20,
    alignSelf: "flex-end",
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
