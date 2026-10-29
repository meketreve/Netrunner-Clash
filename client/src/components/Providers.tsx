'use client';

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./GameToast";

// Refetch the session every 30 min so the server-side jwt callback refreshes
// the Google ID token before it expires (1h).
const SESSION_REFETCH_SECONDS = 30 * 60;

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchInterval={SESSION_REFETCH_SECONDS}>
            <ToastProvider>
                {children}
            </ToastProvider>
        </SessionProvider>
    );
}
