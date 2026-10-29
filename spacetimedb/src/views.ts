// ============================================================
// NETRUNNER CLASH — Client-facing Views
// What each client may read from the private tables
// ============================================================

import spacetimedb, { player, cardInstance } from './schema.js';
import { t } from 'spacetimedb/server';

// Leaderboard / lobby data: no email or Google id
const PlayerSummary = t.row('PlayerSummary', {
    identity: t.identity().primaryKey(),
    name: t.string(),
    picture: t.string(),
    isOnline: t.bool(),
    isInQueue: t.bool(),
    wins: t.u32(),
    losses: t.u32(),
});

export const publicPlayer = spacetimedb.anonymousView(
    { name: 'public_player', public: true },
    t.array(PlayerSummary),
    (ctx: any) => {
        const rows = [];
        for (const p of ctx.db.player.iter()) {
            rows.push({
                identity: p.identity,
                name: p.name,
                picture: p.picture,
                isOnline: p.isOnline,
                isInQueue: p.isInQueue,
                wins: p.wins,
                losses: p.losses,
            });
        }
        return rows;
    }
);

// The caller's own full profile
export const myPlayer = spacetimedb.view(
    { name: 'my_player', public: true },
    t.option(player.rowType),
    (ctx: any) => ctx.db.player.identity.find(ctx.sender) ?? undefined
);

// Cards of the caller's games: own hand/field/graveyard, opponent's field/graveyard.
// Decks are hidden from everyone (deckOrder would reveal the next draws).
export const myCards = spacetimedb.view(
    { name: 'my_cards', public: true },
    t.array(cardInstance.rowType),
    (ctx: any) => {
        const me = ctx.sender.toHexString();
        const rows = [];
        for (const g of ctx.db.game.iter()) {
            if (g.player1.toHexString() !== me && g.player2.toHexString() !== me) continue;
            for (const c of ctx.db.cardInstance.gameId.filter(g.id)) {
                const mine = c.owner.toHexString() === me;
                const visible = c.location === 'field' || c.location === 'graveyard' ||
                    (mine && c.location === 'hand');
                if (visible) rows.push(c);
            }
        }
        return rows;
    }
);
