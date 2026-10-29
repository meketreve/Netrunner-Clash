// ============================================================
// NETRUNNER CLASH — Matchmaking Reducers
// ============================================================

import spacetimedb, { disconnectTimer } from './schema.js';
import { t, ScheduleAt, SenderError } from 'spacetimedb/server';
import { DEFAULT_DECK, getCardDef } from './cards.js';
import { logEvent } from './game-utils.js';

// OAuth client of the Vercel front (public value; appears in the Google login URL).
// Tokens issued by Google to any other app are rejected in clientConnected.
const GOOGLE_CLIENT_ID = '733486482628-6j9k7g5vscbplsn0vqs775pls83ajf8l.apps.googleusercontent.com';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const DISCONNECT_GRACE_MICROS = 30_000_000n; // 30s to reconnect before forfeiting
const MAX_NAME_LENGTH = 20;

function claimString(claims: any, key: string): string {
    const value = claims?.[key];
    return typeof value === 'string' ? value : '';
}

function findActiveGame(ctx: any, identity: any) {
    const hex = identity.toHexString();
    for (const g of ctx.db.game.iter()) {
        if (g.status === 'active' &&
            (g.player1.toHexString() === hex || g.player2.toHexString() === hex)) {
            return g;
        }
    }
    return null;
}

// ============================================================
// Profile
// ============================================================

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
        if (!player) throw new SenderError('Player not registered');
        const trimmed = name.trim();
        if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) {
            throw new SenderError(`Name must have 1-${MAX_NAME_LENGTH} characters`);
        }
        ctx.db.player.identity.update({ ...player, name: trimmed });
    }
);

// ============================================================
// Matchmaking Queue
// ============================================================
export const joinQueue = spacetimedb.reducer((ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new SenderError('Player not registered');
    if (player.isInQueue) return; // Already in queue
    if (findActiveGame(ctx, ctx.sender)) throw new SenderError('Already in an active game');

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
            p1Energy: 3,
            p2Energy: 3,
            p1MaxEnergy: 3,
            p2MaxEnergy: 3,
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
    if (!player) throw new SenderError('Player not registered');
    ctx.db.player.identity.update({ ...player, isInQueue: false });
});

// ============================================================
// Connection Hooks
// ============================================================

// Only Google ID tokens issued to this game's OAuth client become players.
// The identity is derived by SpacetimeDB from (iss, sub), so the same Google
// account is the same player on any device. Other connections (e.g. the owner's
// CLI running `spacetime sql`) are accepted but never registered, and every
// game reducer requires a registered player.
function isGoogleLogin(jwt: any): boolean {
    return !!jwt && GOOGLE_ISSUERS.includes(jwt.issuer) && jwt.audience.includes(GOOGLE_CLIENT_ID);
}

export const clientConnected = spacetimedb.clientConnected((ctx: any) => {
    const jwt = ctx.senderAuth.jwt;
    if (!isGoogleLogin(jwt)) return;

    const claims = jwt.fullPayload;
    const email = claimString(claims, 'email');
    const picture = claimString(claims, 'picture');

    // Reconnected in time: cancel any pending disconnect forfeit
    for (const timer of ctx.db.disconnectTimer.iter()) {
        if (timer.player.toHexString() === ctx.sender.toHexString()) {
            ctx.db.disconnectTimer.scheduledId.delete(timer.scheduledId);
        }
    }

    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
        // Keep the chosen name; refresh what Google owns
        ctx.db.player.identity.update({
            ...existing,
            isOnline: true,
            googleId: jwt.subject,
            email,
            picture,
        });
        return;
    }

    const googleName = claimString(claims, 'name').trim().slice(0, MAX_NAME_LENGTH);
    ctx.db.player.insert({
        identity: ctx.sender,
        name: googleName || `Netrunner_${ctx.sender.toHexString().slice(0, 6)}`,
        googleId: jwt.subject,
        email,
        picture,
        isOnline: true,
        isInQueue: false,
        wins: 0,
        losses: 0,
        tutorialCompleted: false,
    });
});

export const clientDisconnected = spacetimedb.clientDisconnected((ctx) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) return;

    // Mark player offline and remove from queue
    ctx.db.player.identity.update({ ...player, isOnline: false, isInQueue: false });

    // Active game: give the player a grace period to reconnect before forfeiting
    const game = findActiveGame(ctx, ctx.sender);
    if (game) {
        ctx.db.disconnectTimer.insert({
            scheduledId: 0n,
            scheduledAt: ScheduleAt.time(ctx.timestamp.microsSinceUnixEpoch + DISCONNECT_GRACE_MICROS),
            player: ctx.sender,
            gameId: game.id,
        });
        logEvent(ctx, game.id, game.turnNumber, 'disconnect',
            `${player.name} desconectou. Aguardando 30s para reconectar...`);
    }
});

// Fired by the scheduler when the grace period ends without a reconnect
export const forfeitOnDisconnect = spacetimedb.reducer(
    { onSchedule: disconnectTimer },
    { timer: disconnectTimer.rowType },
    (ctx: any, { timer }: any) => {
        // Scheduled reducers run as the module itself; clients may not call this
        if (ctx.sender.toHexString() !== ctx.identity.toHexString()) {
            throw new SenderError('Scheduled reducer only');
        }

        const player = ctx.db.player.identity.find(timer.player);
        if (!player || player.isOnline) return;

        const game = ctx.db.game.id.find(timer.gameId);
        if (!game || game.status !== 'active') return;

        const loserHex = timer.player.toHexString();
        const opponentIdentity = game.player1.toHexString() === loserHex ? game.player2 : game.player1;

        ctx.db.game.id.update({
            ...game,
            status: 'finished',
            winnerId: opponentIdentity.toHexString(),
        });

        // ANTI-FARMING: the leaver gets +1 loss, the opponent gains no win
        ctx.db.player.identity.update({ ...player, losses: player.losses + 1 });

        logEvent(ctx, game.id, game.turnNumber, 'game_end',
            `Partida finalizada por desconexão. ${player.name} não voltou.`);
    }
);

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
            maxHp: def.hp,
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
    for (const card of ctx.db.cardInstance.gameId.filter(gameId)) {
        if (
            card.owner.toHexString() === ownerHex &&
            card.location === 'deck'
        ) {
            deckCards.push(card);
        }
    }
    deckCards.sort((a: any, b: any) => a.deckOrder - b.deckOrder);

    // Count current hand size
    let handSize = 0;
    for (const card of ctx.db.cardInstance.gameId.filter(gameId)) {
        if (
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
