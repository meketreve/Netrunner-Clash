// ============================================================
// NETRUNNER CLASH — Frontend Performance Optimization
// Client-side performance monitoring and optimization
// ============================================================

'use client';

import React, { useCallback, useMemo, useEffect, useRef } from 'react';

// ============================================================
// Performance Monitoring
// ============================================================

interface FrontendMetrics {
    renderTime: number;
    componentCount: number;
    reRenderCount: number;
    memoryUsage: number;
    bundleSize: number;
}

class FrontendPerformanceMonitor {
    private metrics: FrontendMetrics = {
        renderTime: 0,
        componentCount: 0,
        reRenderCount: 0,
        memoryUsage: 0,
        bundleSize: 0
    };
    
    private observers: PerformanceObserver[] = [];
    private renderCounters = new Map<string, number>();

    /**
     * Start monitoring performance
     */
    startMonitoring(): void {
        if (typeof window === 'undefined' || !window.performance) return;

        // Monitor render performance
        this.observeRenderPerformance();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Monitor bundle size
        this.measureBundleSize();
        
        console.log('📊 Frontend performance monitoring started');
    }

    /**
     * Observe render performance
     */
    private observeRenderPerformance(): void {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        this.metrics.renderTime += entry.duration;
                    }
                }
            });
            
            observer.observe({ entryTypes: ['measure'] });
            this.observers.push(observer);
        } catch (error) {
            console.warn('Performance observation not supported:', error);
        }
    }

    /**
     * Monitor memory usage
     */
    private monitorMemoryUsage(): void {
        if ('memory' in performance) {
            const updateMemory = () => {
                const memory = (performance as any).memory;
                this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
            };
            
            updateMemory();
            setInterval(updateMemory, 5000); // Update every 5 seconds
        }
    }

    /**
     * Measure bundle size
     */
    private measureBundleSize(): void {
        if (typeof window !== 'undefined') {
            const scripts = document.querySelectorAll('script[src]');
            let totalSize = 0;
            
            scripts.forEach(script => {
                const src = script.getAttribute('src');
                if (src && src.includes('/_next/static/chunks/')) {
                    // Estimate size (this is approximate)
                    totalSize += 100 * 1024; // 100KB per chunk estimate
                }
            });
            
            this.metrics.bundleSize = totalSize / 1024 / 1024; // MB
        }
    }

    /**
     * Track component render
     */
    trackComponentRender(componentName: string): void {
        const current = this.renderCounters.get(componentName) || 0;
        this.renderCounters.set(componentName, current + 1);
        this.metrics.reRenderCount++;
    }

    /**
     * Get current metrics
     */
    getMetrics(): FrontendMetrics {
        return { ...this.metrics };
    }

    /**
     * Get render statistics
     */
    getRenderStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        for (const [component, count] of this.renderCounters) {
            stats[component] = count;
        }
        return stats;
    }

    /**
     * Reset metrics
     */
    reset(): void {
        this.metrics = {
            renderTime: 0,
            componentCount: 0,
            reRenderCount: 0,
            memoryUsage: 0,
            bundleSize: 0
        };
        this.renderCounters.clear();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Global performance monitor instance
export const frontendPerformanceMonitor = new FrontendPerformanceMonitor();

// ============================================================
// React Performance Hooks
// ============================================================

/**
 * Hook to track component renders
 */
export function useRenderTracker(componentName: string) {
    const renderCount = useRef(0);
    
    useEffect(() => {
        renderCount.current++;
        frontendPerformanceMonitor.trackComponentRender(componentName);
    });
    
    return renderCount.current;
}

/**
 * Hook for expensive calculations with performance tracking
 */
export function useTrackedMemo<T>(
    factory: () => T,
    deps: React.DependencyList,
    calculationName: string
): T {
    return useMemo(() => {
        const start = performance.now();
        const result = factory();
        const end = performance.now();
        
        if (end - start > 10) { // Log slow calculations
            console.warn(`🐌 Slow calculation detected: ${calculationName} took ${(end - start).toFixed(2)}ms`);
        }
        
        return result;
    }, deps);
}

/**
 * Hook for expensive callbacks with performance tracking
 */
export function useTrackedCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList,
    callbackName: string
): T {
    return useCallback((...args: any[]) => {
        const start = performance.now();
        const result = callback(...args);
        const end = performance.now();
        
        if (end - start > 50) { // Log slow callbacks
            console.warn(`🐌 Slow callback detected: ${callbackName} took ${(end - start).toFixed(2)}ms`);
        }
        
        return result;
    }, deps) as T;
}

