// LudoCoreUI.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions, View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { LudoSkiaBoard } from "./LudoSkiaBoard";
import LudoPlayerProfile from "./LudoPlayerProfile";
import {
    initializeGame,
    rollDice,
    getValidMoves,
    applyMove,
    LudoGameState,
    passTurn
} from "./LudoGameLogic";
import { getRankFromRating } from '../../../../utils/rank';
import { getComputerMove } from "../../computer/LudoComputerLogic";
import { Ludo3DDie } from "./Ludo3DDie";

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
    diceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankIconOverlay: {
        fontSize: 28,
    },

    // Profile Arrangement
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
    level?: any;
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
        initialGameState ?? initializeGame('blue', 'green', level || 2)
    );

    const defaultPlayer = { name: "Player", country: "NG", rating: 1200, isAI: false, avatar: null as string | null };
    const defaultOpponent = { name: "Opponent", country: "US", rating: 1500, isAI: true, avatar: null as string | null };

    const player = propPlayer ?? defaultPlayer;
    const opponent = propOpponent ?? defaultOpponent;

    // --- Derived State for Board ---
    const boardPositions = useMemo(() => {
        const posMap: { [key: string]: { pos: number, land: number, delay: number, isActive: boolean }[] } = {};
        const isHumanTurn = gameState.currentPlayerIndex === 0;
        const showHumanIndicators = isHumanTurn && !gameState.waitingForRoll && gameState.dice.length > 0 && !gameState.winner;
        const currentValidMoves = showHumanIndicators ? getValidMoves(gameState) : [];

        gameState.players.forEach((p) => {
            const isP1 = p.id === 'p1';
            posMap[p.id] = p.seeds.map((s, idx) => {
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
            onGameOver?.(gameState.winner);
        }
    }, [gameState.currentPlayerIndex, gameState.winner, onGameOver]);

    const p1Score = useMemo(() => gameState.players[0].seeds.filter(s => s.position === 56).length, [gameState.players[0].seeds]);
    const p2Score = useMemo(() => gameState.players[1].seeds.filter(s => s.position === 56).length, [gameState.players[1].seeds]);

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
                const timer = setTimeout(() => {
                    handleRollDice();
                }, aiDelay);
                return () => clearTimeout(timer);
            } else {
                const timer = setTimeout(() => {
                    const moves = getValidMoves(gameState);
                    if (moves.length > 0) {
                        const aiMove = getComputerMove(gameState, level || 2);
                        if (aiMove) {
                            setGameState(prev => applyMove(prev, aiMove));
                        }
                    }
                }, aiDelay);
                return () => clearTimeout(timer);
            }
        }
    }, [gameState, handleRollDice, level]);

    const handleBoardPress = useCallback((x: number, y: number, tappedSeed?: { playerId: string; seedIndex: number; position: number } | null) => {
        if (tappedSeed) {
            if (tappedSeed.playerId !== 'p1') return;
            if (gameState.currentPlayerIndex !== 0) return;

            if (!gameState.waitingForRoll) {
                const moves = getValidMoves(gameState);
                const matchingMove = moves.find(move => move.seedIndex === tappedSeed.seedIndex);
                if (matchingMove) {
                    setGameState(prev => applyMove(prev, matchingMove));
                }
            }
        }
    }, [gameState]);

    // --- Dice Positioning Configuration ---
    const DICE_POS_CONFIG = {
        blue: { x: 0.385, y: 0.770 },   // P1 (User)
        green: { x: 0.617, y: 0.276 },  // P2 (AI)
    };

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const getDicePositionStyle = (playerColor: 'blue' | 'green') => {
        const checkPos = DICE_POS_CONFIG[playerColor];
        const pos = checkPos || { x: 0.5, y: 0.5 };
        return {
            position: 'absolute' as const,
            left: pos.x * windowWidth - 40,
            top: pos.y * windowHeight - 40,
        };
    };

    // Determine active color for persistent dice house
    const activePlayerColor = gameState.currentPlayerIndex === 0 ? 'blue' : 'green';
    const diceHouseStyle = getDicePositionStyle(activePlayerColor);

    return (
        <View style={styles.container}>
            {/* 1. Opponent Profile */}
            <View style={styles.opponentUIContainer}>
                <LudoPlayerProfile
                    name={opponent.name}
                    rating={opponent.rating || 1500}
                    isAI={true}
                    isActive={gameState.currentPlayerIndex === 1}
                    color="#00FF00"
                    score={p2Score}
                />
            </View>

            {/* Game Board */}
            <View style={styles.boardContainer}>
                <LudoSkiaBoard
                    onBoardPress={handleBoardPress}
                    positions={boardPositions}
                    level={level || gameState.level}
                />
            </View>

            {/* 2. Player Profile */}
            <View style={styles.playerUIContainer}>
                <LudoPlayerProfile
                    name={player.name}
                    rating={player.rating || 1200}
                    isActive={gameState.currentPlayerIndex === 0}
                    color="#0000FF"
                    avatar={player.avatar}
                    score={p1Score}
                />
            </View>

            {/* Persistent Dice House - Moves instead of remounting */}
            {!gameState.winner && (
                <View style={diceHouseStyle}>
                    <DiceHouse
                        dice={gameState.dice}
                        diceUsed={gameState.diceUsed}
                        waitingForRoll={gameState.waitingForRoll}
                        onPress={handleRollDice}
                        rankIcon={gameState.currentPlayerIndex === 0 ? playerRank.icon : opponentRank.icon}
                    />
                </View>
            )}
        </View>
    );
};

export default LudoCoreUI;