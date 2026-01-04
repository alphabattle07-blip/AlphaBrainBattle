// LudoCoreUI.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions, View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { LudoSkiaBoard } from "./LudoSkiaBoard";
import LudoPlayerProfile from "./LudoPlayerProfile";


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#222" },
    boardContainer: { flex: 1, justifyContent: "center", alignItems: 'center' },

    // Dice House Styles
    diceHouse: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 4,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center'
    },
    diceRow: { flexDirection: 'row', gap: 5 },
    rollPrompt: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
    diceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankIconOverlay: {
        fontSize: 28,
    },


    // Whot-style Profile Arrangement
    opponentUIContainer: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    playerUIContainer: {
        position: 'absolute',
        bottom: 50,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 10,
    }
});
import {
    initializeGame,
    rollDice,
    getValidMoves,
    applyMove,
    LudoGameState,
    LudoSeed,
    MoveAction,
    passTurn
} from "./LudoGameLogic"; // Adapting imports based on LudoGameLogic.ts
import { getRankFromRating } from '../../../../utils/rank';
import { getComputerMove } from "../../computer/LudoComputerLogic";
import { Ludo3DDie } from "./Ludo3DDie";

const DiceHouse = ({ dice, diceUsed, onPress, waitingForRoll, rankIcon }: { dice: number[], diceUsed: boolean[], onPress: () => void, waitingForRoll: boolean, rankIcon: string }) => (
    <TouchableOpacity
        style={styles.diceHouse}
        onPress={onPress}
        disabled={!waitingForRoll}
        activeOpacity={0.8}
    >
        <View style={styles.diceRow}>
            {dice.length > 0 ? (
                dice.map((d, i) => (
                    <Ludo3DDie
                        key={i}
                        value={d}
                        size={35}
                        isUsed={diceUsed[i]}
                    />
                ))
            ) : (
                // Placeholder to keep the house size consistent when empty
                <View style={{ width: 35, height: 35 }} />
            )}
        </View>

        {waitingForRoll && (
            <View style={styles.diceOverlay}>
                <Text style={styles.rankIconOverlay}>{rankIcon}</Text>
            </View>
        )}
    </TouchableOpacity>
);


type LudoGameProps = {
    initialGameState?: LudoGameState;
    player?: { name: string; country?: string; rating?: number; isAI?: boolean; avatar?: string | null };
    opponent?: { name: string; country?: string; rating?: number; isAI?: boolean; avatar?: string | null };
    onGameStatsUpdate?: (result: "win" | "loss" | "draw", newRating: number) => void;
    onGameOver?: (winnerId: string) => void;
    level?: any; // Placeholder for AI level
};

