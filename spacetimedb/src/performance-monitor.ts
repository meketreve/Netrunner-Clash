// ============================================================
// NETRUNNER CLASH — Performance Monitoring
// Real-time performance tracking and alerting
// ============================================================

import { QueryMetrics } from './query-optimizer.js';

// ============================================================
// Performance Metrics Collection
// ============================================================

interface MemoryUsage {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
}

interface PerformanceMetrics {
    timestamp: number;
    memoryUsage: MemoryUsage;
    activeConnections: number;
    activeGames: number;
    queryMetrics: Record<string, { count: number; avgTime: number; maxTime: number }>;
    responseTime: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics[] = [];
    private readonly maxMetrics = 1000; // Keep last 1000 data points
    private readonly alertThresholds = {
        queryTime: 100, // ms
        memoryUsage: 0.8, // 80% of available memory
        responseTime: 200, // ms
        activeConnections: 100
    };

    /**
     * Collect current performance metrics
     */
    collectMetrics(activeConnections: number, activeGames: number, responseTime: number): void {
        // Get memory usage - simplified for SpacetimeDB environment
        const memoryUsage: MemoryUsage = {
            rss: 0,
            heapTotal: 0,
            heapUsed: 0,
            external: 0,
            arrayBuffers: 0
        };

        const metrics: PerformanceMetrics = {
            timestamp: Date.now(),
            memoryUsage,
            activeConnections,
            activeGames,
            queryMetrics: QueryMetrics.getMetrics(),
            responseTime
        };

        this.metrics.push(metrics);
        
        // Keep only recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        // Check for performance alerts
        this.checkAlerts(metrics);
    }

    /**
     * Check for performance alerts
     */
    private checkAlerts(metrics: PerformanceMetrics): void {
        // Check query performance
        for (const [query, queryMetrics] of Object.entries(metrics.queryMetrics)) {
            if (queryMetrics.avgTime > this.alertThresholds.queryTime) {
                console.warn(`🚨 Performance Alert: Query ${query} avg time ${queryMetrics.avgTime.toFixed(2)}ms exceeds threshold`);
            }
            if (queryMetrics.maxTime > this.alertThresholds.queryTime * 2) {
                console.warn(`🚨 Performance Alert: Query ${query} max time ${queryMetrics.maxTime}ms exceeds threshold`);
            }
        }

        // Check memory usage
        const totalMemory = metrics.memoryUsage.heapTotal;
        const usedMemory = metrics.memoryUsage.heapUsed;
        const memoryUsageRatio = usedMemory / totalMemory;
        
        if (memoryUsageRatio > this.alertThresholds.memoryUsage) {
            console.warn(`🚨 Performance Alert: Memory usage ${(memoryUsageRatio * 100).toFixed(1)}% exceeds threshold`);
        }

        // Check response time
        if (metrics.responseTime > this.alertThresholds.responseTime) {
            console.warn(`🚨 Performance Alert: Response time ${metrics.responseTime}ms exceeds threshold`);
        }

        // Check connection count
        if (metrics.activeConnections > this.alertThresholds.activeConnections) {
            console.warn(`🚨 Performance Alert: Active connections ${metrics.activeConnections} exceeds threshold`);
        }
    }

