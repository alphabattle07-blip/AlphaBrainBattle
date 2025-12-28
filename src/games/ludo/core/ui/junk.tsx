// Ludo3DDie

import React, { useMemo } from 'react';

import {

    Canvas,

    RoundedRect,

    LinearGradient,

    vec,

    Circle,

    Group,

    Shadow,

} from '@shopify/react-native-skia';

import { ViewStyle, View } from 'react-native';



interface Ludo3DDieProps {

    value: number;

    size?: number;

    isUsed?: boolean;

    style?: ViewStyle;

}



export const Ludo3DDie: React.FC<Ludo3DDieProps> = ({

    value,

    size = 40,

    isUsed = false,

    style,

}) => {

    const r = size * 0.18; // Slightly rounder

    const pipRadius = size * 0.11;

    const padding = size * 0.22;



    // Pip positions logic (Standard D6)

    const pips = useMemo(() => {

        const center = size / 2;

        const left = padding;

        const right = size - padding;

        const top = padding;

        const bottom = size - padding;



        const positions: { cx: number; cy: number }[] = [];

        const add = (cx: number, cy: number) => positions.push({ cx, cy });



        switch (value) {

            case 1:

                add(center, center);

                break;

            case 2:

                add(left, bottom); add(right, top);

                break;

            case 3:

                add(left, bottom); add(center, center); add(right, top);

                break;

            case 4:

                add(left, top); add(right, top);

                add(left, bottom); add(right, bottom);

                break;

            case 5:

                add(left, top); add(right, top);

                add(center, center);

                add(left, bottom); add(right, bottom);

                break;

            case 6:

                add(left, top); add(right, top);

                add(left, center); add(right, center);

                add(left, bottom); add(right, bottom);

                break;

        }

        return positions;

    }, [value, size, padding]);



    // Colors for Glossy White Die

    const startColor = isUsed ? '#d6d6d6' : '#ffffff';

    const endColor = isUsed ? '#a8a8a8' : '#e0e0e0';

    const pipColor = isUsed ? 'rgba(0,0,0,0.4)' : 'black';



    return (

        <View style={[{ width: size, height: size }, style]}>

            <Canvas style={{ flex: 1 }}>

                {/* Drop Shadow */}

                <RoundedRect x={2} y={3} width={size - 4} height={size - 4} r={r} color="rgba(0,0,0,0.2)">

                    <Shadow dx={0} dy={2} blur={4} color="rgba(0,0,0,0.3)" />

                </RoundedRect>



                {/* Body */}

                <RoundedRect x={0} y={0} width={size - 1} height={size - 1} r={r}>

                    <LinearGradient

                        start={vec(0, 0)}

                        end={vec(size, size)}

                        colors={[startColor, endColor]}

                    />

                    {/* Inner Bevel Highlight */}

                    <Shadow dx={-1} dy={-1} blur={2} color="white" inner />

                    <Shadow dx={2} dy={2} blur={3} color="rgba(0,0,0,0.2)" inner />

                </RoundedRect>



                {/* Pips */}

                {pips.map((p, i) => (

                    <Group key={i}>

                        <Circle cx={p.cx} cy={p.cy} r={pipRadius} color={pipColor}>

                            {/* Engraved Effect */}

                            <Shadow dx={0} dy={1} blur={0.5} color="rgba(255,255,255,0.5)" />

                            <Shadow dx={0} dy={-0.5} blur={1} color="black" inner />

                        </Circle>

                    </Group>

                ))}

            </Canvas>

        </View>

    );

};

// LudoBoardLayout.ts



// Represents Grid X,Y (0 to 14)

type Point = { x: number; y: number };



// The main loop (0-51) coordinates. 

// This assumes a standard Ludo path starting from the cell just out of the Red house, 

// moving clockwise.

// NOTE: You may need to tweak these specific X,Y values to match your specific background image.

