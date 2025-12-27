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
};