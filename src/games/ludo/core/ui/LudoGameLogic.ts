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
const VICTORY_START_INDEX = 52; // Indices 52-57 represent the victory lane
const FINISH_POS = 999;
const HOUSE_POS = -1;

// Starting indices on the main path (0-51)
const START_OFFSETS: Record<PlayerColor, number> = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39,
};

// FIX: The Turn-Off point is the tile immediately preceding the Start.
// Red starts at 0, so it walks 0->51. Turn off is 51.
const TURN_OFF_POINTS: Record<PlayerColor, number> = {
    red: 51,     // 0 - 1 = 51 (wrapped)
    green: 12,   // 13 - 1 = 12
    yellow: 25,  // 26 - 1 = 25
    blue: 38     // 39 - 1 = 38
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
    if (!state.waitingForRoll) return state; 

    const d1 = 1;
    const d2 = 0;

    return {
        ...state,
        dice: [d1, d2],
        diceUsed: [false, false],
        waitingForRoll: false,
        log: [...state.log, `Player ${state.players[state.currentPlayerIndex].color} rolled [${d1}, ${d2}]`],
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
    const calcTarget = (currentPos: number, steps: number): number | null => {
        // 1. Exit House
        if (currentPos === HOUSE_POS) {
            return steps === 6 ? startOffset : null;
        }
        
        // 2. Already Finished
        if (currentPos === FINISH_POS) return null;

        // 3. Already in Victory Lane (Indices 52 - 57)
        if (currentPos >= VICTORY_START_INDEX) {
            const currentStepInVictory = currentPos - VICTORY_START_INDEX;
            const targetStep = currentStepInVictory + steps;
            
            if (targetStep === 6) return FINISH_POS; // Hit the center (Goal)
            if (targetStep < 6) return VICTORY_START_INDEX + targetStep; // Move forward
            return null; // Overshot
        }

        // 4. On Main Board - Calculate Relative Distance
        // Relative Distance: 0 = Start Tile, 51 = Last Tile before home.
        // Total Board Size = 52.
        
        let distanceTraveled = (currentPos - startOffset + BOARD_SIZE) % BOARD_SIZE;
        const potentialDistance = distanceTraveled + steps;

        // FIX: If potential distance > 51, we are entering Victory Lane.
        // (Previously checked > 50, which caused early entry)
        if (potentialDistance > 51) {
            const stepsIntoVictory = potentialDistance - 52; // Index 0 of victory is step 52
            
            if (stepsIntoVictory === 6) return FINISH_POS;
            if (stepsIntoVictory < 6) return VICTORY_START_INDEX + stepsIntoVictory;
            return null; // Overshot
        }

        // 5. Standard Move on Board
        return (currentPos + steps) % BOARD_SIZE;
    };

    const opponent = state.players[(state.currentPlayerIndex + 1) % 2];

    const checkCapture = (pos: number) => {
        if (pos >= VICTORY_START_INDEX) return false;
        return opponent.seeds.some(s => s.position === pos);
    };

    const isBlocked = (pos: number) => {
        // Simple blocking rule: None for now
        return false; 
    };

    state.dice.forEach((die, dIdx) => {
        if (state.diceUsed[dIdx]) return;

        player.seeds.forEach((seed, sIdx) => {
            const target = calcTarget(seed.position, die);
            
            if (target !== null && !isBlocked(target)) {
                moves.push({ 
                    seedIndex: sIdx, 
                    diceIndices: [dIdx], 
                    targetPos: target, 
                    isCapture: checkCapture(target) 
                });
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
            victimSeed.position = HOUSE_POS;
        }
    }

    // 4. Update Position
    targetSeed.position = move.targetPos;

    // Check Win
    let winner = state.winner;
    if (activePlayer.seeds.every((s: LudoSeed) => s.position === FINISH_POS)) {
        winner = activePlayer.color;
    }

    // 5. Turn Logic
    let nextTurn = state.currentPlayerIndex;
    let waiting = state.waitingForRoll;
    let resetDice = newDiceUsed;
    
    if (resetDice.every(u => u)) {
        // Simplified Pass Turn Logic
        nextTurn = (state.currentPlayerIndex + 1) % 2;
        waiting = true;
        resetDice = [false, false];
    } else {
        waiting = false; 
    }

    return {
        ...state,
        players: newPlayers,
        currentPlayerIndex: nextTurn,
        diceUsed: resetDice,
        waitingForRoll: waiting,
        winner: winner,
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