export const MAIN_PATH_COORDS: Point[] = [

    // Red Start Strip (moving right)

    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },

    // Up the strip

    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },

    // Middle Top (Turn)

    { x: 7, y: 0 }, { x: 8, y: 0 },

    // Down the strip (Green side)

    { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },

    // Right strip

    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },

    // Middle Right (Turn)

    { x: 14, y: 7 }, { x: 14, y: 8 },

    // Left strip (Yellow side)

    { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },

    // Down the strip

    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },

    // Middle Bottom (Turn)

    { x: 7, y: 14 }, { x: 6, y: 14 },

    // Up the strip (Blue side)

    { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },

    // Left strip

    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },

    // Middle Left (Turn back to start)

    { x: 0, y: 7 }, { x: 0, y: 6 } // This wraps back to index 0 logically

];



// If a player enters their victory run (not fully implemented in your logic yet, but good to have)

export const HOME_RUN_COORDS = {

    red: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],

    yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],

    // Add Green/Blue if needed

};



// House/Yard Base Coordinates

export const YARD_COORDS: Record<string, Point[]> = {

    red: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }],

    yellow: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 }],

    // Green/Blue...

};                                                                                                                                                                                // LudoCoordinates.ts



export type NormalizedPoint = { x: number; y: number };



// Helper to rotate points for other colors based on your Red mapping

const rotate = (p: NormalizedPoint, angle: number): NormalizedPoint => {

    // Rotating around the visual center (approx 0.5, 0.5)

    const rad = (angle * Math.PI) / 180;

    const cos = Math.cos(rad);

    const sin = Math.sin(rad);

    const dx = p.x - 0.5;

    const dy = p.y - 0.5;

    return {

        x: parseFloat((0.5 + (dx * cos - dy * sin)).toFixed(4)),

        y: parseFloat((0.5 + (dx * sin + dy * cos)).toFixed(4))

    };

};



// --- YOUR MAPPED DATA (Cleaned & Smoothed) ---

// I aligned your "Red Victory" taps to a straight line (Y=0.475)

const RED_VICTORY_PATH = [

    {"x":0.0677, "y":0.475}, // Start of victory run

    {"x":0.1317, "y":0.475},

    {"x":0.2037, "y":0.475},

    {"x":0.2713, "y":0.475},

    {"x":0.3435, "y":0.475},

    {"x":0.3931, "y":0.475},

    {"x":0.4400, "y":0.475}  // Final spot before center

];



