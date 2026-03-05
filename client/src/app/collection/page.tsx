'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import CollectionScreen from '@/components/CollectionScreen';

export default function CollectionPage() {
    const router = useRouter();

    return (
        <main className="game-page" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            <CollectionScreen onBack={() => router.push('/')} />
        </main>
    );
}
