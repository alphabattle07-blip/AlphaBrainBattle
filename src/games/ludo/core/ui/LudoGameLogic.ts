// LudoGameLogic.ts
export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export interface LudoSeed {
    id: string; // e.g., 'red-0'
    position: number; // -1 = House, 0-51 = Board, 999 = Finished
}

export interface LudoPlayer {
    id: string;
    color: PlayerColor;
    seeds: LudoSeed[];
}

export interface LudoGameState {
    players: LudoPlayer[];
    currentPlayerIndex: number;
    dice: number[]; // e.g. [6, 4]
    diceUsed: boolean[]; // [false, false] - tracks if die 0 or die 1 is used
    waitingForRoll: boolean;
    winner: string | null;
    log: string[]; // Game log for debugging/display
}

const BOARD_SIZE = 52;
const FINISH_POS = 999;
const HOUSE_POS = -1;

// Approximate starting offsets (assuming standard generic Ludo path logic)
// Red = 0, Green = 13, Yellow = 26, Blue = 39.
// For 2-player mode, we can pick Red vs Yellow (Index 0 and 26).
const START_OFFSETS: Record<PlayerColor, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
};

// Helper: Normalize position on board (circular 0-51)
const normalizePos = (pos: number) => {
    return pos % BOARD_SIZE;
};

// Helper: Convert "Local Steps from Start" to "Global Board Index"
// Not strictly needed if we just track global index, but "Start" is global index.
// Let's track Global Index.

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

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    // const d1 = 6; const d2 = 6; // DEBUG: Force 6,6 

    return {
        ...state,
        dice: [d1, d2],
        diceUsed: [false, false],
        waitingForRoll: false,
        log: [...state.log, `Player ${state.players[state.currentPlayerIndex].color} rolled [${d1}, ${d2}]`],
    };
};

// Determine if a move is possible for a specific die value
const canMove = (seed: LudoSeed, dieValue: number, playerColor: PlayerColor): boolean => {
    // 1. Coming out of house
    if (seed.position === HOUSE_POS) {
        return dieValue === 6;
    }

    // 2. Already finished
    if (seed.position === FINISH_POS) {
        return false;
    }

    // 3. Moving on board
    // In this Aggressive Mode, "No safe zones" and "Completes path normally".
    // Assuming standard path: moves forward.
    // We need to know if it passes the "home run". 
    // Rule: "A seed is considered finished when: It completes the path normally..."
    // Usually this means reaching the home triangle.
    // For simplicity implementation now: 
    //  - Track steps taken? Or just check if global index passes start.
    //  - Let's assume just board limit for now, but usually Ludo tracks relative progress.

    // For this v1 logic: strictly checking generic moves.
    return true;
};

export interface MoveAction {
    seedIndex: number;
    diceIndices: number[]; // [0] for die 1, [1] for die 2, [0, 1] for sum
    targetPos: number; // Calculated target
    isCapture: boolean;
}

export const getValidMoves = (state: LudoGameState): MoveAction[] => {
    if (state.waitingForRoll || state.winner) return [];

    const player = state.players[state.currentPlayerIndex];
    const moves: MoveAction[] = [];
    const startOffset = START_OFFSETS[player.color];

    // Helper to calculate target position logic
    const calcTarget = (currentPos: number, steps: number): number => {
        if (currentPos === HOUSE_POS) return startOffset; // Must be 6 to exit
        // Normal move:
        return normalizePos(currentPos + steps);
    };

    const opponent = state.players[(state.currentPlayerIndex + 1) % 2];

    // Helper to check capture
    const checkCapture = (pos: number) => {
        return opponent.seeds.some(s => s.position === pos);
    };

    // Try Single Dice usage
    state.dice.forEach((die, dIdx) => {
        if (state.diceUsed[dIdx]) return;

        player.seeds.forEach((seed, sIdx) => {
            // Rule 3: Coming out
            if (seed.position === HOUSE_POS) {
                if (die === 6) {
                    moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: startOffset, isCapture: checkCapture(startOffset) });
                }
            } else if (seed.position !== FINISH_POS) {
                // Move on board
                const target = calcTarget(seed.position, die);
                moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: target, isCapture: checkCapture(target) });
            }
        });
    });

    // Try Sum usage (Rule 4.3)
    // Only if BOTH dice adhere to sum rule logic? 
    // "You may move one seed by the full total 10"
    // This implies using BOTH dice at once.
    if (!state.diceUsed[0] && !state.diceUsed[1]) {
        const sum = state.dice[0] + state.dice[1];
        player.seeds.forEach((seed, sIdx) => {
            if (seed.position !== HOUSE_POS && seed.position !== FINISH_POS) {
                // Only seeds ON BOARD can use sum (Can't use Sum to exit house? Rule doesn't explicitly forbid, 
                // but "6 is consumed" implies 6 is distinct. 
                // Usually you can't use 6+4=10 to exit. You need 6 to exit, then 4.
                // Let's enforce: Sum moves are for existing seeds.
                // (Unless 6+6=12... but Exiting needs explicit 6).

                // If Sum is 6? (e.g. 3+3) - Rule says "die shows 6". 
                // "You can never create... 7 ... 6 & 4 from 5 & 5".
                // Use die values exactly.
                // So 6 must be on face to exit.

                const target = calcTarget(seed.position, sum);
                moves.push({ seedIndex: sIdx, diceIndices: [0, 1], targetPos: target, isCapture: checkCapture(target) });
            }
        });
    }

    return moves;
};


