// ============================================================
// NETRUNNER CLASH — SpacetimeDB Schema Definition
// Isolated to prevent circular dependencies
// ============================================================
// player and cardInstance are PRIVATE: clients read them through the
// views in views.ts, which hide emails, decks and the opponent's hand.
// ============================================================

import { schema, table, t } from 'spacetimedb/server';

// Player profile (filled from the verified Google token in clientConnected)
export const player = table(
    {},
    {
        identity: t.identity().primaryKey(),
        name: t.string(),
        googleId: t.string(), // Google 'sub' claim
        email: t.string(),
        picture: t.string(),
        isOnline: t.bool(),
        isInQueue: t.bool(),
        wins: t.u32(),
        losses: t.u32(),
        tutorialCompleted: t.bool(),
    }
);

// Active game state
export const game = table(
    { public: true },
    {
        id: t.u64().autoInc().primaryKey(),
        player1: t.identity(),
        player2: t.identity(),
        currentTurn: t.identity(),
        turnNumber: t.u32(),
        phase: t.string(), // 'recharge' | 'main' | 'combat' | 'end'
        p1Hp: t.i32(),
        p2Hp: t.i32(),
        p1Energy: t.u32(),
        p2Energy: t.u32(),
        p1MaxEnergy: t.u32(),
        p2MaxEnergy: t.u32(),
        status: t.string(), // 'active' | 'finished'
        winnerId: t.string(), // identity hex string or empty
    }
);

// Card instances in a game (deck, hand, field, graveyard)
export const cardInstance = table(
    {},
    {
        id: t.u64().autoInc().primaryKey(),
        gameId: t.u64().index(),
        owner: t.identity(),
        cardDefId: t.u32(),
        location: t.string(), // 'deck' | 'hand' | 'field' | 'graveyard'
        fieldSlot: t.u32(),   // 0-3 slot position on field
        currentHp: t.i32(),
        currentAtk: t.i32(),
        canAttack: t.bool(),
        hasShield: t.bool(),
        hasDrain: t.bool(),
        stealthTurns: t.u32(),
        tempAtkBuff: t.i32(),
        deckOrder: t.u32(),   // order in deck for drawing
        maxHp: t.i32().default(0), // base HP + permanent buffs; 0 on rows created before this column
    }
);

// Game event log
export const gameLog = table(
    { public: true },
    {
        id: t.u64().autoInc().primaryKey(),
        gameId: t.u64(),
        turn: t.u32(),
        eventType: t.string(),
        message: t.string(),
    }
);

// Pending forfeit for a player who disconnected mid-game (grace period)
export const disconnectTimer = table(
    {},
    {
        scheduledId: t.u64().primaryKey().autoInc(),
        scheduledAt: t.scheduleAt(),
        player: t.identity(),
        gameId: t.u64(),
    }
);

const spacetimedb: any = schema({ player, game, cardInstance, gameLog, disconnectTimer });

export default spacetimedb;
