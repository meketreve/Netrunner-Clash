// ============================================================
// NETRUNNER CLASH — Asset Management System
// Optimized loading and caching of game assets
// ============================================================

interface AssetCache {
    [key: string]: {
        data: any;
        timestamp: number;
        size: number;
    };
}

interface AssetMetadata {
    url: string;
    type: 'image' | 'audio' | 'json' | 'text';
    size: number;
    lastModified: number;
}

class AssetManager {
    private cache: AssetCache = {};
    private loadingPromises = new Map<string, Promise<any>>();
    private readonly maxCacheSize = 50 * 1024 * 1024; // 50MB
    private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours
    private currentCacheSize = 0;
    private metadata = new Map<string, AssetMetadata>();

    /**
     * Load an asset with caching
     */
    async loadAsset(assetPath: string): Promise<any> {
        // Check cache first
        const cached = this.cache[assetPath];
        if (cached && (Date.now() - cached.timestamp) < this.maxAge) {
            return cached.data;
        }

        // Return existing promise if currently loading
        if (this.loadingPromises.has(assetPath)) {
            return this.loadingPromises.get(assetPath);
        }

        // Load asset
        const promise = this.loadAssetFromSource(assetPath);
        this.loadingPromises.set(assetPath, promise);

        try {
            const data = await promise;
            
            // Cache the result
            this.cacheAsset(assetPath, data);
            
            return data;
        } finally {
            this.loadingPromises.delete(assetPath);
        }
    }

    /**
     * Load multiple assets in parallel
     */
    async loadAssets(assetPaths: string[]): Promise<any[]> {
        const promises = assetPaths.map(path => this.loadAsset(path));
        return Promise.all(promises);
    }

    /**
     * Preload critical assets
     */
    async preloadAssets(assetPaths: string[]): Promise<void> {
        console.log(`📦 Preloading ${assetPaths.length} assets...`);
        
        try {
            await this.loadAssets(assetPaths);
            console.log('✅ Asset preloading complete');
        } catch (error) {
            console.error('❌ Asset preloading failed:', error);
        }
    }