export const LudoBoardData = {

    // YOUR 52 POINTS (Smoothed for straight lines)

    mainPath: [

        // 1. Red Lane (Moving Right) -> Snapped Y to 0.423

        {"x":0.1505,"y":0.420}, {"x":0.2106,"y":0.420}, {"x":0.2674,"y":0.420}, {"x":0.3255,"y":0.420}, {"x":0.3813,"y":0.420},

        

        // 2. Up towards Green -> Snapped X to 0.447

        {"x":0.440,"y":0.3616}, {"x":0.440,"y":0.3082}, {"x":0.440,"y":0.2518}, {"x":0.440,"y":0.1956}, {"x":0.440,"y":0.1412}, {"x":0.440,"y":0.0854},

        

        // 3. Top Turn

        {"x":0.4991,"y":0.0869}, {"x":0.5570,"y":0.0853},

        

        // 4. Down from Green -> Snapped X to 0.5570

        {"x":0.5570,"y":0.1389}, {"x":0.5570,"y":0.1969}, {"x":0.5570,"y":0.2521}, {"x":0.5570,"y":0.3079}, {"x":0.5570,"y":0.364},

        

        // 5. Right towards Yellow -> Snapped Y to 0.427

        {"x":0.6149,"y":0.421}, {"x":0.6707,"y":0.421}, {"x":0.7299,"y":0.421}, {"x":0.789,"y":0.421}, {"x":0.848,"y":0.421}, {"x":0.9099,"y":0.421},

        

        // 6. Right Turn

        {"x":0.9099,"y":0.4770}, {"x":0.9099,"y":0.5348},

        

        // 7. Left from Yellow -> Snapped Y to 0.535

        {"x":0.8484,"y":0.535}, {"x":0.7898,"y":0.535}, {"x":0.7301,"y":0.535}, {"x":0.6707,"y":0.535}, {"x":0.6149,"y":0.535},

        

        // 8. Down towards Blue -> Snapped X to 0.570

        {"x":0.557,"y":0.5905}, {"x":0.557  ,"y":0.6452}, {"x":0.557,"y":0.6999}, {"x":0.557,"y":0.7546}, {"x":0.557,"y":0.8063}, {"x":0.557,"y":0.859},

        

        // 9. Bottom Turn d

        {"x":0.557,"y":0.9099}, {"x":0.4974,"y":0.9130},

        

        // 10. Up from Blue -> Snapped X to 0.445

        {"x":0.439,"y":0.9130}, {"x":0.439,"y":0.8583}, {"x":0.439,"y":0.8063}, {"x":0.439,"y":0.7546}, {"x":0.439,"y":0.7001}, {"x":0.439,"y":0.6449}, {"x":0.439,"y":0.5899},

        

        // 11. Left towards Red -> Snapped Y to 0.534

        {"x":0.3822,"y":0.534}, {"x":0.3245,"y":0.534}, {"x":0.2666,"y":0.534}, {"x":0.2086,"y":0.534}, {"x":0.1491,"y":0.534}, {"x":0.0873,"y":0.534}

    ] as NormalizedPoint[],



    // Victory Paths (Mathematically generated from your Red path)

    victoryPaths: {

        red: RED_VICTORY_PATH,

        green: RED_VICTORY_PATH.map(p => rotate(p, 90)),   // Top

        yellow: RED_VICTORY_PATH.map(p => rotate(p, 180)), // Right

        blue: RED_VICTORY_PATH.map(p => rotate(p, 270)),   // Bottom

    } as Record<string, NormalizedPoint[]>,



    // Yards (Based on standard Ludo positioning, adjusted slightly for your scale)

    yards: {

        red:    [{x:0.18, y:0.18}, {x:0.25, y:0.18}, {x:0.18, y:0.25}, {x:0.25, y:0.25}],

        green:  [{x:0.75, y:0.18}, {x:0.82, y:0.18}, {x:0.75, y:0.25}, {x:0.82, y:0.25}],

        yellow: [{x:0.75, y:0.75}, {x:0.82, y:0.75}, {x:0.75, y:0.82}, {x:0.82, y:0.82}],

        blue:   [{x:0.18, y:0.75}, {x:0.25, y:0.75}, {x:0.18, y:0.82}, {x:0.25, y:0.82}],

    } as Record<string, NormalizedPoint[]>,



    homeBase: { x: 0.500, y: 0.500 } as NormalizedPoint

};                                                                                                                                                                               // LudoCoreUI.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { useNavigation } from "@react-navigation/native";

import { useGameTimer } from "../../../../hooks/useGameTimer"; // Restore import

import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";

