// LudoGameLogic.ts

export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export interface LudoSeed {
    id: string;
    // NEW MEANING: 
    // -1 = House
    // 0 to 50 = On Board (Local path)
    // 51 to 57 = Victory Lane
    // 999 = Finished
    position: number;
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

const FINISH_POS = 999;
const HOUSE_POS = -1;
const PATH_LENGTH = 57; // 0 to 50 (Board) + 51 to 57 (Victory)

// Used ONLY for collision detection
// Reverting to original offsets: Red=0
const GLOBAL_OFFSETS: Record<PlayerColor, number> = {
    red: 0, green: 13, yellow: 26, blue: 39
};

export const initializeGame = (p1Color: PlayerColor = 'red', p2Color: PlayerColor = 'yellow'): LudoGameState => {
    return {
        players: [
            { id: 'p1', color: p1Color, seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p1Color}-${i}`, position: HOUSE_POS })) },
            { id: 'p2', color: p2Color, seeds: Array.from({ length: 4 }).map((_, i) => ({ id: `${p2Color}-${i}`, position: HOUSE_POS })) },
        ],
        currentPlayerIndex: 0, dice: [], diceUsed: [], waitingForRoll: true, winner: null, log: ['Game Started']
    };
};

export const rollDice = (state: LudoGameState): LudoGameState => {
    if (!state.waitingForRoll) return state;
    // TEST WITH 1s IF NEEDED
    const d1 = 6;
    const d2 = 20;
    return { ...state, dice: [d1, d2], diceUsed: [false, false], waitingForRoll: false, log: [...state.log, `Rolled [${d1}, ${d2}]`] };
};

export interface MoveAction {
    seedIndex: number; diceIndices: number[]; targetPos: number; isCapture: boolean;
}

// Helper: Convert Local Path Index to Global Board Index (0-51) for collisions
const toGlobal = (localPos: number, color: PlayerColor): number => {
    if (localPos < 0 || localPos > 50) return -99; // Not on main board
    return (localPos + GLOBAL_OFFSETS[color]) % 52;
};

export const getValidMoves = (state: LudoGameState): MoveAction[] => {
    if (state.waitingForRoll || state.winner) return [];

    const player = state.players[state.currentPlayerIndex];
    const moves: MoveAction[] = [];

    // Collision Check Helper
    const opponent = state.players[(state.currentPlayerIndex + 1) % 2];

    // Check if we hit an opponent
    const checkCapture = (localTarget: number) => {
        if (localTarget > 50) return false; // Can't capture in victory lane
        const globalTarget = toGlobal(localTarget, player.color);
        return opponent.seeds.some(s => toGlobal(s.position, opponent.color) === globalTarget);
    };

    // Check if we hit ourselves (Block)
    const isBlocked = (localTarget: number) => {
        if (localTarget === FINISH_POS) return false;
        // Strict blocking: Can't land on same tile
        return player.seeds.some(s => s.position === localTarget);
    };

    state.dice.forEach((die, dIdx) => {
        if (state.diceUsed[dIdx] || die === 0) return;

        player.seeds.forEach((seed, sIdx) => {
            let target = -1;

            // 1. Exit House
            if (seed.position === HOUSE_POS) {
                if (die === 6) target = 0; // Move to Start (Local Index 0)
            }
            // 2. Already Finished
            else if (seed.position === FINISH_POS) {
                return;
            }
            // 3. Move on Board/Victory
            else {
                const potential = seed.position + die;
                if (potential === PATH_LENGTH) target = FINISH_POS; // Hit Home
                else if (potential < PATH_LENGTH) target = potential; // Move normally
                // If potential > PATH_LENGTH, we bounce/stay put (logic: do nothing)
            }

            if (target !== -1 && !isBlocked(target)) {
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
    const newDiceUsed = [...state.diceUsed];
    move.diceIndices.forEach(idx => newDiceUsed[idx] = true);
    const newPlayers = JSON.parse(JSON.stringify(state.players));
    const activePlayer = newPlayers[state.currentPlayerIndex];
    const targetSeed = activePlayer.seeds[move.seedIndex];

    // Handle Capture
    if (move.isCapture) {
        const oppPlayer = newPlayers[(state.currentPlayerIndex + 1) % 2];
        const globalHit = toGlobal(move.targetPos, activePlayer.color);
        // Find opponent seed at this global location
        const victimSeed = oppPlayer.seeds.find((s: LudoSeed) => toGlobal(s.position, oppPlayer.color) === globalHit);
        if (victimSeed) victimSeed.position = HOUSE_POS;
    }

    targetSeed.position = move.targetPos;

    // Check Win
    const checkWin = activePlayer.seeds.every((s: LudoSeed) => s.position === FINISH_POS);
    let winner = state.winner;
    if (checkWin) winner = activePlayer.id;

    let nextTurn = state.currentPlayerIndex;
    let waiting = state.waitingForRoll;
    let resetDice = newDiceUsed;

    // Auto Pass Turn logic
    if (resetDice.every(u => u)) {
        if (state.dice.includes(6) && !state.dice.every(d => d === 6)) {
            nextTurn = (state.currentPlayerIndex + 1) % 2; waiting = true; resetDice = [false, false];
        } else {
            nextTurn = (state.currentPlayerIndex + 1) % 2; waiting = true; resetDice = [false, false];
        }
    } else { waiting = false; }

    return { ...state, players: newPlayers, currentPlayerIndex: nextTurn, diceUsed: resetDice, waitingForRoll: waiting, winner, log: [...state.log, `Moved to ${move.targetPos}`] };
};

export const passTurn = (state: LudoGameState): LudoGameState => {
    return { ...state, currentPlayerIndex: (state.currentPlayerIndex + 1) % 2, waitingForRoll: true, diceUsed: [false, false], dice: [], log: [...state.log, `Turn passed`] };
};