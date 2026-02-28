// ============================================================
// SpacetimeDB Provider — Real Connection (SDK v2.0.2)
// ============================================================

'use client';

import React, { useMemo } from 'react';
import { SpacetimeDBProvider as SDBProvider } from 'spacetimedb/react';
import { DbConnection } from '@/module_bindings';
import { getStoredToken, storeToken } from '@/lib/spacetimedb';

export default function SpacetimeProvider({ children }: { children: React.ReactNode }) {
    const connectionBuilder = useMemo(() => {
        const builder = DbConnection.builder()
            .withUri(process.env.NEXT_PUBLIC_SPACETIMEDB_URI || 'wss://maincloud.spacetimedb.com')
            .withDatabaseName(process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE || 'royal-oil-0688')
            .onConnect((conn, identity, token) => {
                console.log('[SpacetimeDB] Connected as:', identity.toHexString());
                storeToken(token);
                // Register the player automatically
                conn.reducers.registerPlayer({});
            })
            .onDisconnect((_ctx, error) => {
                console.log('[SpacetimeDB] Disconnected', error || '');
            })
            .onConnectError((_ctx, err) => {
                console.error('[SpacetimeDB] Connection error:', err);
            });

        // Restore token if previously stored
        const token = getStoredToken();
        if (token) {
            builder.withToken(token);
        }

        return builder;
    }, []);

    return (
        <SDBProvider connectionBuilder={connectionBuilder}>
            {children}
        </SDBProvider>
    );
}
