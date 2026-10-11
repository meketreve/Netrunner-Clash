---
updated: 2026-10-03
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
gerado em: 2026-10-03

primeiro nível:

```
client
docs
README.md
spacetimedb
spacetime.json
src
```
<!-- auto:end -->

## Onde fica cada coisa

- `spacetimedb/src/index.ts` — entrada do módulo: só re-exporta schema + reducers (reducer novo tem que ser exportado aqui)
- `spacetimedb/src/schema.ts` — tabelas `player`, `game`, `cardInstance`, `gameLog` (export default)
- `spacetimedb/src/game-logic.ts` — reducers de partida: playCard, attack, useHack, applyBuff, endPhase, endTurn, forfeit
- `spacetimedb/src/matchmaking.ts` — registerPlayer, joinQueue/leaveQueue, clientConnected/Disconnected, perfil/tutorial
- `spacetimedb/src/cards.ts` — `CARD_DEFS` (20 cartas) e `DEFAULT_DECK`; `game-utils.ts` = helpers
- `spacetimedb/src/ranking.ts` — reducers de ranking (página do front foi removida em a152d5c)
- `spacetimedb/src/{performance-*,connection-pool,message-batcher,query-optimizer,asset-manager}.ts` — camada de "performance" fora do fluxo principal do jogo
- `client/src/module_bindings/` — GERADO pelo `spacetime generate`; não editar à mão
- `client/src/components/SpacetimeProvider.tsx` — conexão (URI + nome do banco) e token
- `client/src/lib/spacetimedb.ts` — config da conexão + token em localStorage
- `client/src/auth.ts` + `app/api/auth/[...nextauth]/route.ts` — NextAuth v5 com Google
- `client/src/components/GameBoard.tsx` — tela da partida (maior componente); `CollectionScreen.tsx`, `TutorialSystem.tsx`, `GameToast.tsx`
- `client/src/lib/card-data.ts` — dados de carta do lado do cliente (espelha `cards.ts`)
- `src/module_bindings/` e `docs/` na raiz — pastas vazias, não versionadas

## Pontos de entrada e fluxos principais

- Login Google (NextAuth) → `SpacetimeProvider` conecta no maincloud → `clientConnected` registra o player
- Home `app/page.tsx` → `/game` → `joinQueue` → matchmaking pareia e cria `game` + mãos iniciais (4 cartas)
- Turno: Recharge → Main → Combat → End; ações = reducers de `game-logic.ts`; cliente reage às tabelas assinadas
- Mudou schema/reducer → `spacetime publish` → `spacetime generate` → ajustar `client/`