import { LudoSkiaBoard } from "./LudoSkiaBoard";

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

            <Text style={styles.rollPrompt}>TAP TO ROLL</Text>

        ) : (

            <View style={styles.diceRow}>

                {dice.map((d, i) => (

                    <Ludo3DDie

                        key={i}

                        value={d}

                        size={45}

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



    // Timer Hook

    const { player1Time, player2Time, startTimer, pauseTimer, formatTime, setLastActivePlayer } =

        useGameTimer(300);

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

            pauseTimer();

            Alert.alert("Game Over", `Winner: ${gameState.winner}`);

        } else {

            setLastActivePlayer((gameState.currentPlayerIndex + 1) as 1 | 2); // 1 or 2

            if (gameState.currentPlayerIndex === 0) startTimer(); // Player 1

            else pauseTimer(); // Player 2 (or second timer)

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



    const handleBoardPress = useCallback((x: number, y: number) => {

        // TODO: LudoSkiaBoard returns x,y. We need to hit-test to find the seed.

        // Since LudoSkiaBoard doesn't export hit-testing yet, we might need to 

        // rely on visual selection logic or upgrade LudoSkiaBoard.

        // For now, we will assume we can't click board to move yet without logic,

        // OR we implement a simple "Pick Move" UI if multiple moves are available.



        console.log("Board pressed at:", x, y);



        // TEMPORARY: If we have valid moves, just pick the first one for testing interaction

        // In a real implementation, we map (x,y) -> Seed Index.

        if (!gameState.waitingForRoll) {

            const moves = getValidMoves(gameState);

            if (moves.length > 0) {

                // AUTO-MOVE for now if clicked anywhere, just to demonstrate loop

                // ideally we find WHICH seed was clicked.

                const chosenMove = moves[0];

                setGameState(prev => applyMove(prev, chosenMove));

            }

        }



    }, [gameState]);



    // --- Render ---



    const isCurrentPlayerTurn = gameState.currentPlayerIndex === 0; // Assuming p1 is user

    const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];



    return (

        <View style={styles.container}>

            {/* Top Area (Player 2 / AI) */}

            <View style={styles.playerArea}>

                {gameState.currentPlayerIndex === 1 && !gameState.winner && (

                    <DiceHouse

                        dice={gameState.dice}

                        diceUsed={gameState.diceUsed}

                        waitingForRoll={gameState.waitingForRoll}

                        onPress={handleRollDice}

                    />

                )}

            </View>



            {/* Game Board */}

            <View style={styles.boardContainer}>

                <LudoSkiaBoard

                    onBoardPress={handleBoardPress}

                    positions={boardPositions}

                />

            </View>



            {/* Bottom Area (Player 1 / User) */}

            <View style={styles.playerArea}>

                {gameState.currentPlayerIndex === 0 && !gameState.winner && (

                    <DiceHouse

                        dice={gameState.dice}

                        diceUsed={gameState.diceUsed}

                        waitingForRoll={gameState.waitingForRoll}

                        onPress={handleRollDice}

                    />

                )}

            </View>

        </View>

    );

};



const styles = StyleSheet.create({

    container: { flex: 1, justifyContent: "space-between", padding: 10, backgroundColor: "#222" },

    playerArea: { height: 80, justifyContent: 'center', alignItems: 'center', width: '100%' },

    boardContainer: { flex: 1, justifyContent: "center", alignItems: 'center' },



    // Dice House Styles

    diceHouse: {

        backgroundColor: 'rgba(255, 255, 255, 0.1)',

        padding: 5,

        borderRadius: 15,

        borderWidth: 1,

        borderColor: 'rgba(255,255,255,0.2)',

        minWidth: 110,

        alignItems: 'center',

        justifyContent: 'center'

    },

    diceRow: { flexDirection: 'row', gap: 7 },

    rollPrompt: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 }

});



export default LudoCoreUI;

// LudoGameLogic.ts

export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';



export interface LudoSeed {

    id: string; 

    position: number; // -1 = House, 0-51 = Board, 999 = Finished, >=52 = Victory Lane

}



export interface LudoPlayer {

    id: string;

    color: PlayerColor;

    seeds: LudoSeed[];

}



export interface LudoGameState {

    players: LudoPlayer[];

    currentPlayerIndex: number;

    dice: number[]; 

    diceUsed: boolean[]; 

    waitingForRoll: boolean;

    winner: string | null;

    log: string[]; 

}



const BOARD_SIZE = 52;

const FINISH_POS = 999;

const HOUSE_POS = -1;



// CORRECTED STARTING POSITIONS (Index 0 is the first Red tile)

const START_OFFSETS: Record<PlayerColor, number> = {

    red: 0,     // Was 1, fixed to 0

    green: 13,  // Standard quadrant size is 13

    yellow: 26,

    blue: 39,

};



const normalizePos = (pos: number) => {

    return pos % BOARD_SIZE;

};



export const initializeGame = (p1Color: PlayerColor = 'red', p2Color: PlayerColor = 'yellow'): LudoGameState => {

    return {

        players: [

            {

                id: 'p1',

                color: p1Color,

                seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p1Color}-${i}`, position: HOUSE_POS })),

            },

            {

                id: 'p2',

                color: p2Color,

                seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p2Color}-${i}`, position: HOUSE_POS })),

            },

        ],

        currentPlayerIndex: 0,

        dice: [],

        diceUsed: [],

        waitingForRoll: true,

        winner: null,

        log: ['Game Started'],

    };

};



