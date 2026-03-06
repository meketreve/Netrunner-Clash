// ============================================================
// NETRUNNER CLASH — Performance Initialization
// Sets up all performance optimization systems
// ============================================================

import { performanceMonitor, startPerformanceMonitoring, updateConnectionCount, updateActiveGamesCount, shouldEnableAggressiveCaching, getOptimizationRecommendations } from './performance-monitor.js';
import { connectionPool, gameSessionManager, getConnectionStats, shutdownConnectionManagement } from './connection-pool.js';
import { messageBatcher, startBatchingCleanup, getBatchingMetrics, optimizeBatching } from './message-batcher.js';
import { assetManager, preloadDefaultDeckAssets, startAssetOptimization, getAssetMetrics } from './asset-manager.js';
import { cleanupCache, invalidateAllCache } from './query-optimizer.js';

// ============================================================
// Performance Configuration
// ============================================================

interface PerformanceConfig {
    enableCaching: boolean;
    enableConnectionPooling: boolean;
    enableMessageBatching: boolean;
    enableAssetOptimization: boolean;
    cacheCleanupInterval: number;
    batchTimeout: number;
    maxConnections: number;
    maxCacheSize: number;
}

const defaultConfig: PerformanceConfig = {
    enableCaching: true,
    enableConnectionPooling: true,
    enableMessageBatching: true,
    enableAssetOptimization: true,
    cacheCleanupInterval: 5 * 60 * 1000, // 5 minutes
    batchTimeout: 100, // 100ms
    maxConnections: 100,
    maxCacheSize: 50 * 1024 * 1024 // 50MB
};

let currentConfig = { ...defaultConfig };

// ============================================================
// Initialization Functions
// ============================================================

/**
 * Initialize all performance optimization systems
 */
export function initializePerformance(config: Partial<PerformanceConfig> = {}): void {
    // Merge config with defaults
    currentConfig = { ...defaultConfig, ...config };
    
    console.log('🚀 Initializing Netrunner Clash Performance Systems...');
    console.log('📋 Configuration:', currentConfig);
    
    try {
        // Start performance monitoring
        if (currentConfig.enableCaching) {
            startPerformanceMonitoring();
            console.log('✅ Performance monitoring started');
        }
        
        // Initialize connection pooling
        if (currentConfig.enableConnectionPooling) {
            console.log('✅ Connection pooling initialized');
        }
        
        // Initialize message batching
        if (currentConfig.enableMessageBatching) {
            startBatchingCleanup();
            console.log('✅ Message batching initialized');
        }
        
        // Initialize asset management
        if (currentConfig.enableAssetOptimization) {
            startAssetOptimization();
            preloadDefaultDeckAssets().catch(error => {
                console.warn('Failed to preload default deck assets:', error);
            });
            console.log('✅ Asset optimization started');
        }
        
        // Start periodic optimization
        startPeriodicOptimization();
        
        console.log('🎉 Performance systems initialization complete!');
        
        // Log initial status
        logPerformanceStatus();
        
    } catch (error) {
        console.error('❌ Failed to initialize performance systems:', error);
    }
}

/**
 * Start periodic optimization tasks
 */
function startPeriodicOptimization(): void {
    // Run optimization every 10 minutes
    setInterval(() => {
        runOptimizationCycle();
    }, 10 * 60 * 1000);
    
    // Run cache cleanup every 5 minutes
    setInterval(() => {
        if (currentConfig.enableCaching) {
            cleanupCache();
        }
    }, currentConfig.cacheCleanupInterval);
}

/**
 * Run a complete optimization cycle
 */
function runOptimizationCycle(): void {
    try {
        console.log('🔧 Running performance optimization cycle...');
        
        // Optimize batching
        if (currentConfig.enableMessageBatching) {
            optimizeBatching();
        }
        
        // Check if we should enable aggressive caching
        if (currentConfig.enableCaching && shouldEnableAggressiveCaching()) {
            console.log('📊 Enabling aggressive caching due to load');
        }
        
        // Get and log recommendations
        const recommendations = getOptimizationRecommendations();
        if (recommendations.length > 0) {
            console.log('💡 Optimization recommendations:', recommendations);
        }
        
        // Get asset metrics
        if (currentConfig.enableAssetOptimization) {
            const assetMetrics = getAssetMetrics();
            if (assetMetrics.recommendations.length > 0) {
                console.log('🖼️ Asset optimization recommendations:', assetMetrics.recommendations);
            }
        }
        
        console.log('✅ Optimization cycle complete');
        
    } catch (error) {
        console.error('❌ Optimization cycle failed:', error);
    }
}

/**
 * Log current performance status
 */
function logPerformanceStatus(): void {
    console.log('📊 Current Performance Status:');
    
    // Connection stats
    if (currentConfig.enableConnectionPooling) {
        const connStats = getConnectionStats();
        console.log(`  🔌 Connections: ${connStats.connectionPool.totalConnections} total, ${connStats.connectionPool.activeConnections} active, ${connStats.gameSessions.activeSessions} game sessions`);
    }
    
    // Batching stats
    if (currentConfig.enableMessageBatching) {
        const batchStats = getBatchingMetrics();
        console.log(`  📦 Batching: ${batchStats.stats.activeBatches} active batches, ${batchStats.efficiency}% efficiency`);
    }
    
    // Asset stats
    if (currentConfig.enableAssetOptimization) {
        const assetStats = assetManager.getStats();
        console.log(`  🖼️ Assets: ${assetStats.totalAssets} cached, ${assetStats.cacheSizeMB}MB used`);
    }
    
    // Performance summary
    const perfSummary = performanceMonitor.getPerformanceSummary();
    console.log(`  ⚡ Performance: ${perfSummary.avgResponseTime}ms avg response, ${perfSummary.totalQueries} queries`);
}

