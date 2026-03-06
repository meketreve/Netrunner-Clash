// ============================================================
// NETRUNNER CLASH — Message Batching System
// Optimizes real-time updates by batching messages
// ============================================================

interface GameDelta {
    type: 'CARD_PLAYED' | 'ATTACK' | 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEATH' | 'TURN_END' | 'GAME_END';
    gameId: bigint;
    playerId?: string;
    data: any;
    timestamp: number;
}

interface BatchedMessage {
    gameId: bigint;
    deltas: GameDelta[];
    timestamp: number;
    sent: boolean;
}

class MessageBatcher {
    private batches = new Map<string, BatchedMessage>();
    private readonly batchTimeout = 100; // 100ms
    private readonly maxBatchSize = 50; // Maximum deltas per batch
    private batchTimers = new Map<string, any>();
    private subscribers = new Map<string, Set<(message: BatchedMessage) => void>>();

    /**
     * Add a delta to the batch for a specific game
     */
    addDelta(delta: GameDelta): void {
        const gameKey = delta.gameId.toString();
        
        // Get or create batch
        let batch = this.batches.get(gameKey);
        if (!batch) {
            batch = {
                gameId: delta.gameId,
                deltas: [],
                timestamp: Date.now(),
                sent: false
            };
            this.batches.set(gameKey, batch);
        }

        // Add delta to batch
        batch.deltas.push(delta);
        batch.timestamp = Date.now();

        // Start or reset batch timer
        this.resetBatchTimer(gameKey);

        // Send immediately if batch is too large
        if (batch.deltas.length >= this.maxBatchSize) {
            this.flushBatch(gameKey);
        }
    }

    /**
     * Subscribe to batch updates for a game
     */
    subscribe(gameId: bigint, callback: (message: BatchedMessage) => void): () => void {
        const gameKey = gameId.toString();
        
        if (!this.subscribers.has(gameKey)) {
            this.subscribers.set(gameKey, new Set());
        }
        
        this.subscribers.get(gameKey)!.add(callback);

        // Return unsubscribe function
        return () => {
            const subscribers = this.subscribers.get(gameKey);
            if (subscribers) {
                subscribers.delete(callback);
                if (subscribers.size === 0) {
                    this.subscribers.delete(gameKey);
                }
            }
        };
    }

    /**
     * Reset the batch timer for a game
     */
    private resetBatchTimer(gameKey: string): void {
        // Clear existing timer
        const existingTimer = this.batchTimers.get(gameKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.flushBatch(gameKey);
        }, this.batchTimeout);

