// ============================================================
// SpacetimeDB Provider — connects with the player's Google ID token
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { SpacetimeDBProvider as SDBProvider } from 'spacetimedb/react';
import { DbConnection } from '@/module_bindings';
import { SPACETIMEDB_CONFIG } from '@/lib/spacetimedb';
import '@/styles/game.css';

function buildConnection(idToken: string) {
    return DbConnection.builder()
        .withUri(SPACETIMEDB_CONFIG.uri)
        .withDatabaseName(SPACETIMEDB_CONFIG.moduleName)
        // The server verifies this Google token and derives the player identity from it
        .withToken(idToken)
        .onConnect((conn, identity) => {
            console.log('[SpacetimeDB] ✅ Connected as:', identity.toHexString());
            // Subscribe to everything the client may read (public tables + views)
            conn.subscriptionBuilder()
                .onApplied(() => {
                    console.log('[SpacetimeDB] 📡 Subscription applied — tables are now synced');
                })
                .onError((ctx) => {
                    console.error('[SpacetimeDB] ❌ Subscription error:', ctx.event ?? ctx);
                })
                .subscribeToAllTables();
        })
        .onDisconnect((_ctx, error) => {
            console.log('[SpacetimeDB] 🔌 Disconnected', error ?? '');
        })
        .onConnectError((_ctx, error) => {
            console.error('[SpacetimeDB] ❌ Connection error:', error);
        });
}

function Connected({ idToken, children }: { idToken: string; children: React.ReactNode }) {
    // Build once with the token we had at mount: a refreshed token must not
    // tear down a live connection. Reloading the page reconnects with a fresh one.
    const [connectionBuilder] = useState(() => buildConnection(idToken));
    return <SDBProvider connectionBuilder={connectionBuilder}>{children}</SDBProvider>;
}

export default function SpacetimeProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <div className="game-page">
                <div className="lobby">
                    <p className="lobby__subtitle">🔄 Verificando login...</p>
                </div>
            </div>
        );
    }

    if (!session?.idToken || session.error) {
        return (
            <div className="game-page">
                <div className="lobby">
                    <div className="lobby__header">
                        <h1 className="lobby__title">NETRUNNER CLASH</h1>
                        <p className="lobby__subtitle">
                            {session?.error ? 'Sua sessão expirou. Entre de novo para jogar.' : 'Entre com o Google para jogar.'}
                        </p>
                    </div>
                    <button className="google-btn" onClick={() => signIn('google')}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- external provider icon */}
                        <img src="https://authjs.dev/img/providers/google.svg" className="google-btn__icon" alt="Google" />
                        Acessar com Google
                    </button>
                    <Link href="/" className="cyber-btn cyber-btn--red">🏠 VOLTAR AO MENU</Link>
                </div>
            </div>
        );
    }

    return <Connected idToken={session.idToken}>{children}</Connected>;
}