    /**
     * Load asset from source (implement based on environment)
     */
    private async loadAssetFromSource(assetPath: string): Promise<any> {
        // For SpacetimeDB environment, we'll implement a basic loader
        // In a real implementation, this would handle different asset types
        
        try {
            // Try to fetch as JSON first
            const response = await fetch(assetPath);
            if (!response.ok) {
                throw new Error(`Failed to load asset: ${assetPath}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType.includes('text/')) {
                return await response.text();
            } else if (contentType.includes('image/')) {
                return await response.blob();
            } else {
                // Default to blob for binary data
                return await response.blob();
            }
        } catch (error) {
            console.error(`Failed to load asset ${assetPath}:`, error);
            throw error;
        }
    }

    /**
     * Cache an asset
     */
    private cacheAsset(assetPath: string, data: any): void {
        const size = this.estimateAssetSize(data);
        
        // Check if we need to make space
        if (this.currentCacheSize + size > this.maxCacheSize) {
            this.cleanupCache();
        }
        
        // Still too big after cleanup? Remove oldest assets
        if (this.currentCacheSize + size > this.maxCacheSize) {
            this.evictOldestAssets(size);
        }
        
        // Cache the asset
        this.cache[assetPath] = {
            data,
            timestamp: Date.now(),
            size
        };
        
        this.currentCacheSize += size;
        
        // Store metadata
        this.metadata.set(assetPath, {
            url: assetPath,
            type: this.detectAssetType(data),
            size,
            lastModified: Date.now()
        });
    }

    /**
     * Estimate asset size in bytes
     */
    private estimateAssetSize(data: any): number {
        if (typeof data === 'string') {
            return data.length * 2; // UTF-16
        } else if (data instanceof Blob) {
            return data.size;
        } else if (typeof data === 'object') {
            return JSON.stringify(data).length * 2;
        } else {
            return 1024; // Default 1KB
        }
    }

    /**
     * Detect asset type
     */
    private detectAssetType(data: any): 'image' | 'audio' | 'json' | 'text' {
        if (data instanceof Blob) {
            if (data.type.includes('image/')) return 'image';
            if (data.type.includes('audio/')) return 'audio';
        }
        if (typeof data === 'object') return 'json';
        if (typeof data === 'string') return 'text';
        return 'text';
    }

    /**
     * Clean up expired assets
     */
    private cleanupCache(): void {
        const now = Date.now();
        const toDelete: string[] = [];
        
        for (const [path, cached] of Object.entries(this.cache)) {
            if (now - cached.timestamp > this.maxAge) {
                toDelete.push(path);
            }
        }
        
        for (const path of toDelete) {
            this.removeAsset(path);
        }
        
        if (toDelete.length > 0) {
            console.log(`🧹 Cleaned up ${toDelete.length} expired assets`);
        }
    }

    /**
     * Evict oldest assets to make space
     */
    private evictOldestAssets(requiredSpace: number): void {
        const sorted = Object.entries(this.cache)
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        let freedSpace = 0;
        const toDelete: string[] = [];
        
        for (const [path, cached] of sorted) {
            if (freedSpace >= requiredSpace) break;
            
            toDelete.push(path);
            freedSpace += cached.size;
        }
        
        for (const path of toDelete) {
            this.removeAsset(path);
        }
        
        if (toDelete.length > 0) {
            console.log(`🗑️ Evicted ${toDelete.length} old assets (${freedSpace} bytes)`);
        }
    }

    /**
     * Remove an asset from cache
     */
    private removeAsset(assetPath: string): void {
        const cached = this.cache[assetPath];
        if (cached) {
            this.currentCacheSize -= cached.size;
            delete this.cache[assetPath];
            this.metadata.delete(assetPath);
        }
    }

    /**
     * Get cached asset without loading
     */
    getCachedAsset(assetPath: string): any | null {
        const cached = this.cache[assetPath];
        if (cached && (Date.now() - cached.timestamp) < this.maxAge) {
            return cached.data;
        }
        return null;
    }

    /**
     * Check if asset is cached
     */
    isAssetCached(assetPath: string): boolean {
        return this.getCachedAsset(assetPath) !== null;
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        totalAssets: number;
        cacheSize: number;
        cacheSizeMB: number;
        hitRate: number;
        loadingAssets: number;
    } {
        return {
            totalAssets: Object.keys(this.cache).length,
            cacheSize: this.currentCacheSize,
            cacheSizeMB: Math.round(this.currentCacheSize / 1024 / 1024 * 100) / 100,
            hitRate: 0, // Would need to track hits/misses
            loadingAssets: this.loadingPromises.size
        };
    }

    /**
     * Clear all cached assets
     */
    clearCache(): void {
        this.cache = {};
        this.metadata.clear();
        this.currentCacheSize = 0;
        console.log('🗑️ Asset cache cleared');
    }

    /**
     * Get asset metadata
     */
    getAssetMetadata(assetPath: string): AssetMetadata | null {
        return this.metadata.get(assetPath) || null;
    }

    /**
     * List all cached assets
     */
    listCachedAssets(): string[] {
        return Object.keys(this.cache);
    }

    /**
     * Optimize cache based on usage patterns
     */
    optimizeCache(): void {
        const stats = this.getStats();
        
        if (stats.cacheSizeMB > 40) {
            console.log('📊 Cache size high, consider aggressive cleanup');
            this.cleanupCache();
        }
        
        if (stats.loadingAssets > 10) {
            console.log('📊 Many assets loading, consider preloading');
        }
    }
}

// Global asset manager instance
export const assetManager = new AssetManager();

// ============================================================
// Card Asset Management
// ============================================================

/**
 * Load card assets for a set of card IDs
 */
export async function loadCardAssets(cardIds: number[]): Promise<Map<number, any>> {
    const assetMap = new Map<number, any>();
    
    // Generate asset paths for cards
    const assetPaths = cardIds.map(id => `/assets/cards/${id}.png`);
    
    try {
        const assets = await assetManager.loadAssets(assetPaths);
        
        cardIds.forEach((id, index) => {
            if (assets[index]) {
                assetMap.set(id, assets[index]);
            }
        });
        
        return assetMap;
    } catch (error) {
        console.error('Failed to load card assets:', error);
        return assetMap;
    }
}

/**
 * Preload card assets for the default deck
 */
export async function preloadDefaultDeckAssets(): Promise<void> {
    // Default deck card IDs from cards.ts
    const defaultDeckCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19];
    
    await assetManager.preloadAssets(
        defaultDeckCards.map(id => `/assets/cards/${id}.png`)
    );
}

/**
 * Get card asset with fallback
 */
export async function getCardAsset(cardId: number): Promise<any> {
    const assetPath = `/assets/cards/${cardId}.png`;
    
    try {
        return await assetManager.loadAsset(assetPath);
    } catch (error) {
        // Return fallback asset
        console.warn(`Failed to load card asset ${cardId}, using fallback`);
        return await assetManager.loadAsset('/assets/cards/fallback.png');
    }
}

// ============================================================
// Performance Monitoring
// ============================================================

/**
 * Get asset loading performance metrics
 */
export function getAssetMetrics(): {
    cacheStats: { totalAssets: number; cacheSize: number; cacheSizeMB: number; hitRate: number; loadingAssets: number };
    recommendations: string[];
} {
    const cacheStats = assetManager.getStats();
    const recommendations: string[] = [];
    
    if (cacheStats.cacheSizeMB > 40) {
        recommendations.push('Consider reducing cache size or implementing more aggressive cleanup');
    }
    
    if (cacheStats.totalAssets > 100) {
        recommendations.push('Consider implementing asset grouping or lazy loading');
    }
    
    if (cacheStats.loadingAssets > 5) {
        recommendations.push('Consider preloading critical assets');
    }
    
    return {
        cacheStats,
        recommendations
    };
}

/**
 * Start automatic asset optimization
 */
export function startAssetOptimization(): void {
    setInterval(() => {
        assetManager.optimizeCache();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('📊 Asset optimization started');
}
