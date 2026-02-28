// ============================================================
// SpacetimeDB Client Types
// Manually typed to match the server schema in spacetimedb/src/index.ts
// These will be REPLACED when spacetime generate succeeds
// ============================================================

export interface Player {
    identity: string;
    name: string;
    isOnline: boolean;
    isInQueue: boolean;
    wins: number;
    losses: number;
}

export interface Game {
    id: bigint;
    player1: string;
    player2: string;
    currentTurn: string;
    turnNumber: number;
    phase: string;
    p1Hp: number;
    p2Hp: number;
    p1Energy: number;
    p2Energy: number;
    p1MaxEnergy: number;
    p2MaxEnergy: number;
    status: string;
    winnerId: string;
}

export interface CardInstance {
    id: bigint;
    gameId: bigint;
    owner: string;
    cardDefId: number;
    location: string;
    fieldSlot: number;
    currentHp: number;
    currentAtk: number;
    canAttack: boolean;
    hasShield: boolean;
    hasDrain: boolean;
    stealthTurns: number;
    tempAtkBuff: number;
    deckOrder: number;
}

export interface GameLog {
    id: bigint;
    gameId: bigint;
    turn: number;
    eventType: string;
    message: string;
}
