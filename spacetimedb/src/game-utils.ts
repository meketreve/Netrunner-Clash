// ============================================================
// NETRUNNER CLASH — Game Utilities
// Shared logic between matchmaking and game logic
// ============================================================

export function updatePlayerStats(ctx: any, winner: any, loser: any) {
    const w = ctx.db.player.identity.find(winner);
    const l = ctx.db.player.identity.find(loser);
    if (w) ctx.db.player.identity.update({ ...w, wins: w.wins + 1 });
    if (l) ctx.db.player.identity.update({ ...l, losses: l.losses + 1 });
}

export function logEvent(
    ctx: any,
    gameId: bigint,
    turn: number,
    eventType: string,
    message: string
) {
    ctx.db.gameLog.insert({
        id: 0n,
        gameId,
        turn,
        eventType,
        message,
    });
}

export function getOpponent(game: any, playerHex: string) {
    return playerHex === game.player1.toHexString()
        ? game.player2
        : game.player1;
}

export function getGame(ctx: any, gameId: bigint) {
    for (const g of ctx.db.game.iter()) {
        if (g.id === gameId) return g;
    }
    throw new Error('Game not found');
}