    /**
     * Get recent metrics for analysis
     */
    getRecentMetrics(minutes: number = 5): PerformanceMetrics[] {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.metrics.filter(m => m.timestamp >= cutoff);
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        avgResponseTime: number;
        avgMemoryUsage: number;
        totalQueries: number;
        slowQueries: string[];
        activeGames: number;
        activeConnections: number;
    } {
        const recent = this.getRecentMetrics(5); // Last 5 minutes
        
        if (recent.length === 0) {
            return {
                avgResponseTime: 0,
                avgMemoryUsage: 0,
                totalQueries: 0,
                slowQueries: [],
                activeGames: 0,
                activeConnections: 0
            };
        }

        const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
        const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length;
        const activeGames = recent[recent.length - 1]?.activeGames || 0;
        const activeConnections = recent[recent.length - 1]?.activeConnections || 0;

        // Aggregate query metrics
        const allQueryMetrics = new Map<string, { count: number; totalTime: number; maxTime: number }>();
        
        for (const metrics of recent) {
            for (const [query, queryMetrics] of Object.entries(metrics.queryMetrics)) {
                const existing = allQueryMetrics.get(query) || { count: 0, totalTime: 0, maxTime: 0 };
                allQueryMetrics.set(query, {
                    count: existing.count + queryMetrics.count,
                    totalTime: existing.totalTime + (queryMetrics.avgTime * queryMetrics.count),
                    maxTime: Math.max(existing.maxTime, queryMetrics.maxTime)
                });
            }
        }

        const totalQueries = Array.from(allQueryMetrics.values()).reduce((sum, q) => sum + q.count, 0);
        const slowQueries = Array.from(allQueryMetrics.entries())
            .filter(([, metrics]) => metrics.totalTime / metrics.count > this.alertThresholds.queryTime)
            .map(([query]) => query);

        return {
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            avgMemoryUsage: Math.round(avgMemoryUsage / 1024 / 1024), // MB
            totalQueries,
            slowQueries,
            activeGames,
            activeConnections
        };
    }

    /**
     * Export metrics for external monitoring
     */
    exportMetrics(): string {
        const summary = this.getPerformanceSummary();
        return JSON.stringify({
            timestamp: Date.now(),
            ...summary,
            memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
        }, null, 2);
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metrics = [];
        QueryMetrics.reset();
    }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// ============================================================
// Automatic Monitoring Setup
// ============================================================

let activeConnections = 0;
let activeGames = 0;

/**
 * Update connection count
 */
export function updateConnectionCount(count: number): void {
    activeConnections = count;
}

/**
 * Update active games count
 */
export function updateActiveGamesCount(count: number): void {
    activeGames = count;
}

/**
 * Measure and record response time
 */
export function measureResponseTime<T>(operation: () => T): T {
    const startTime = Date.now();
    const result = operation();
    const responseTime = Date.now() - startTime;
    
    // Record metrics every 30 seconds
    if (Math.random() < 0.01) { // Sample 1% of operations
        performanceMonitor.collectMetrics(activeConnections, activeGames, responseTime);
    }
    
    return result;
}

/**
 * Start automatic monitoring
 */
export function startPerformanceMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
        performanceMonitor.collectMetrics(activeConnections, activeGames, 0);
    }, 30000);

    // Cleanup old metrics every 5 minutes
    setInterval(() => {
        // Old metrics are automatically cleaned in collectMetrics
        console.log('📊 Performance Summary:', performanceMonitor.getPerformanceSummary());
    }, 300000);

    console.log('✅ Performance monitoring started');
}

// ============================================================
// Performance Optimization Helpers
// ============================================================

/**
 * Check if we should enable aggressive caching
 */
export function shouldEnableAggressiveCaching(): boolean {
    const summary = performanceMonitor.getPerformanceSummary();
    return summary.avgResponseTime > 100 || summary.activeConnections > 50;
}

/**
 * Check if we should scale up resources
 */
export function shouldScaleUp(): boolean {
    const summary = performanceMonitor.getPerformanceSummary();
    return summary.avgMemoryUsage > 512 || summary.activeConnections > 80; // 512MB or 80 connections
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations(): string[] {
    const summary = performanceMonitor.getPerformanceSummary();
    const recommendations: string[] = [];

    if (summary.avgResponseTime > 100) {
        recommendations.push('Consider enabling query result caching');
        recommendations.push('Review slow queries and add database indexes');
    }

    if (summary.avgMemoryUsage > 512) {
        recommendations.push('Implement more aggressive cache cleanup');
        recommendations.push('Review memory usage patterns');
    }

    if (summary.slowQueries.length > 0) {
        recommendations.push(`Optimize slow queries: ${summary.slowQueries.join(', ')}`);
    }

    if (summary.activeConnections > 50) {
        recommendations.push('Consider implementing connection pooling');
        recommendations.push('Enable horizontal scaling');
    }

    return recommendations;
}