export const LudoCoreUI: React.FC<LudoGameProps> = ({
    initialGameState,
    player: propPlayer,
    opponent: propOpponent,
    onGameStatsUpdate,
    onGameOver,
    level,
}) => {
    const navigation = useNavigation();
    const [gameState, setGameState] = useState<LudoGameState>(
        initialGameState ?? initializeGame('blue', 'green')
    );

    const defaultPlayer = { name: "Player", country: "NG", rating: 1200, isAI: false, avatar: null as string | null };
    const defaultOpponent = { name: "Opponent", country: "US", rating: 1500, isAI: true, avatar: null as string | null };

    const player = propPlayer ?? defaultPlayer;
    const opponent = propOpponent ?? defaultOpponent;


    // --- Derived State for Board ---
    const boardPositions = useMemo(() => {
        const posMap: { [key: string]: { pos: number, land: number, delay: number, isActive: boolean }[] } = {};

        // Human player is at index 0 (p1)
        const isHumanTurn = gameState.currentPlayerIndex === 0;
        // Indicators only show:
        // 1. If it's the human's turn
        // 2. If the human has already rolled the dice
        // 3. If there are dice values remaining to be used
        const showHumanIndicators = isHumanTurn && !gameState.waitingForRoll && gameState.dice.length > 0 && !gameState.winner;

        const currentValidMoves = showHumanIndicators ? getValidMoves(gameState) : [];

        gameState.players.forEach((p, pIdx) => {
            const isP1 = p.id === 'p1'; // P1 is the human

            posMap[p.id] = p.seeds.map((s, idx) => {
                // Determine if this specific seed could move with the current dice
                const seedCanMove = showHumanIndicators && isP1 && currentValidMoves.some(m => m.seedIndex === idx);

                return {
                    pos: s.position,
                    land: s.landingPos,
                    delay: s.animationDelay || 0,
                    isActive: !!seedCanMove
                };
            });
        });
        return posMap;
    }, [gameState]);


    useEffect(() => {
        if (gameState.winner) {
            // Alert.alert("Game Over", `Winner: ${gameState.winner}`);
            onGameOver?.(gameState.winner);
        }
    }, [gameState.currentPlayerIndex, gameState.winner, onGameOver]);

    // Calculate finished seeds for each player (score)
    const p1Score = useMemo(() => gameState.players[0].seeds.filter(s => s.position === 56).length, [gameState.players[0].seeds]);
    const p2Score = useMemo(() => gameState.players[1].seeds.filter(s => s.position === 56).length, [gameState.players[1].seeds]);

    // Rank Icons for overlay
    const playerRank = useMemo(() => getRankFromRating(player.rating || 1200) || { icon: '🌱' }, [player.rating]);
    const opponentRank = useMemo(() => getRankFromRating(opponent.rating || 1500) || { icon: '🌱' }, [opponent.rating]);



    // --- Handlers ---

    const handleRollDice = useCallback(() => {
        if (gameState.winner) return;
        setGameState(prev => rollDice(prev));
    }, [gameState.winner]);

    // --- Auto Pass & Turn Logic ---
    useEffect(() => {
        if (!gameState.waitingForRoll && !gameState.winner) {
            const moves = getValidMoves(gameState);
            if (moves.length === 0) {
                // No valid moves available - Auto Pass
                // Add delay so user sees digits
                const timer = setTimeout(() => {
                    setGameState(prev => passTurn(prev));
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [gameState, gameState.dice, gameState.diceUsed, gameState.waitingForRoll]);

    // AI Turn Loop
    useEffect(() => {
        const isAiTurn = gameState.currentPlayerIndex === 1 && !gameState.winner;
        if (isAiTurn) {
            const aiDelay = 1000;

            if (gameState.waitingForRoll) {
                // AI Rolls Dice
                const timer = setTimeout(() => {
                    handleRollDice();
                }, aiDelay);
                return () => clearTimeout(timer);
            } else {
                // AI Picks Move
                const timer = setTimeout(() => {
                    const moves = getValidMoves(gameState);
                    if (moves.length > 0) {
                        const aiMove = getComputerMove(gameState, level || 2); // Default to level 2
                        if (aiMove) {
                            setGameState(prev => applyMove(prev, aiMove));
                        }
                    } else {
                        // No moves possible? LudoGameLogic currently doesn't auto-pass in 'getValidMoves' -> it returns empty.
                        // We need to pass turn if no moves. 
                        // But 'rollDice' logic might have handled the pass if 'allDiceUsed'? 
                        // No, if we rolled and have 0 valid moves, we are stuck unless we explicitly pass.
                        // However, standard Ludo: if you roll and can't move, turn passes immediately.
                        // Let's implement a 'pass' logic just in case:
                        // But wait, applyMove handles turn switching. We can't call applyMove with null.
                        // We might need a 'passTurn' function in Logic.
                        // For now, let's assume valid moves exist or the logic handles it naturally (TODO: Verify Empty Move Logic).
                        // To keep it simple: If no moves but dice rolled, just re-set state to next player?
                        // Or call a hypothetical passTurn.
                        // For this iteration, assuming Random/Aggressive always finds a move if valid array > 0.
                    }
                }, aiDelay);
                return () => clearTimeout(timer);
            }
        }
    }, [gameState, handleRollDice, level]);

    const handleBoardPress = useCallback((x: number, y: number, tappedSeed?: { playerId: string; seedIndex: number; position: number } | null) => {
        // If a seed was tapped, log it and try to move that specific seed
        if (tappedSeed) {
            console.log("Seed pressed:", tappedSeed.playerId, "seed", tappedSeed.seedIndex, "at position", tappedSeed.position);

            // Only allow player 1 (human) to move their seeds
            if (tappedSeed.playerId !== 'p1') {
                console.log("Cannot move opponent's seed");
                return;
            }

            // Check if it's player 1's turn
            if (gameState.currentPlayerIndex !== 0) {
                console.log("Not player 1's turn, current player:", gameState.currentPlayerIndex);
                return;
            }

            // Debug: Log game state
            console.log("Game state - waitingForRoll:", gameState.waitingForRoll, "dice:", gameState.dice, "diceUsed:", gameState.diceUsed);

            if (!gameState.waitingForRoll) {
                const moves = getValidMoves(gameState);
                console.log("Valid moves:", JSON.stringify(moves));

                // Find a move for the tapped seed
                const matchingMove = moves.find(move => move.seedIndex === tappedSeed.seedIndex);
                if (matchingMove) {
                    console.log("Applying move for seed", tappedSeed.seedIndex, "->", matchingMove);
                    setGameState(prev => applyMove(prev, matchingMove));
                } else {
                    console.log("No valid move for seed", tappedSeed.seedIndex);
                }
            } else {
                console.log("Waiting for roll, cannot move");
            }
        } else {
            console.log("Board pressed at:", x, y, "(no seed hit)");
        }
    }, [gameState]);

    // --- Dice Positioning Configuration ---
    // Normalized coordinates (0-1) relative to screen size
    const DICE_POS_CONFIG = {
        blue: { x: 0.385, y: 0.770 },   // P1 (User) - Bottom Right
        green: { x: 0.617, y: 0.276 },  // P2 (AI) - Top Left
        red: { x: 0.15, y: 0.85 },    // Placeholder
        yellow: { x: 0.85, y: 0.15 }  // Placeholder
    };

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const getDicePositionStyle = (playerColor: 'blue' | 'green') => {
        const checkPos = DICE_POS_CONFIG[playerColor];
        // Ensure we have a valid position, fallback to center if missing
        const pos = checkPos || { x: 0.5, y: 0.5 };

        return {
            position: 'absolute' as const,
            left: pos.x * windowWidth - 40, // Center the typically 80px wide house
            top: pos.y * windowHeight - 40,
        };
    };

    return (
        <View style={styles.container}>
            {/* 1. Opponent Profile (Top) */}
            <View style={styles.opponentUIContainer}>
                <LudoPlayerProfile
                    name={opponent.name}
                    rating={opponent.rating || 1500}
                    isAI={true}
                    isActive={gameState.currentPlayerIndex === 1}
                    color="#00FF00" // Green
                    score={p2Score}
                />
            </View>

            {/* Game Board - Centered */}
            <View style={styles.boardContainer}>
                <LudoSkiaBoard
                    onBoardPress={handleBoardPress}
                    positions={boardPositions}
                />
            </View>

            {/* 2. Player Profile (Bottom Right) */}
            <View style={styles.playerUIContainer}>
                <LudoPlayerProfile
                    name={player.name}
                    rating={player.rating || 1200}
                    isActive={gameState.currentPlayerIndex === 0}
                    color="#0000FF" // Blue
                    avatar={player.avatar}
                    score={p1Score}
                />
            </View>

            {/* Dice Houses - Absolutely Positioned */}


            {/* Player 2 (Green) */}
            {gameState.currentPlayerIndex === 1 && !gameState.winner && (
                <View style={getDicePositionStyle('green')}>
                    <DiceHouse
                        dice={gameState.dice}
                        diceUsed={gameState.diceUsed}
                        waitingForRoll={gameState.waitingForRoll}
                        onPress={handleRollDice}
                        rankIcon={opponentRank.icon}
                    />
                </View>
            )}

            {/* Player 1 (Blue) */}
            {gameState.currentPlayerIndex === 0 && !gameState.winner && (
                <View style={getDicePositionStyle('blue')}>
                    <DiceHouse
                        dice={gameState.dice}
                        diceUsed={gameState.diceUsed}
                        waitingForRoll={gameState.waitingForRoll}
                        onPress={handleRollDice}
                        rankIcon={playerRank.icon}
                    />
                </View>
            )}

        </View>
    );
};

export default LudoCoreUI;