// ============================================================
// Asset Optimization
// ============================================================

class AssetOptimizer {
    private imageCache = new Map<string, HTMLImageElement>();
    private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
    
    /**
     * Preload an image
     */
    async preloadImage(src: string): Promise<HTMLImageElement> {
        // Return cached image if available
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src)!;
        }
        
        // Return existing promise if currently loading
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src)!;
        }
        
        // Load image
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(src, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
        
        this.loadingPromises.set(src, promise);
        return promise;
    }
    
    /**
     * Preload multiple images
     */
    async preloadImages(srcs: string[]): Promise<HTMLImageElement[]> {
        const promises = srcs.map(src => this.preloadImage(src));
        return Promise.all(promises);
    }
    
    /**
     * Get cached image
     */
    getCachedImage(src: string): HTMLImageElement | null {
        return this.imageCache.get(src) || null;
    }
    
    /**
     * Clear cache
     */
    clearCache(): void {
        this.imageCache.clear();
        this.loadingPromises.clear();
    }
    
    /**
     * Get cache statistics
     */
    getStats(): { cachedImages: number; loadingImages: number } {
        return {
            cachedImages: this.imageCache.size,
            loadingImages: this.loadingPromises.size
        };
    }
}

// Global asset optimizer instance
export const assetOptimizer = new AssetOptimizer();

// ============================================================
// Bundle Optimization
// ============================================================

/**
 * Lazy load components
 */
export function lazyLoad<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    componentName: string
) {
    return React.lazy(() => {
        const start = performance.now();
        return importFunc().then(module => {
            const end = performance.now();
            console.log(`📦 Component ${componentName} loaded in ${(end - start).toFixed(2)}ms`);
            return module;
        });
    });
}

/**
 * Preload critical components
 */
export async function preloadComponents(components: Array<{ name: string; importFunc: () => Promise<any> }>): Promise<void> {
    console.log(`📦 Preloading ${components.length} components...`);
    
    const start = performance.now();
    const promises = components.map(async ({ name, importFunc }) => {
        try {
            await importFunc();
            console.log(`✅ Component ${name} preloaded`);
        } catch (error) {
            console.error(`❌ Failed to preload component ${name}:`, error);
        }
    });
    
    await Promise.all(promises);
    const end = performance.now();
    
    console.log(`📦 Component preloading complete in ${(end - start).toFixed(2)}ms`);
}

// ============================================================
// Performance Utilities
// ============================================================

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Measure function performance
 */
export function measurePerformance<T extends (...args: any[]) => any>(
    func: T,
    name: string
): T {
    return ((...args: Parameters<T>) => {
        const start = performance.now();
        const result = func(...args);
        const end = performance.now();
        
        console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
        return result;
    }) as unknown as T;
}

// ============================================================
// Performance Reporting
// ============================================================

/**
 * Get comprehensive performance report
 */
export function getPerformanceReport(): {
    frontend: FrontendMetrics;
    assets: { cachedImages: number; loadingImages: number };
    renderStats: Record<string, number>;
    recommendations: string[];
} {
    const frontend = frontendPerformanceMonitor.getMetrics();
    const assets = assetOptimizer.getStats();
    const renderStats = frontendPerformanceMonitor.getRenderStats();
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (frontend.memoryUsage > 50) {
        recommendations.push('High memory usage detected, consider implementing more aggressive cleanup');
    }
    
    if (frontend.renderTime > 100) {
        recommendations.push('High render times detected, consider optimizing components');
    }
    
    if (frontend.bundleSize > 2) {
        recommendations.push('Large bundle size detected, consider code splitting');
    }
    
    const topRenderers = Object.entries(renderStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);
    
    if (topRenderers.some(([, count]) => count > 10)) {
        recommendations.push(`High re-render counts detected: ${topRenderers.map(([name, count]) => `${name} (${count})`).join(', ')}`);
    }
    
    return {
        frontend,
        assets,
        renderStats,
        recommendations
    };
}

/**
 * Start frontend performance monitoring
 */
export function startFrontendPerformanceMonitoring(): void {
    frontendPerformanceMonitor.startMonitoring();
    
    // Log performance report every 30 seconds
    setInterval(() => {
        const report = getPerformanceReport();
        if (report.recommendations.length > 0) {
            console.log('📊 Performance Report:', report);
        }
    }, 30000);
}