export const rollDice = (state: LudoGameState): LudoGameState => {

    if (!state.waitingForRoll) return state; // Already rolled



    // DEBUG MODE: Always return 6 and 1

    const d1 = 5;

    const d2 = 5;



    return {

        ...state,

        dice: [d1, d2],

        diceUsed: [false, false],

        waitingForRoll: false,

        log: [...state.log, `Player ${state.players[state.currentPlayerIndex].color} rolled [${d1}, ${d2}] (DEBUG)`],

    };

};



export interface MoveAction {

    seedIndex: number;

    diceIndices: number[]; 

    targetPos: number; 

    isCapture: boolean;

}



export const getValidMoves = (state: LudoGameState): MoveAction[] => {

    if (state.waitingForRoll || state.winner) return [];



    const player = state.players[state.currentPlayerIndex];

    const moves: MoveAction[] = [];

    const startOffset = START_OFFSETS[player.color];



    // Helper: Calculate Target

    const calcTarget = (currentPos: number, steps: number): number => {

        // 1. Exit House

        if (currentPos === HOUSE_POS) return startOffset; 

        

        // 2. Victory Lane Logic (Simplified for V1)

        // If currentPos is close to home, enter victory path...

        // For now, we loop the board to keep it simple and robust

        return normalizePos(currentPos + steps);

    };



    const opponent = state.players[(state.currentPlayerIndex + 1) % 2];



    const checkCapture = (pos: number) => {

        return opponent.seeds.some(s => s.position === pos);

    };



    // Check if we land on our own seed (Blocking)

    const isBlocked = (pos: number) => {

        return player.seeds.some(s => s.position === pos);

    };



    // GENERATE MOVES

    state.dice.forEach((die, dIdx) => {

        if (state.diceUsed[dIdx]) return;



        player.seeds.forEach((seed, sIdx) => {

            // CASE 1: IN HOUSE

            if (seed.position === HOUSE_POS) {

                if (die === 6) {

                    // Start at EXACTLY 'startOffset' (Index 0 for Red)

                    const target = startOffset;

                    if (!isBlocked(target)) {

                         moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: target, isCapture: checkCapture(target) });

                    }

                }

            } 

            // CASE 2: ON BOARD

            else if (seed.position !== FINISH_POS) {

                const target = calcTarget(seed.position, die);

                if (!isBlocked(target)) {

                    moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: target, isCapture: checkCapture(target) });

                }

            }

        });

    });



    return moves;

};



