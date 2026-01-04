export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export interface LudoSeed {
    id: string;
    position: number;
    // -1 = House
    // 0 - 55 = Active Path (Unique to the player color)
    // 56 = Finished (Goal)
    landingPos: number; // The tile index it lands on before any rules like "Capture" jump it to another spot
    animationDelay: number; // Delay in ms before starting the movement animation
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

const HOUSE_POS = -1;
const FINISH_POS = 56;

export const initializeGame = (p1Color: PlayerColor = 'red', p2Color: PlayerColor = 'yellow'): LudoGameState => {
    return {
        players: [
            {
                id: 'p1',
                color: p1Color,
                seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p1Color}-${i}`, position: HOUSE_POS, landingPos: HOUSE_POS, animationDelay: 0 })),
            },
            {
                id: 'p2',
                color: p2Color,
                seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p2Color}-${i}`, position: HOUSE_POS, landingPos: HOUSE_POS, animationDelay: 0 })),
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
    if (!state.waitingForRoll) return state;

    // RANDOM DICE (Required for game to work)
    const d1 = 6;
    const d2 = 5;

    return {
        ...state,
        dice: [d1, d2],
        diceUsed: [false, false],
        waitingForRoll: false,
        log: [...state.log, `Rolled [${d1}, ${d2}]`],
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

    state.dice.forEach((die, dIdx) => {
        if (state.diceUsed[dIdx]) return;

        player.seeds.forEach((seed, sIdx) => {

            // 1. Move out of House (Needs a 6)
            if (seed.position === HOUSE_POS) {
                if (die === 6) {
                    moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: 0, isCapture: false });
                }
                return;
            }

            // 2. Already Finished
            if (seed.position === FINISH_POS) return;

            // 3. Move on Track
            const nextPos = seed.position + die;

            if (nextPos <= FINISH_POS) {
                // Check if this move is a capture
                let isCapture = false;
                if (nextPos >= 0 && nextPos <= 51) {
                    const opponentIndex = (state.currentPlayerIndex + 1) % 2;
                    const opponent = state.players[opponentIndex];
                    const { LudoBoardData } = require('./LudoCoordinates');
                    const activePlayerPath = LudoBoardData.getPathForColor(player.color);
                    const targetCoord = activePlayerPath[nextPos];

                    if (targetCoord) {
                        isCapture = opponent.seeds.some(oppSeed => {
                            if (oppSeed.position < 0 || oppSeed.position >= 52) return false;
                            const opponentPath = LudoBoardData.getPathForColor(opponent.color);
                            const oppCoord = opponentPath[oppSeed.position];
                            if (!oppCoord) return false;
                            const tolerance = 0.01;
                            return Math.abs(targetCoord.x - oppCoord.x) < tolerance &&
                                Math.abs(targetCoord.y - oppCoord.y) < tolerance;
                        });
                    }
                }
                moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: nextPos, isCapture });
            }
        });
    });

    return moves;
};

export const applyMove = (state: LudoGameState, move: MoveAction): LudoGameState => {
    const player = state.players[state.currentPlayerIndex];
    const newDiceUsed = [...state.diceUsed];
    move.diceIndices.forEach(idx => newDiceUsed[idx] = true);

    const newPlayers = JSON.parse(JSON.stringify(state.players));
    const activePlayer = newPlayers[state.currentPlayerIndex];
    const targetSeed = activePlayer.seeds[move.seedIndex];

    // Always track landing position (where the move logically ends)
    const oldPosition = targetSeed.position;
    targetSeed.landingPos = move.targetPos;
    targetSeed.animationDelay = 0; // Reset delay for the moving seed
    // Set the new position for the moving seed
    targetSeed.position = move.targetPos;

    // --- CAPTURE LOGIC ---
    // Only check for captures on the main track (positions 0-51), not in victory lane (52-57) or finish (58)
    if (move.targetPos >= 0 && move.targetPos <= 51) {
        const opponentIndex = (state.currentPlayerIndex + 1) % 2;
        const opponent = newPlayers[opponentIndex];

        // Get the physical coordinates of the capturing seed's target position
        const { LudoBoardData } = require('./LudoCoordinates');
        const activePlayerPath = LudoBoardData.getPathForColor(activePlayer.color);
        const targetCoord = activePlayerPath[move.targetPos];

        if (targetCoord) {
            // Check each opponent seed - find only the first one to capture
            const capturedOpponentSeed = opponent.seeds.find((oppSeed: LudoSeed) => {
                // Skip seeds in house, finished, or in victory lane
                if (oppSeed.position < 0 || oppSeed.position >= 52) return false;

                // Get opponent seed's physical coordinates
                const opponentPath = LudoBoardData.getPathForColor(opponent.color);
                const oppCoord = opponentPath[oppSeed.position];

                if (oppCoord) {
                    // Compare physical coordinates (with small tolerance for floating point)
                    const tolerance = 0.01;
                    const sameX = Math.abs(targetCoord.x - oppCoord.x) < tolerance;
                    const sameY = Math.abs(targetCoord.y - oppCoord.y) < tolerance;
                    return sameX && sameY;
                }
                return false;
            });

            if (capturedOpponentSeed) {
                console.log(`CAPTURE! Player ${activePlayer.id} captured opponent seed ${capturedOpponentSeed.id} at position ${capturedOpponentSeed.position}`);
                capturedOpponentSeed.position = HOUSE_POS; // Send opponent seed back to house
                capturedOpponentSeed.landingPos = HOUSE_POS;

                // Calculate delay based on how many steps the capturing seed takes
                const steps = oldPosition === HOUSE_POS ? 1 : Math.max(0, move.targetPos - oldPosition);
                // 200ms per tile (TILE_ANIMATION_DURATION)
                capturedOpponentSeed.animationDelay = steps * 200;

                targetSeed.position = FINISH_POS; // AS PER AGGRESSIVE MODE: Capturing seed moves to finish!
            }
        }
    }

    // Check Win
    let winner = state.winner;
    if (activePlayer.seeds.every((s: LudoSeed) => s.position === FINISH_POS)) {
        winner = activePlayer.color;
    }

    // Turn Logic
    let nextTurn = state.currentPlayerIndex;
    let waiting = state.waitingForRoll;
    let resetDice = newDiceUsed;

    // If all dice are used:
    if (resetDice.every(u => u)) {

        // --- NEW RULE: ONLY 6 AND 6 GIVES ANOTHER TURN ---
        const rolledDoubleSix = state.dice[0] === 6 && state.dice[1] === 6;

        if (rolledDoubleSix && !winner) {
            // BONUS TURN (Same Player)
            waiting = true;
            resetDice = [false, false];
            // nextTurn remains current
        } else {
            // PASS TURN
            nextTurn = (state.currentPlayerIndex + 1) % 2;
            waiting = true;
            resetDice = [false, false];
        }
    } else {
        // STILL MOVING (One die remaining)
        waiting = false;
    }

    return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: nextTurn,
        diceUsed: resetDice,
        waitingForRoll: waiting,
        winner: winner,
        log: [...state.log, `Moved seed`],
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
};       