export const applyMove = (state: LudoGameState, move: MoveAction): LudoGameState => {
    const player = state.players[state.currentPlayerIndex];
    const opponent = state.players[(state.currentPlayerIndex + 1) % 2];

    // 1. Update Dice Usage
    const newDiceUsed = [...state.diceUsed];
    move.diceIndices.forEach(idx => newDiceUsed[idx] = true);

    // 2. Move Seed
    const newPlayers = JSON.parse(JSON.stringify(state.players)); // Deep copy
    const activePlayer = newPlayers[state.currentPlayerIndex];
    const targetSeed = activePlayer.seeds[move.seedIndex];

    let logMsg = `Player ${activePlayer.color} moved seed ${move.seedIndex} to ${move.targetPos}`;

    // Rule 6: Capture Rule (Aggressive)
    let captured = false;
    if (move.isCapture) {
        // Find opponent seed at that specific pos
        const oppPlayer = newPlayers[(state.currentPlayerIndex + 1) % 2];
        const victimSeed = oppPlayer.seeds.find((s: LudoSeed) => s.position === move.targetPos);
        if (victimSeed) {
            victimSeed.position = HOUSE_POS; // Go back to house

            // Capturer immediately finishes
            // "Capturing seed -> immediately finishes the race. It goes straight into its house."
            // Assumed "House" here means "Finish/Home Base" not "Start House".
            // "A seed is considered finished when: ...It captures an opponent seed"
            targetSeed.position = FINISH_POS;
            logMsg += ` and CAPTURED! Seed Finished.`;
            captured = true;
        }
    } else {
        targetSeed.position = move.targetPos;
    }

    // Check Win Condition
    const checkWin = activePlayer.seeds.every((s: LudoSeed) => s.position === FINISH_POS);
    let winner = state.winner;
    if (checkWin) {
        winner = activePlayer.id;
        logMsg += ` PLAYER WINS!`;
    }

    // Turn Management
    // If double 6?
    // Rule 7: "If both dice are 6 and 6: Player completes all valid moves... Player rolls again"
    // Here we processed ONE move.
    // We need to check if turn is "Done".

    let nextTurn = state.currentPlayerIndex;
    let waiting = state.waitingForRoll;
    let resetDice = newDiceUsed;

    // Check if all dice used
    const allDiceUsed = resetDice.every(u => u);

    if (allDiceUsed) {
        // Turn Complete?
        // Check for Double Six
        if (state.dice[0] === 6 && state.dice[1] === 6) {
            // Roll again
            logMsg += ` (Double Six - Roll Again)`;
            waiting = true;
            resetDice = [false, false]; // Reset for new roll
        } else {
            // Next player
            nextTurn = (state.currentPlayerIndex + 1) % 2;
            waiting = true;
            resetDice = [false, false]; // Reset for next player
        }
    } else {
        // Still has dice to use
        waiting = false;
    }

    return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: nextTurn,
        diceUsed: resetDice,
        waitingForRoll: waiting,
        winner,
        log: [...state.log, logMsg],
    };
};