// ============================================================
// Runtime Performance Management
// ============================================================

/**
 * Update performance metrics based on game state
 */
export function updateGameMetrics(activeGames: number, activeConnections: number): void {
    updateActiveGamesCount(activeGames);
    updateConnectionCount(activeConnections);
}

/**
 * Handle game start event
 */
export function onGameStart(gameId: bigint, player1Id: string, player2Id: string): void {
    if (currentConfig.enableConnectionPooling) {
        gameSessionManager.createSession(gameId, player1Id, player2Id);
    }
    
    // Invalidate relevant caches
    if (currentConfig.enableCaching) {
        invalidateAllCache();
    }
}

/**
 * Handle game end event
 */
export function onGameEnd(gameId: bigint): void {
    if (currentConfig.enableConnectionPooling) {
        gameSessionManager.removeSession(gameId);
    }
    
    // Flush any pending message batches
    if (currentConfig.enableMessageBatching) {
        messageBatcher.flushAllBatches();
    }
}

/**
 * Handle player disconnect event
 */
export function onPlayerDisconnect(playerId: string): void {
    if (currentConfig.enableConnectionPooling) {
        connectionPool.removeConnection(playerId);
    }
}

// ============================================================
// Configuration Management
// ============================================================

/**
 * Update performance configuration
 */
export function updatePerformanceConfig(config: Partial<PerformanceConfig>): void {
    const oldConfig = { ...currentConfig };
    currentConfig = { ...currentConfig, ...config };
    
    console.log('⚙️ Performance configuration updated:', config);
    
    // Handle configuration changes
    if (!oldConfig.enableCaching && currentConfig.enableCaching) {
        startPerformanceMonitoring();
    } else if (oldConfig.enableCaching && !currentConfig.enableCaching) {
        console.log('🛑 Caching disabled');
    }
    
    if (!oldConfig.enableAssetOptimization && currentConfig.enableAssetOptimization) {
        startAssetOptimization();
    }
}

/**
 * Get current performance configuration
 */
export function getPerformanceConfig(): PerformanceConfig {
    return { ...currentConfig };
}

// ============================================================
// Health Checks
// ============================================================

/**
 * Run comprehensive performance health check
 */
export function runPerformanceHealthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: any;
} {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check connection pool
    if (currentConfig.enableConnectionPooling) {
        const connStats = getConnectionStats();
        if (connStats.connectionPool.totalConnections > currentConfig.maxConnections * 0.8) {
            issues.push(`Connection pool at ${Math.round(connStats.connectionPool.totalConnections / currentConfig.maxConnections * 100)}% capacity`);
            status = 'warning';
        }
    }
    
    // Check asset cache
    if (currentConfig.enableAssetOptimization) {
        const assetStats = assetManager.getStats();
        if (assetStats.cacheSizeMB > 40) {
            issues.push(`Asset cache using ${assetStats.cacheSizeMB}MB (limit: ${currentConfig.maxCacheSize / 1024 / 1024}MB)`);
            status = status === 'healthy' ? 'warning' : status;
        }
    }
    
    // Check performance metrics
    const perfSummary = performanceMonitor.getPerformanceSummary();
    if (perfSummary.avgResponseTime > 200) {
        issues.push(`High average response time: ${perfSummary.avgResponseTime}ms`);
        status = 'critical';
    } else if (perfSummary.avgResponseTime > 100) {
        issues.push(`Elevated response time: ${perfSummary.avgResponseTime}ms`);
        status = status === 'healthy' ? 'warning' : status;
    }
    
    return {
        status,
        issues,
        metrics: {
            connections: currentConfig.enableConnectionPooling ? getConnectionStats() : null,
            assets: currentConfig.enableAssetOptimization ? assetManager.getStats() : null,
            performance: perfSummary,
            batching: currentConfig.enableMessageBatching ? getBatchingMetrics() : null
        }
    };
}

// ============================================================
// Shutdown
// ============================================================

/**
 * Gracefully shutdown all performance systems
 */
export function shutdownPerformanceSystems(): void {
    console.log('🛑 Shutting down performance systems...');
    
    try {
        // Shutdown connection management
        if (currentConfig.enableConnectionPooling) {
            shutdownConnectionManagement();
        }
        
        // Flush message batches
        if (currentConfig.enableMessageBatching) {
            messageBatcher.flushAllBatches();
        }
        
        // Clear caches
        if (currentConfig.enableCaching) {
            invalidateAllCache();
        }
        
        // Clear asset cache
        if (currentConfig.enableAssetOptimization) {
            assetManager.clearCache();
        }
        
        // Reset performance monitor
        performanceMonitor.reset();
        
        console.log('✅ Performance systems shutdown complete');
        
    } catch (error) {
        console.error('❌ Error during performance systems shutdown:', error);
    }
}

// ============================================================
// Auto-initialization for production
// ============================================================

// Initialize performance systems if this module is loaded
if (typeof globalThis !== 'undefined') {
    // Check if we're in a production environment
    const isProduction = typeof globalThis !== 'undefined' && 
                       (globalThis as any).process?.env?.NODE_ENV === 'production';
    
    if (isProduction) {
        // Initialize with production-optimized settings
        initializePerformance({
            enableCaching: true,
            enableConnectionPooling: true,
            enableMessageBatching: true,
            enableAssetOptimization: true
        });
    }
}
