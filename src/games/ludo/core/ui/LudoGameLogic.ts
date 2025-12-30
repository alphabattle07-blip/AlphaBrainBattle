export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export interface LudoSeed {
    id: string; 
    position: number; 
    // -1 = House
    // 0 - 57 = Active Path (Unique to the player color)
    // 58 = Finished (Goal)
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
const FINISH_POS = 58;

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
    
    // RANDOM DICE (Required for game to work)
    const d1 = 5;
    const d2 =1;

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
                moves.push({ seedIndex: sIdx, diceIndices: [dIdx], targetPos: nextPos, isCapture: false });
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

    targetSeed.position = move.targetPos;

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