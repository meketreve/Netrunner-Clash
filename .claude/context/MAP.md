---
updated: 2026-10-29
tier: 2
---

# Mapa do projeto

<!-- TETO: 60 linhas FORA do bloco auto (o bloco é do script e não conta). O `git log` guarda o resto. -->

## Comandos

Sem scripts na raiz; cada pacote tem o seu. Banco: `royal-oil-0688` em `maincloud` (`spacetime.local.json`, gitignored).
- Front (de `client/`): `npm install`, `npm run dev` (localhost:3000), `npm run build`, `npm run lint`
- Módulo (de `spacetimedb/`): `npm install` (só tipos; sem script de build — quem compila é o CLI)
- Publicar módulo (raiz): `spacetime publish --server maincloud royal-oil-0688` (lê `module-path` de `spacetime.json`)
- Bindings após mudar schema/reducer: `spacetime generate --lang typescript --out-dir client/src/module_bindings`
- Deploy do front: push em `main` → Vercel builda `client/`
- Env do front: `client/.env.local` (ver LEARNINGS [env])

<!-- auto:start -->
gerado em: 2026-10-29

primeiro nível:

```
client
README.md
spacetimedb
spacetime.json
```
<!-- auto:end -->

## Onde fica cada coisa

- `spacetimedb/src/index.ts` — entrada do módulo: só re-exporta schema + reducers (reducer novo tem que ser exportado aqui)
- `spacetimedb/src/schema.ts` — tabelas; `player`/`cardInstance`/`disconnectTimer` são PRIVADAS (client lê via views)
- `spacetimedb/src/views.ts` — `public_player` (sem email), `my_player`, `my_cards` (esconde baralhos e a mão do oponente)
- `spacetimedb/src/game-logic.ts` — reducers de partida: playCard, attack, useHack, applyBuff, endPhase, endTurn, forfeit
- `spacetimedb/src/matchmaking.ts` — login (valida JWT Google em clientConnected, `GOOGLE_CLIENT_ID`), fila, desconexão com 30s de tolerância (`forfeitOnDisconnect` agendado)
- `spacetimedb/src/cards.ts` — `CARD_DEFS` (20 cartas) e `DEFAULT_DECK`; `game-utils.ts` = helpers
- `client/src/module_bindings/` — GERADO pelo `spacetime generate`; não editar à mão
- `client/src/components/SpacetimeProvider.tsx` — tela de login + conexão com o `id_token` Google (só em `/game`)
- `client/src/lib/spacetimedb.ts` — URI e nome do banco
- `client/src/auth.ts` + `types/next-auth.d.ts` — NextAuth v5: guarda e renova o `id_token` Google na sessão
- `client/src/components/GameBoard.tsx` — tela da partida (maior componente); `CollectionScreen.tsx`, `TutorialSystem.tsx`, `GameToast.tsx`
- `client/src/lib/card-data.ts` — dados de carta do lado do cliente (espelha `cards.ts`)

## Pontos de entrada e fluxos principais

- `/game` → login Google (NextAuth) → `SpacetimeProvider` conecta com o `id_token` → `clientConnected` valida iss/aud e registra o player (identidade = conta Google)
- Home `app/page.tsx` → `/game` → `joinQueue` → matchmaking pareia e cria `game` + mãos iniciais (4 cartas)
- Turno: Recharge → Main → Combat → End; ações = reducers de `game-logic.ts`; cliente lê `game`/`gameLog` + views
- Mudou schema/reducer → `spacetime publish` → `spacetime generate` → ajustar `client/`
