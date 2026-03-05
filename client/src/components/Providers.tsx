'use client';

import { SessionProvider } from "next-auth/react";
import SpacetimeProvider from "./SpacetimeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SpacetimeProvider>
                {children}
            </SpacetimeProvider>
        </SessionProvider>
    );
}
