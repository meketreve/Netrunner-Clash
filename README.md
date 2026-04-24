# Netrunner Clash

Turn-based cyberpunk card game with real-time multiplayer via SpacetimeDB.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Real-time sync | SpacetimeDB SDK 2.0 |
| Auth | NextAuth v5 + Google OAuth |
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
│       ├── schema.ts        # Tables: player, game, cardInstance, gameLog
│       ├── cards.ts         # 20 card definitions with effects
│       ├── game-logic.ts    # Core game reducers (play, attack, hack)
│       ├── matchmaking.ts   # Queue and game creation
│       └── ranking.ts       # Leaderboard and stats
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

- Node.js 20+
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
SPACETIMEDB_DB_NAME=your-module-name
SPACETIMEDB_HOST=https://maincloud.spacetimedb.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=your-nextauth-secret
```

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

| Table | Key Columns |
|-------|------------|
| `player` | identity (PK), name, wins, losses, isInQueue, isOnline |
| `game` | id (PK), player1, player2, currentTurn, phase, p1Hp, p2Hp, p1Energy, p2Energy, status |
| `cardInstance` | id (PK), gameId, owner, cardDefId, location, fieldSlot, currentHp, currentAtk |
| `gameLog` | id (PK), gameId, turn, eventType, message |

## Key Reducers (SpacetimeDB)

| Reducer | Action |
|---------|--------|
| `joinQueue` | Add player to matchmaking queue |
| `leaveQueue` | Remove from queue |
| `playCard` | Move card from hand to field |
| `attackWithCard` | Unit attacks opponent unit or player |
| `useHack` | Cast instant spell card |
| `applyBuff` | Apply buff card to a unit |
| `endPhase` | Advance turn phase |
| `forfeit` | Concede current game |

## Deploy

Push to `main` — Vercel auto-deploys the `client/` directory.

SpacetimeDB module deploy:

```bash
spacetime publish --server maincloud royal-oil-0688
```
