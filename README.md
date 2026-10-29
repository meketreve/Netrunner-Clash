# Netrunner Clash

Turn-based cyberpunk card game with real-time multiplayer via SpacetimeDB.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Real-time sync | SpacetimeDB SDK 2.13 |
| Auth | NextAuth v5 + Google OAuth (Google ID token is the SpacetimeDB token) |
| Backend/DB | SpacetimeDB (hosted cloud) |
| Deploy | Vercel |

## Project Structure

```
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/             # Next.js App Router pages
│       ├── components/      # React components
│       ├── lib/             # Utilities and config
│       ├── styles/          # CSS modules
│       └── module_bindings/ # Auto-generated SpacetimeDB bindings
├── spacetimedb/             # SpacetimeDB server module
│   └── src/
│       ├── schema.ts        # Tables: player, game, cardInstance, gameLog, disconnectTimer
│       ├── views.ts         # What each client may read (public_player, my_player, my_cards)
│       ├── cards.ts         # 20 card definitions with effects
│       ├── game-logic.ts    # Core game reducers (play, attack, hack)
│       └── matchmaking.ts   # Login, queue, game creation, disconnect grace period
└── spacetime.json           # SpacetimeDB module config
```

## Game Overview

Players queue for a match, get paired automatically, and take turns playing cards in a 1v1 battle. First to reduce opponent HP to 0 wins.

**20 cards across 3 types:**
- **Characters (8)** — Units with ATK/HP that fight on the field
- **Buffs (6)** — Permanent passive effects (Shield, Drain, +ATK, +HP, Stealth)
- **Hacks (6)** — Instant spells (Damage, Draw, Destroy, Revive, Debuff)

**Turn phases:** Recharge → Main → Combat → End

**Resources:** Energy (spend to play cards, max increases each turn), HP (start 20)

**Keywords:** `taunt`, `bypass`, `priority`, `shield`, `drain`, `overload`

## Local Development

### Prerequisites

- Node.js 24+
- [SpacetimeDB CLI](https://spacetimedb.com/install)
- Google OAuth credentials

### Setup

```bash
# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../spacetimedb && npm install
```

Create `client/.env.local`:

```env
# Optional — defaults to maincloud / royal-oil-0688
NEXT_PUBLIC_SPACETIMEDB_URI=wss://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIMEDB_MODULE=your-module-name
# Google OAuth (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET also work)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=your-nextauth-secret
```

The module only registers players whose Google ID token was issued to the client ID
hard-coded in `spacetimedb/src/matchmaking.ts` (`GOOGLE_CLIENT_ID`). Using another
OAuth client means changing that constant and republishing the module.

### Run

```bash
# Frontend (from /client)
npm run dev

# Deploy/update SpacetimeDB module
spacetime publish --server maincloud your-module-name

# Regenerate TypeScript bindings after schema changes
spacetime generate --lang typescript --out-dir client/src/module_bindings
```

Frontend runs at `http://localhost:3000`.

## Database Schema

| Table | Access | Key Columns |
|-------|--------|------------|
| `player` | private | identity (PK), name, email, googleId, wins, losses, isInQueue, isOnline |
| `game` | public | id (PK), player1, player2, currentTurn, phase, p1Hp, p2Hp, p1Energy, p2Energy, status |
| `cardInstance` | private | id (PK), gameId (index), owner, cardDefId, location, fieldSlot, currentHp, maxHp |
| `gameLog` | public | id (PK), gameId, turn, eventType, message |
| `disconnectTimer` | private | scheduled forfeit 30s after a player drops mid-game |

Clients read the private tables only through views: `public_player` (no email),
`my_player` (own profile) and `my_cards` (own hand/field/graveyard + opponent's
field/graveyard; decks and the opponent's hand are never sent).

## Key Reducers (SpacetimeDB)

| Reducer | Action |
|---------|--------|
| `joinQueue` | Add player to matchmaking queue |
| `leaveQueue` | Remove from queue |
| `playCard` | Move card from hand to field |
| `attack` | Unit attacks opponent unit or player |
| `useHack` | Cast instant spell card |
| `applyBuff` | Apply buff card to a unit |
| `endPhase` | Advance turn phase |
| `endTurn` | Pass the turn |
| `forfeit` | Concede current game |
| `setPlayerName` | Rename (1–20 chars) |

## Deploy

Push to `main` — Vercel auto-deploys the `client/` directory.

SpacetimeDB module deploy:

```bash
spacetime publish --server maincloud royal-oil-0688
```
