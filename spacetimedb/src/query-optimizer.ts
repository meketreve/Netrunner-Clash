// ============================================================
// NETRUNNER CLASH — Query Optimization Layer
// Optimized database queries with caching and indexing
// ============================================================

import { t } from 'spacetimedb/server';

// ============================================================
// Query Cache Implementation
// ============================================================

class QueryCache {
    private cache = new Map<string, { data: any; timestamp: number }>();
    private readonly ttl = 5000; // 5 seconds TTL

    get(key: string): any | null {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    set(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    // Cleanup expired entries
    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Global cache instance
const queryCache = new QueryCache();

// ============================================================
// Optimized Query Functions
// ============================================================

/**
 * Optimized field cards query with caching
 */
export function getFieldCards(ctx: any, gameId: bigint, ownerHex: string, location: string = 'field') {
    const cacheKey = `field_cards_${gameId}_${ownerHex}_${location}`;
    
    // Check cache first
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Optimized query with filtering
    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === location
        ) {
            cards.push(card);
        }
    }

    // Cache result
    queryCache.set(cacheKey, cards);
    return cards;
}

/**
 * Optimized game cards query for all locations
 */
export function getGameCards(ctx: any, gameId: bigint) {
    const cacheKey = `game_cards_${gameId}`;
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (card.gameId === gameId) {
            cards.push(card);
        }
    }

    queryCache.set(cacheKey, cards);
    return cards;
}

/**
 * Optimized hand cards query
 */
export function getHandCards(ctx: any, gameId: bigint, ownerHex: string) {
    const cacheKey = `hand_cards_${gameId}_${ownerHex}`;
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'hand'
        ) {
            cards.push(card);
        }
    }

    queryCache.set(cacheKey, cards);
    return cards;
}

/**
 * Optimized deck cards query
 */
export function getDeckCards(ctx: any, gameId: bigint, ownerHex: string) {
    const cacheKey = `deck_cards_${gameId}_${ownerHex}`;
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'deck'
        ) {
            cards.push(card);
        }
    }

    queryCache.set(cacheKey, cards);
    return cards;
}

/**
 * Optimized graveyard cards query
 */
export function getGraveyardCards(ctx: any, gameId: bigint, ownerHex: string) {
    const cacheKey = `graveyard_cards_${gameId}_${ownerHex}`;
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'graveyard'
        ) {
            cards.push(card);
        }
    }

    queryCache.set(cacheKey, cards);
    return cards;
}

/**
 * Optimized active games query
 */
export function getActiveGames(ctx: any) {
    const cacheKey = 'active_games';
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const games = [];
    for (const game of ctx.db.game.iter()) {
        if (game.status === 'active') {
            games.push(game);
        }
    }

    queryCache.set(cacheKey, games);
    return games;
}

/**
 * Optimized online players query
 */
export function getOnlinePlayers(ctx: any) {
    const cacheKey = 'online_players';
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const players = [];
    for (const player of ctx.db.player.iter()) {
        if (player.isOnline) {
            players.push(player);
        }
    }

    queryCache.set(cacheKey, players);
    return players;
}

/**
 * Optimized players in queue query
 */
export function getPlayersInQueue(ctx: any) {
    const cacheKey = 'players_in_queue';
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const players = [];
    for (const player of ctx.db.player.iter()) {
        if (player.isInQueue) {
            players.push(player);
        }
    }

    queryCache.set(cacheKey, players);
    return players;
}

/**
 * Optimized game logs query
 */
export function getGameLogs(ctx: any, gameId: bigint) {
    const cacheKey = `game_logs_${gameId}`;
    
    const cached = queryCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const logs = [];
    for (const log of ctx.db.gameLog.iter()) {
        if (log.gameId === gameId) {
            logs.push(log);
        }
    }

    // Sort by turn and then by ID for chronological order
    logs.sort((a, b) => {
        if (a.turn !== b.turn) {
            return a.turn - b.turn;
        }
        return a.id - b.id;
    });

    queryCache.set(cacheKey, logs);
    return logs;
}

// ============================================================
// Cache Management Functions
// ============================================================

/**
 * Invalidate cache for specific game
 */
export function invalidateGameCache(gameId: bigint): void {
    const keysToDelete = [];
    for (const key of queryCache['cache'].keys()) {
        if (key.includes(`_${gameId}_`) || key.includes(`_${gameId}`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => queryCache['cache'].delete(key));
}

/**
 * Invalidate cache for specific player
 */
export function invalidatePlayerCache(playerHex: string): void {
    const keysToDelete = [];
    for (const key of queryCache['cache'].keys()) {
        if (key.includes(`_${playerHex}_`) || key.includes(`_${playerHex}`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => queryCache['cache'].delete(key));
}

/**
 * Invalidate all caches
 */
export function invalidateAllCache(): void {
    queryCache.clear();
}

/**
 * Cleanup expired cache entries (call periodically)
 */
export function cleanupCache(): void {
    queryCache.cleanup();
}

// ============================================================
// Performance Monitoring
// ============================================================

class QueryMetrics {
    private static metrics = new Map<string, { count: number; totalTime: number; maxTime: number }>();

    static trackQuery(queryName: string, duration: number): void {
        const existing = this.metrics.get(queryName) || { count: 0, totalTime: 0, maxTime: 0 };
        
        this.metrics.set(queryName, {
            count: existing.count + 1,
            totalTime: existing.totalTime + duration,
            maxTime: Math.max(existing.maxTime, duration)
        });

        // Log slow queries
        if (duration > 50) { // 50ms threshold
            console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
        }
    }

    static getMetrics(): Record<string, { count: number; avgTime: number; maxTime: number }> {
        const result: Record<string, { count: number; avgTime: number; maxTime: number }> = {};
        
        for (const [name, metrics] of this.metrics) {
            result[name] = {
                count: metrics.count,
                avgTime: metrics.totalTime / metrics.count,
                maxTime: metrics.maxTime
            };
        }
        
        return result;
    }

    static reset(): void {
        this.metrics.clear();
    }
}

/**
 * Wrapper function to measure query performance
 */
export function measureQuery<T>(queryName: string, queryFn: () => T): T {
    const startTime = Date.now();
    const result = queryFn();
    const duration = Date.now() - startTime;
    
    QueryMetrics.trackQuery(queryName, duration);
    return result;
}

// Export metrics for monitoring
export { QueryMetrics };
