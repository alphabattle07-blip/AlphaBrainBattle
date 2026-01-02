// LudoCoreUI.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions, View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { LudoSkiaBoard } from "./LudoSkiaBoard";

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
    rollPrompt: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 }
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
import { getComputerMove } from "../../computer/LudoComputerLogic";
import { Ludo3DDie } from "./Ludo3DDie";

const DiceHouse = ({ dice, diceUsed, onPress, waitingForRoll }: { dice: number[], diceUsed: boolean[], onPress: () => void, waitingForRoll: boolean }) => (
    <TouchableOpacity
        style={styles.diceHouse}
        onPress={onPress}
        disabled={!waitingForRoll}
        activeOpacity={0.8}
    >
        {waitingForRoll && dice.length === 0 ? (
            <Text style={styles.rollPrompt}> ROLL</Text>
        ) : (
            <View style={styles.diceRow}>
                {dice.map((d, i) => (
                    <Ludo3DDie
                        key={i}
                        value={d}
                        size={35}
                        isUsed={diceUsed[i]}
                    />
                ))}
            </View>
        )}
    </TouchableOpacity>
);

type LudoGameProps = {
    initialGameState?: LudoGameState;
    player?: { name: string; country?: string; rating?: number; isAI?: boolean };
    opponent?: { name: string; country?: string; rating?: number; isAI?: boolean };
    onGameStatsUpdate?: (result: "win" | "loss" | "draw", newRating: number) => void;
    level?: any; // Placeholder for AI level
};

export const LudoCoreUI: React.FC<LudoGameProps> = ({
    initialGameState,
    player: propPlayer,
    opponent: propOpponent,
    onGameStatsUpdate,
    level,
}) => {
    const navigation = useNavigation();
    const [gameState, setGameState] = useState<LudoGameState>(
        initialGameState ?? initializeGame()
    );

    const defaultPlayer = { name: "Player", country: "NG", rating: 1200, isAI: false };
    const defaultOpponent = { name: "Opponent", country: "US", rating: 1500, isAI: true };

    const player = propPlayer ?? defaultPlayer;
    const opponent = propOpponent ?? defaultOpponent;


    // --- Derived State for Board ---
    const boardPositions = useMemo(() => {
        // Map gameState to { [playerId]: [pos1, pos2, pos3, pos4] }
        // But LudoSkiaBoard uses LudoSeed directly? 
        // LudoSkiaBoard props: positions?: { [key: string]: number[] };
        // We need to transform LudoGameState to this format.
        const posMap: { [key: string]: number[] } = {};
        gameState.players.forEach(p => {
            posMap[p.id] = p.seeds.map(s => s.position);
        });
        return posMap;
    }, [gameState]);


    // --- Game Loop / AI ---
    // (Simplified for now: Just standard turns)
    useEffect(() => {
        if (gameState.winner) {
            Alert.alert("Game Over", `Winner: ${gameState.winner}`);
        }
    }, [gameState.currentPlayerIndex, gameState.winner]);

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
        blue: { x: 0.38, y: 0.710 },   // P1 (User) - Bottom Right
        green: { x: 0.62, y: 0.216 },  // P2 (AI) - Top Left
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
            {/* Game Board - Centered */}
            <View style={styles.boardContainer}>
                <LudoSkiaBoard
                    onBoardPress={handleBoardPress}
                    positions={boardPositions}
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
                    />
                </View>
            )}
        </View>
    );
};

export default LudoCoreUI;
