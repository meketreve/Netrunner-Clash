// ============================================================
// SpacetimeDB Connection Configuration
// ============================================================

export const SPACETIMEDB_CONFIG = {
    // For production (SpacetimeDB Cloud):
    uri: process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'wss://maincloud.spacetimedb.com',
    moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || 'royal-oil-0688',
};

// Token storage for SpacetimeDB identity persistence
const TOKEN_KEY = 'spacetimedb_token';

export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
}
