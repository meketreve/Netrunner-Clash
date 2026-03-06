// ============================================================
// NETRUNNER CLASH — Connection Pool Management
// Optimized connection handling for multiplayer scalability
// ============================================================

interface PooledConnection {
    identity: string;
    connection: any;
    lastUsed: number;
    inUse: boolean;
}

class ConnectionPool {
    private connections = new Map<string, PooledConnection>();
    private readonly maxConnections = 100;
    private readonly connectionTimeout = 30 * 60 * 1000; // 30 minutes
    private cleanupInterval: any = null;

    constructor() {
        // Start cleanup interval
        this.startCleanup();
    }

    /**
     * Get or create a connection for the given identity
     */
    getConnection(identity: string, spacetime: any): any {
        const existing = this.connections.get(identity);
        
        if (existing && !existing.inUse) {
            // Reuse existing connection
            existing.inUse = true;
            existing.lastUsed = Date.now();
            return existing.connection;
        }

        // Create new connection if we haven't reached the limit
        if (this.connections.size < this.maxConnections) {
            const connection = spacetime.getConnection();
            const pooled: PooledConnection = {
                identity,
                connection,
                lastUsed: Date.now(),
                inUse: true
            };
            
            this.connections.set(identity, pooled);
            return connection;
        }

        // Pool is full, remove oldest unused connection
        this.removeOldestUnusedConnection();
        
        // Try again
        return this.getConnection(identity, spacetime);
    }

    /**
     * Release a connection back to the pool
     */
    releaseConnection(identity: string): void {
        const connection = this.connections.get(identity);
        if (connection) {
            connection.inUse = false;
            connection.lastUsed = Date.now();
        }
    }

    /**
     * Remove a connection from the pool
     */
    removeConnection(identity: string): void {
        const connection = this.connections.get(identity);
        if (connection) {
            // Clean up connection if needed
            this.connections.delete(identity);
        }
    }

    /**
     * Get pool statistics
     */
    getStats(): {
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
    } {
        let active = 0;
        let idle = 0;

        for (const connection of this.connections.values()) {
            if (connection.inUse) {
                active++;
            } else {
                idle++;
            }
        }

        return {
            totalConnections: this.connections.size,
            activeConnections: active,
            idleConnections: idle
        };
    }

