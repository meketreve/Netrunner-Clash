import type { DefaultSession } from "next-auth"

type AuthError = "RefreshTokenMissing" | "RefreshTokenError"

declare module "next-auth" {
    interface Session {
        user: { id: string } & DefaultSession["user"]
        /** Google ID token, used as the SpacetimeDB connection token */
        idToken?: string
        error?: AuthError
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        idToken?: string
        expiresAt?: number
        refreshToken?: string
        error?: AuthError
    }
}