export const applyMove = (state: LudoGameState, move: MoveAction): LudoGameState => {

    const player = state.players[state.currentPlayerIndex];

    

    // 1. Mark Dice Used

    const newDiceUsed = [...state.diceUsed];

    move.diceIndices.forEach(idx => newDiceUsed[idx] = true);



    // 2. Clone State

    const newPlayers = JSON.parse(JSON.stringify(state.players));

    const activePlayer = newPlayers[state.currentPlayerIndex];

    const targetSeed = activePlayer.seeds[move.seedIndex];



    // 3. Handle Capture

    if (move.isCapture) {

        const oppPlayer = newPlayers[(state.currentPlayerIndex + 1) % 2];

        const victimSeed = oppPlayer.seeds.find((s: LudoSeed) => s.position === move.targetPos);

        if (victimSeed) {

            victimSeed.position = HOUSE_POS; // Send home

        }

    }



    // 4. Update Position

    targetSeed.position = move.targetPos;



    // 5. Turn Logic

    let nextTurn = state.currentPlayerIndex;

    let waiting = state.waitingForRoll;

    let resetDice = newDiceUsed;

    

    // Check if turn ends

    if (resetDice.every(u => u)) {

        // If rolled 6-6, roll again? (Simplified: Pass turn for now)

        // Standard rule: 6 gives another roll. 

        // We will just pass turn to keep flow simple for now.

        if (state.dice.includes(6) && !state.dice.every(d => d === 6)) {

             // If they rolled at least one 6, maybe keep turn? 

             // Let's stick to strict: All dice used -> Next player

             nextTurn = (state.currentPlayerIndex + 1) % 2;

             waiting = true;

             resetDice = [false, false];

        } else {

             nextTurn = (state.currentPlayerIndex + 1) % 2;

             waiting = true;

             resetDice = [false, false];

        }

    } else {

        waiting = false; // Continue turn

    }



    return {

        ...state,

        players: newPlayers,

        currentPlayerIndex: nextTurn,

        diceUsed: resetDice,

        waitingForRoll: waiting,

        log: [...state.log, `Moved seed ${move.seedIndex} to ${move.targetPos}`],

    };

};



export const passTurn = (state: LudoGameState): LudoGameState => {

    return {

        ...state,

        currentPlayerIndex: (state.currentPlayerIndex + 1) % 2,

        waitingForRoll: true,

        diceUsed: [false, false],

        dice: [], 

        log: [...state.log, `Turn passed`],

    };

};                                                                                                                                                                                                 // LudoSkiaBoard.tsx

import React, { useMemo, useEffect, useRef } from 'react';

import { useWindowDimensions } from 'react-native';

import {

    Canvas,

    Image as SkiaImage,

    useImage,

    Circle,

    Group,

    Paint,

    Shadow

} from '@shopify/react-native-skia';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { 

    useSharedValue, 

    withTiming, 

    withSequence, // <-- NEW: Allows chaining animations

    Easing, 

    runOnJS 

} from 'react-native-reanimated';

import { LudoBoardData, NormalizedPoint } from './LudoCoordinates';



const boardImageSource = require('../../../../assets/images/ChatGPT_Image_Dec_23__2025__08_16_43_PM-removebg-preview.png');



const BOARD_IMAGE_WIDTH = 1024;

const BOARD_IMAGE_HEIGHT = 1024;



// Speed per tile (Lower = Faster)

const TILE_ANIMATION_DURATION = 150; 



interface LudoSkiaBoardProps {

    onBoardPress?: (x: number, y: number) => void;

    positions: { [key: string]: number[] };

}



interface AnimatedSeedProps {

    id: string;

    playerId: string;

    seedSubIndex: number;

    currentPos: number; 

    canvasWidth: number;

    canvasHeight: number;

    color: string;

    radius: number;

}