    /**
     * Start periodic cleanup of old connections
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Clean up old and unused connections
     */
    private cleanup(): void {
        const now = Date.now();
        const toRemove: string[] = [];

        for (const [identity, connection] of this.connections) {
            // Remove connections that haven't been used recently
            if (!connection.inUse && (now - connection.lastUsed) > this.connectionTimeout) {
                toRemove.push(identity);
            }
        }

        for (const identity of toRemove) {
            this.removeConnection(identity);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 Cleaned up ${toRemove.length} old connections`);
        }
    }

    /**
     * Remove the oldest unused connection to make space
     */
    private removeOldestUnusedConnection(): void {
        let oldestIdentity: string | null = null;
        let oldestTime = Date.now();

        for (const [identity, connection] of this.connections) {
            if (!connection.inUse && connection.lastUsed < oldestTime) {
                oldestTime = connection.lastUsed;
                oldestIdentity = identity;
            }
        }

        if (oldestIdentity) {
            this.removeConnection(oldestIdentity);
        }
    }

    /**
     * Shutdown the connection pool
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Clean up all connections
        for (const identity of this.connections.keys()) {
            this.removeConnection(identity);
        }

        console.log('🔌 Connection pool shutdown complete');
    }
}

// Global connection pool instance
export const connectionPool = new ConnectionPool();

// ============================================================
// Connection Manager for Game Sessions
// ============================================================

interface GameSession {
    gameId: bigint;
    players: Set<string>;
    createdAt: number;
    lastActivity: number;
}

class GameSessionManager {
    private sessions = new Map<string, GameSession>();
    private readonly sessionTimeout = 60 * 60 * 1000; // 1 hour
    private cleanupInterval: any = null;

    constructor() {
        this.startCleanup();
    }

    /**
     * Create or get a game session
     */
    createSession(gameId: bigint, player1Id: string, player2Id: string): GameSession {
        const sessionKey = gameId.toString();
        
        let session = this.sessions.get(sessionKey);
        if (!session) {
            session = {
                gameId,
                players: new Set([player1Id, player2Id]),
                createdAt: Date.now(),
                lastActivity: Date.now()
            };
            this.sessions.set(sessionKey, session);
        }

        return session;
    }

    /**
     * Update session activity
     */
    updateActivity(gameId: bigint): void {
        const session = this.sessions.get(gameId.toString());
        if (session) {
            session.lastActivity = Date.now();
        }
    }

    /**
     * Remove a game session
     */
    removeSession(gameId: bigint): void {
        const sessionKey = gameId.toString();
        const session = this.sessions.get(sessionKey);
        
        if (session) {
            // Release all player connections
            for (const playerId of session.players) {
                connectionPool.releaseConnection(playerId);
            }
            
            this.sessions.delete(sessionKey);
        }
    }

    /**
     * Get session statistics
     */
    getStats(): {
        activeSessions: number;
        totalPlayers: number;
        averageSessionDuration: number;
    } {
        const now = Date.now();
        let totalPlayers = 0;
        let totalDuration = 0;

        for (const session of this.sessions.values()) {
            totalPlayers += session.players.size;
            totalDuration += now - session.createdAt;
        }

        const averageDuration = this.sessions.size > 0 ? totalDuration / this.sessions.size : 0;

        return {
            activeSessions: this.sessions.size,
            totalPlayers,
            averageSessionDuration: Math.round(averageDuration / 1000 / 60) // minutes
        };
    }

    /**
     * Start periodic cleanup
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000); // Every 10 minutes
    }

    /**
     * Clean up old sessions
     */
    private cleanup(): void {
        const now = Date.now();
        const toRemove: bigint[] = [];

        for (const [sessionKey, session] of this.sessions) {
            if (now - session.lastActivity > this.sessionTimeout) {
                toRemove.push(session.gameId);
            }
        }

        for (const gameId of toRemove) {
            this.removeSession(gameId);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 Cleaned up ${toRemove.length} old game sessions`);
        }
    }

    /**
     * Shutdown the session manager
     */
    shutdown(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Clean up all sessions
        for (const sessionKey of this.sessions.keys()) {
            const gameId = BigInt(sessionKey);
            this.removeSession(gameId);
        }

        console.log('🎮 Game session manager shutdown complete');
    }
}

// Global game session manager instance
export const gameSessionManager = new GameSessionManager();

// ============================================================
// Exported utility functions
// ============================================================

/**
 * Get connection with automatic pooling
 */
export function getPooledConnection(identity: string, spacetime: any): any {
    return connectionPool.getConnection(identity, spacetime);
}

/**
 * Release connection back to pool
 */
export function releasePooledConnection(identity: string): void {
    connectionPool.releaseConnection(identity);
}

/**
 * Create or update game session
 */
export function createGameSession(gameId: bigint, player1Id: string, player2Id: string): void {
    gameSessionManager.createSession(gameId, player1Id, player2Id);
}

/**
 * Update game session activity
 */
export function updateGameActivity(gameId: bigint): void {
    gameSessionManager.updateActivity(gameId);
}

/**
 * End game session and cleanup connections
 */
export function endGameSession(gameId: bigint): void {
    gameSessionManager.removeSession(gameId);
}

/**
 * Get comprehensive connection and session statistics
 */
export function getConnectionStats(): {
    connectionPool: { totalConnections: number; activeConnections: number; idleConnections: number };
    gameSessions: { activeSessions: number; totalPlayers: number; averageSessionDuration: number };
} {
    return {
        connectionPool: connectionPool.getStats(),
        gameSessions: gameSessionManager.getStats()
    };
}

/**
 * Graceful shutdown of all connection management
 */
export function shutdownConnectionManagement(): void {
    gameSessionManager.shutdown();
    connectionPool.shutdown();
}