        this.batchTimers.set(gameKey, timer);
    }

    /**
     * Flush the batch for a specific game
     */
    private flushBatch(gameKey: string): void {
        const batch = this.batches.get(gameKey);
        if (!batch || batch.sent || batch.deltas.length === 0) {
            return;
        }

        // Mark as sent
        batch.sent = true;

        // Notify subscribers
        const subscribers = this.subscribers.get(gameKey);
        if (subscribers) {
            for (const callback of subscribers) {
                try {
                    callback(batch);
                } catch (error) {
                    console.error('Error in batch callback:', error);
                }
            }
        }

        // Clean up
        this.batches.delete(gameKey);
        
        const timer = this.batchTimers.get(gameKey);
        if (timer) {
            clearTimeout(timer);
            this.batchTimers.delete(gameKey);
        }
    }

    /**
     * Force flush all batches
     */
    flushAllBatches(): void {
        for (const gameKey of this.batches.keys()) {
            this.flushBatch(gameKey);
        }
    }

    /**
     * Get batch statistics
     */
    getStats(): {
        activeBatches: number;
        totalSubscribers: number;
        averageBatchSize: number;
        oldestBatchAge: number;
    } {
        let totalSubscribers = 0;
        let totalDeltas = 0;
        let oldestBatchAge = 0;
        const now = Date.now();

        for (const [gameKey, subscribers] of this.subscribers) {
            totalSubscribers += subscribers.size;
        }

        for (const batch of this.batches.values()) {
            totalDeltas += batch.deltas.length;
            const age = now - batch.timestamp;
            oldestBatchAge = Math.max(oldestBatchAge, age);
        }

        const activeBatches = this.batches.size;
        const averageBatchSize = activeBatches > 0 ? totalDeltas / activeBatches : 0;

        return {
            activeBatches,
            totalSubscribers,
            averageBatchSize: Math.round(averageBatchSize * 100) / 100,
            oldestBatchAge
        };
    }

    /**
     * Clean up old batches and timers
     */
    cleanup(): void {
        const now = Date.now();
        const maxAge = 5000; // 5 seconds
        const toRemove: string[] = [];

        for (const [gameKey, batch] of this.batches) {
            if (now - batch.timestamp > maxAge) {
                toRemove.push(gameKey);
            }
        }

        for (const gameKey of toRemove) {
            const timer = this.batchTimers.get(gameKey);
            if (timer) {
                clearTimeout(timer);
                this.batchTimers.delete(gameKey);
            }
            this.batches.delete(gameKey);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 Cleaned up ${toRemove.length} old message batches`);
        }
    }
}

// Global message batcher instance
export const messageBatcher = new MessageBatcher();

// ============================================================
// Delta Generation Helpers
// ============================================================

/**
 * Create a card played delta
 */
export function createCardPlayedDelta(gameId: bigint, playerId: string, cardId: bigint, slot: number): GameDelta {
    return {
        type: 'CARD_PLAYED',
        gameId,
        playerId,
        data: { cardId, slot },
        timestamp: Date.now()
    };
}

/**
 * Create an attack delta
 */
export function createAttackDelta(gameId: bigint, playerId: string, attackerId: bigint, targetId: bigint, damage: number): GameDelta {
    return {
        type: 'ATTACK',
        gameId,
        playerId,
        data: { attackerId, targetId, damage },
        timestamp: Date.now()
    };
}

/**
 * Create a damage delta
 */
export function createDamageDelta(gameId: bigint, targetId: bigint, damage: number, currentHp: number): GameDelta {
    return {
        type: 'DAMAGE',
        gameId,
        data: { targetId, damage, currentHp },
        timestamp: Date.now()
    };
}

/**
 * Create a heal delta
 */
export function createHealDelta(gameId: bigint, targetId: bigint, amount: number, currentHp: number): GameDelta {
    return {
        type: 'HEAL',
        gameId,
        data: { targetId, amount, currentHp },
        timestamp: Date.now()
    };
}

/**
 * Create a buff delta
 */
export function createBuffDelta(gameId: bigint, targetId: bigint, buffType: string, value: number): GameDelta {
    return {
        type: 'BUFF',
        gameId,
        data: { targetId, buffType, value },
        timestamp: Date.now()
    };
}

/**
 * Create a death delta
 */
export function createDeathDelta(gameId: bigint, targetId: bigint): GameDelta {
    return {
        type: 'DEATH',
        gameId,
        data: { targetId },
        timestamp: Date.now()
    };
}

/**
 * Create a turn end delta
 */
export function createTurnEndDelta(gameId: bigint, nextPlayerId: string, turnNumber: number): GameDelta {
    return {
        type: 'TURN_END',
        gameId,
        playerId: nextPlayerId,
        data: { turnNumber },
        timestamp: Date.now()
    };
}

/**
 * Create a game end delta
 */
export function createGameEndDelta(gameId: bigint, winnerId: string, reason: string): GameDelta {
    return {
        type: 'GAME_END',
        gameId,
        playerId: winnerId,
        data: { winnerId, reason },
        timestamp: Date.now()
    };
}

// ============================================================
// Integration with Game Logic
// ============================================================

/**
 * Initialize message batching for a game
 */
export function initializeGameBatching(gameId: bigint, onBatch: (batch: BatchedMessage) => void): () => void {
    return messageBatcher.subscribe(gameId, onBatch);
}

/**
 * Add game action to batch
 */
export function batchGameAction(delta: GameDelta): void {
    messageBatcher.addDelta(delta);
}

/**
 * Start automatic cleanup
 */
export function startBatchingCleanup(): void {
    setInterval(() => {
        messageBatcher.cleanup();
    }, 60000); // Every minute
}

// ============================================================
// Performance Monitoring
// ============================================================

/**
 * Get batching performance metrics
 */
export function getBatchingMetrics(): {
    stats: { activeBatches: number; totalSubscribers: number; averageBatchSize: number; oldestBatchAge: number };
    efficiency: number; // Messages per batch ratio
} {
    const stats = messageBatcher.getStats();
    
    // Calculate efficiency (higher is better)
    const efficiency = stats.averageBatchSize > 0 ? Math.min(100, (stats.averageBatchSize / 10) * 100) : 0;

    return {
        stats,
        efficiency: Math.round(efficiency)
    };
}

/**
 * Optimize batch parameters based on performance
 */
export function optimizeBatching(): void {
    const metrics = getBatchingMetrics();
    
    if (metrics.stats.averageBatchSize < 2) {
        console.log('📊 Low batch efficiency, consider increasing batch timeout');
    } else if (metrics.stats.averageBatchSize > 20) {
        console.log('📊 High batch size, consider decreasing batch timeout');
    }
    
    if (metrics.stats.oldestBatchAge > 1000) {
        console.log('📊 Old batches detected, consider flushing');
    }
}