const AnimatedSeed: React.FC<AnimatedSeedProps> = ({ 

    id, playerId, seedSubIndex, currentPos, canvasWidth, canvasHeight, color, radius 

}) => {

    

    // 1. LOOKUP FUNCTION (Same as before)

    const getTargetPixels = (index: number): {x: number, y: number} => {

        let norm: NormalizedPoint = { x: 0.5, y: 0.5 }; 



        if (index === -1) {

            // YARD

            const colorKey = playerId === 'p1' ? 'red' : 'yellow'; 

            const yardArr = LudoBoardData.yards[colorKey] || LudoBoardData.yards.red;

            norm = yardArr[seedSubIndex % yardArr.length];

        } else if (index === 999) {

            // HOME BASE

            norm = LudoBoardData.homeBase;

        } else if (index >= 52) {

            // VICTORY PATH

            const victoryStep = index - 52;

            const colorKey = playerId === 'p1' ? 'red' : 'yellow'; 

            const path = LudoBoardData.victoryPaths[colorKey] || LudoBoardData.victoryPaths.red;

            const safeStep = Math.min(victoryStep, path.length - 1);

            norm = path[safeStep];

        } else {

            // MAIN PATH

            const pathIndex = index % 52; 

            if (LudoBoardData.mainPath[pathIndex]) {

                norm = LudoBoardData.mainPath[pathIndex];

            }

        }



        return {

            x: norm.x * canvasWidth,

            y: norm.y * canvasHeight

        };

    };



    const target = getTargetPixels(currentPos);

    

    const cx = useSharedValue(target.x);

    const cy = useSharedValue(target.y);

    const prevPosRef = useRef(currentPos);



    // 2. STEP-BY-STEP ANIMATION LOGIC

    useEffect(() => {

        const oldPos = prevPosRef.current;

        const newPos = currentPos;

        prevPosRef.current = newPos;



        // Skip animation on first render or screen resize

        if (oldPos === newPos) {

            cx.value = target.x;

            cy.value = target.y;

            return;

        }



        // Case A: Moving Out of House (Direct Jump)

        if (oldPos === -1) {

             cx.value = withTiming(target.x, { duration: 300 });

             cy.value = withTiming(target.y, { duration: 300 });

             return;

        }



        // Case B: Moving to Finish (Direct Jump)

        if (newPos === 999) {

             cx.value = withTiming(target.x, { duration: 500 });

             cy.value = withTiming(target.y, { duration: 500 });

             return;

        }



        // Case C: Moving Step-by-Step on Board

        // We calculate every index between Old and New

        const steps: number[] = [];

        let scanner = oldPos;

        const safetyLimit = 20; // Prevent infinite loops

        let count = 0;



        while (scanner !== newPos && count < safetyLimit) {

            // Logic to find "next tile"

            if (scanner >= 52) {

                // Moving inside victory lane

                scanner++;

            } else {

                // Moving on outer board (Wrap 51 -> 0)

                scanner = (scanner + 1) % 52;

            }

            steps.push(scanner);

            count++;

        }



        if (steps.length > 0) {

            // Create a chain of animations

            const xSequence = steps.map(stepIndex => {

                const px = getTargetPixels(stepIndex);

                return withTiming(px.x, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear });

            });



            const ySequence = steps.map(stepIndex => {

                const px = getTargetPixels(stepIndex);

                return withTiming(px.y, { duration: TILE_ANIMATION_DURATION, easing: Easing.linear });

            });



            cx.value = withSequence(...xSequence);

            cy.value = withSequence(...ySequence);

        } else {

            // Fallback if logic fails

            cx.value = withTiming(target.x, { duration: 300 });

            cy.value = withTiming(target.y, { duration: 300 });

        }



    }, [currentPos, canvasWidth, canvasHeight]);



    return (

        <Group>

            <Circle cx={cx} cy={cy} r={radius + 1} color="black" opacity={0.3}>

                 <Shadow dx={1} dy={2} blur={3} color="rgba(0,0,0,0.5)" />

            </Circle>

            <Circle cx={cx} cy={cy} r={radius} color={color}>

                 <Paint style="stroke" strokeWidth={1.5} color="white" />

            </Circle>

        </Group>

    );

};



