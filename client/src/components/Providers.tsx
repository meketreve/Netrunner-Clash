'use client';

import { SessionProvider } from "next-auth/react";
import SpacetimeProvider from "./SpacetimeProvider";
import { ToastProvider } from "./GameToast";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SpacetimeProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </SpacetimeProvider>
        </SessionProvider>
    );
}
