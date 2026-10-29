// ============================================================
// SpacetimeDB Connection Configuration
// ============================================================
// No token is stored here: the connection uses the Google ID token from the
// NextAuth session (see SpacetimeProvider).

export const SPACETIMEDB_CONFIG = {
    // For production (SpacetimeDB Cloud):
    uri: process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'wss://maincloud.spacetimedb.com',
    moduleName: process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || 'royal-oil-0688',
};
