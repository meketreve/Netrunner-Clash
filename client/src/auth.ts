import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET

// Refresh a bit before Google's 1h expiry so a reconnect never sends a stale token
const REFRESH_MARGIN_SECONDS = 5 * 60

// The Google ID token is what the client sends to SpacetimeDB: the server verifies
// it and derives the player identity from it (see clientConnected in the module).
async function refreshGoogleIdToken(refreshToken: string) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId ?? "",
            client_secret: clientSecret ?? "",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    })
    const data = await response.json()
    if (!response.ok || typeof data.id_token !== "string") {
        throw new Error(data.error_description || data.error || "Google token refresh failed")
    }
    return {
        idToken: data.id_token as string,
        expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId,
            clientSecret,
            // offline + consent: Google only returns a refresh token this way
            authorization: { params: { access_type: "offline", prompt: "consent" } },
        })
    ],
    callbacks: {
        async jwt({ token, account }) {
            // First sign-in: keep Google's tokens
            if (account) {
                return {
                    ...token,
                    idToken: account.id_token,
                    expiresAt: account.expires_at,
                    refreshToken: account.refresh_token,
                    error: undefined,
                }
            }

            const now = Math.floor(Date.now() / 1000)
            if (token.expiresAt && now < token.expiresAt - REFRESH_MARGIN_SECONDS) {
                return token
            }
            if (!token.refreshToken) {
                return { ...token, error: "RefreshTokenMissing" as const }
            }

            try {
                const refreshed = await refreshGoogleIdToken(token.refreshToken)
                return { ...token, ...refreshed, error: undefined }
            } catch (err) {
                console.error("[auth] Google token refresh failed", err)
                return { ...token, error: "RefreshTokenError" as const }
            }
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub ?? ""
            }
            session.idToken = token.idToken
            session.error = token.error
            return session
        },
    },
})