export const LudoSkiaBoard: React.FC<LudoSkiaBoardProps> = ({ onBoardPress, positions }) => {

    const boardImage = useImage(boardImageSource);

    const { width: screenWidth } = useWindowDimensions();



    const BOARD_ASPECT_RATIO = BOARD_IMAGE_WIDTH / BOARD_IMAGE_HEIGHT;

    const canvasWidth = screenWidth * 0.95; 

    const canvasHeight = canvasWidth / BOARD_ASPECT_RATIO;

    const seedRadius = (canvasWidth / 15) * 0.35; 



    const seedsData = useMemo(() => {

        const list: any[] = [];

        Object.entries(positions).forEach(([playerId, seedPositions]) => {

            const isP1 = playerId === 'p1';

            const color = isP1 ? '#FF3B30' : '#FFCC00'; 

            seedPositions.forEach((pos, index) => {

                list.push({

                    id: `${playerId}-${index}`,

                    playerId,

                    seedSubIndex: index,

                    currentPos: pos,

                    color

                });

            });

        });

        return list;

    }, [positions]);



    const tapGesture = Gesture.Tap().onEnd(({ x, y }) => {

        if (onBoardPress) {

            runOnJS(onBoardPress)(x, y);

        }

    });



    if (!boardImage) return null;



    return (

        <GestureDetector gesture={tapGesture}>

            <Canvas style={{ width: canvasWidth, height: canvasHeight }}>

                <SkiaImage

                    image={boardImage}

                    x={0}

                    y={0}

                    width={canvasWidth}

                    height={canvasHeight}

                    fit="fill"

                />

                {seedsData.map((seed) => (

                    <AnimatedSeed

                        key={seed.id}

                        id={seed.id}

                        playerId={seed.playerId}

                        seedSubIndex={seed.seedSubIndex}

                        currentPos={seed.currentPos}

                        canvasWidth={canvasWidth}

                        canvasHeight={canvasHeight}

                        color={seed.color}

                        radius={seedRadius}

                    />

                ))}

            </Canvas>

        </GestureDetector>

    );

};                                                                                                                                                                                   // LudoComputerGameScreen.tsx

import React from 'react';

import { View, StyleSheet, Text } from 'react-native';

import { LudoCoreUI } from '../core/ui/LudoCoreUI'; 

// import { BoardMapper } from './TemporaryMapper'; 



const LudoComputerGameScreen = () => {

    return (

        <View style={styles.container}>

            <View style={styles.header}>

                <Text style={styles.title}>Ludo vs Computer</Text>

            </View>

            

            <LudoCoreUI 

                level={2} 

                player={{ name: "You", isAI: false }}

                opponent={{ name: "CPU", isAI: true }}

            />

        </View>

    );

};



const styles = StyleSheet.create({

    container: {

        flex: 1,

        backgroundColor: '#1a1a1a',

    },

    header: {

        height: 60,

        justifyContent: 'center',

        alignItems: 'center',

        marginTop: 40,

    },

    title: {

        color: '#FFD700',

        fontSize: 24,

        fontWeight: 'bold',

        textTransform: 'uppercase',

        letterSpacing: 2

    }

});



export default LudoComputerGameScreen;                                                                                                                                                             // ../computer/LudoComputerLogic.ts

import { LudoGameState, MoveAction, getValidMoves } from "../core/ui/LudoGameLogic"

// Level 1: Random

// Level 2: Prioritize Captures

// Level 3: Prioritize Captures + Safety (simple version)



export const getComputerMove = (gameState: LudoGameState, level: number = 2): MoveAction | null => {

    const validMoves = getValidMoves(gameState);

    

    if (validMoves.length === 0) return null;



    // Level 1: Pure Random

    if (level === 1) {

        const randomIndex = Math.floor(Math.random() * validMoves.length);

        return validMoves[randomIndex];

    }



    // Level 2: Aggressive (Always capture if possible)

    if (level >= 2) {

        const captureMove = validMoves.find(m => m.isCapture);

        if (captureMove) return captureMove;



        // If no capture, prioritize moving out of house (6)

        const exitMove = validMoves.find(m => m.targetPos !== -1 && gameState.players[gameState.currentPlayerIndex].seeds[m.seedIndex].position === -1);

        if (exitMove) return exitMove;



        // Otherwise random

        const randomIndex = Math.floor(Math.random() * validMoves.length);

        return validMoves[randomIndex];

    }



    return validMoves[0];

};