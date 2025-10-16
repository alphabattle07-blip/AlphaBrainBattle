// games/whot/core/types.ts
import { CardSuit } from "./ui/WhotCardTypes";

// Card definition
export interface Card {
    id: string;
    suit: CardSuit;
    number?: number; // Make number optional
    rank: string; // Add rank property
}

// Player definition
export interface Player {
    id: string;
    name: string;
    hand: Card[];
}

// Rule versions
export type RuleVersion = "rule1" | "rule2";

// Game state definition
export interface GameState {
    players: Player[];
    market: Card[]; 
    pile: Card[]; 
    currentPlayer: number; 
    direction: number; 
    pendingPick: number; 
    calledSuit?: CardSuit; 
    ruleVersion: RuleVersion; 
    mustPlayNormal: boolean; 
}