// ============================================================
// NETRUNNER CLASH — SpacetimeDB Schema Definition
// Isolated to prevent circular dependencies
// ============================================================

import { schema, table, t } from 'spacetimedb/server';

const spacetimedb: any = schema({
    // Player profile
    player: table(
        { public: true },
        {
            identity: t.identity().primaryKey(),
            name: t.string(),
            googleId: t.string(), // Google ID (not unique since empty string is default)
            email: t.string(),
            picture: t.string(),
            isOnline: t.bool(),
            isInQueue: t.bool(),
            wins: t.u32(),
            losses: t.u32(),
            tutorialCompleted: t.bool(),
        }
    ),

    // Active game state
    game: table(
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
    ),

    // Card instances in a game (deck, hand, field, graveyard)
    cardInstance: table(
        { public: true },
        {
            id: t.u64().autoInc().primaryKey(),
            gameId: t.u64(),
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
        }
    ),

    // Game event log
    gameLog: table(
        { public: true },
        {
            id: t.u64().autoInc().primaryKey(),
            gameId: t.u64(),
            turn: t.u32(),
            eventType: t.string(),
            message: t.string(),
        }
    ),
});

export default spacetimedb;
