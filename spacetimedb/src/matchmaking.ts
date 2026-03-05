// ============================================================
// NETRUNNER CLASH — Matchmaking Reducers
// ============================================================

import spacetimedb from './schema.js';
import { t } from 'spacetimedb/server';
import { DEFAULT_DECK, getCardDef } from './cards.js';

// ============================================================
// Register / Update Player
// ============================================================
export const registerPlayer = spacetimedb.reducer((ctx) => {
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
        // Returning player — make sure they're marked online
        if (!existing.isOnline) {
            ctx.db.player.identity.update({ ...existing, isOnline: true });
        }
        return;
    }

    ctx.db.player.insert({
        identity: ctx.sender,
        name: `Netrunner_${ctx.sender.toHexString().slice(0, 6)}`,
        googleId: '',
        email: '',
        picture: '',
        isOnline: true,
        isInQueue: false,
        wins: 0,
        losses: 0,
        tutorialCompleted: false,
    });
});

export const updateProfile = spacetimedb.reducer(
    { name: t.string(), googleId: t.string(), email: t.string(), picture: t.string() },
    (ctx, { name, googleId, email, picture }) => {
        const player = ctx.db.player.identity.find(ctx.sender);
        if (!player) throw new Error('Player not registered');

        ctx.db.player.identity.update({
            ...player,
            name,
            googleId,
            email,
            picture
        });
    }
);

export const completeTutorial = spacetimedb.reducer((ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (player) {
        ctx.db.player.identity.update({ ...player, tutorialCompleted: true });
    }
});

export const setPlayerName = spacetimedb.reducer(
    { name: t.string() },
    (ctx, { name }) => {
        const player = ctx.db.player.identity.find(ctx.sender);
        if (!player) throw new Error('Player not registered');
        ctx.db.player.identity.update({ ...player, name });
    }
);

// ============================================================
// Matchmaking Queue
// ============================================================
export const joinQueue = spacetimedb.reducer((ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new Error('Player not registered');
    if (player.isInQueue) return; // Already in queue

    // Update player status
    ctx.db.player.identity.update({ ...player, isInQueue: true });

    // Check if there's another player waiting
    let opponent = null;
    for (const p of ctx.db.player.iter()) {
        if (
            p.isInQueue &&
            p.identity.toHexString() !== ctx.sender.toHexString()
        ) {
            opponent = p;
            break;
        }
    }

    // If found, create a game!
    if (opponent) {
        // Remove both from queue
        ctx.db.player.identity.update({ ...player, isInQueue: false });
        ctx.db.player.identity.update({ ...opponent, isInQueue: false });

        // Create game
        const game = ctx.db.game.insert({
            id: 0n, // auto_inc
            player1: ctx.sender,
            player2: opponent.identity,
            currentTurn: ctx.sender, // Player 1 goes first
            turnNumber: 1,
            phase: 'main',
            p1Hp: 20,
            p2Hp: 20,
            p1Energy: 1,
            p2Energy: 0,
            p1MaxEnergy: 1,
            p2MaxEnergy: 0,
            status: 'active',
            winnerId: '',
        });

        // Create card instances for both players
        createDeckForPlayer(ctx, game.id, ctx.sender);
        createDeckForPlayer(ctx, game.id, opponent.identity);

        // Draw initial hands (4 cards each)
        drawCards(ctx, game.id, ctx.sender, 4);
        drawCards(ctx, game.id, opponent.identity, 4);

        // Log game start
        ctx.db.gameLog.insert({
            id: 0n,
            gameId: game.id,
            turn: 1,
            eventType: 'game_start',
            message: `Partida iniciada! ${player.name} vs ${opponent.name}`,
        });
    }
});

export const leaveQueue = spacetimedb.reducer((ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new Error('Player not registered');
    ctx.db.player.identity.update({ ...player, isInQueue: false });
});

// ============================================================
// Helper: Create deck for a player in a game
// ============================================================
function createDeckForPlayer(
    ctx: any,
    gameId: bigint,
    owner: any
) {
    // Shuffle the default deck
    const shuffled = [...DEFAULT_DECK];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = ctx.random.integerInRange(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Create card instances
    for (let i = 0; i < shuffled.length; i++) {
        const def = getCardDef(shuffled[i]);
        ctx.db.cardInstance.insert({
            id: 0n, // auto_inc
            gameId,
            owner,
            cardDefId: def.id,
            location: 'deck',
            fieldSlot: 0,
            currentHp: def.hp,
            currentAtk: def.atk,
            canAttack: false,
            hasShield: false,
            hasDrain: false,
            stealthTurns: 0,
            tempAtkBuff: 0,
            deckOrder: i,
        });
    }
}

// ============================================================
// Helper: Draw N cards from deck to hand
// ============================================================
export function drawCards(
    ctx: any,
    gameId: bigint,
    owner: any,
    count: number
) {
    const ownerHex = owner.toHexString();

    // Get cards in deck, sorted by deckOrder
    const deckCards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'deck'
        ) {
            deckCards.push(card);
        }
    }
    deckCards.sort((a: any, b: any) => a.deckOrder - b.deckOrder);

    // Count current hand size
    let handSize = 0;
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'hand'
        ) {
            handSize++;
        }
    }

    const drawn = Math.min(count, deckCards.length);
    for (let i = 0; i < drawn; i++) {
        if (handSize + i >= 7) break; // Max hand size
        ctx.db.cardInstance.id.update({
            ...deckCards[i],
            location: 'hand',
        });
    }

    return drawn;
}
