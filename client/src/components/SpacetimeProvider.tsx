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
                console.log('[SpacetimeDB] ✅ Connected as:', identity.toHexString());
                storeToken(token);
                // Register the player automatically
                conn.reducers.registerPlayer({});
                // Subscribe to all tables — REQUIRED for useTable to receive data
                conn.subscriptionBuilder()
                    .onApplied(() => {
                        console.log('[SpacetimeDB] 📡 Subscription applied — tables are now synced');
                    })
                    .onError((ctx: any) => {
                        console.error('[SpacetimeDB] ❌ Subscription error:', ctx.error || ctx);
                    })
                    .subscribeToAllTables();
            })
            .onDisconnect((ctx: any) => {
                console.log('[SpacetimeDB] 🔌 Disconnected', ctx.error || '');
            })
            .onConnectError((ctx: any) => {
                console.error('[SpacetimeDB] ❌ Connection error:', ctx.error || ctx);
            });

        // Restore token if previously stored
        const token = getStoredToken();
        if (token) {
            console.log('[SpacetimeDB] 🔑 Restoring saved token');
            builder.withToken(token);
        } else {
            console.log('[SpacetimeDB] 🆕 No saved token — new identity will be created');
        }

        return builder;
    }, []);

    return (
        <SDBProvider connectionBuilder={connectionBuilder}>
            {children}
        </SDBProvider>
    );
}
