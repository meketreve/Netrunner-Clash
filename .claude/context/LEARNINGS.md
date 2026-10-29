---
updated: 2026-10-29
tier: 2
---

# Aprendizados

<!-- TETO: 100 linhas fora de blocos auto. Uma linha por fato, formato grepável: `- [AAAA-MM-DD] [tag] fato — consequência`.
     O que foi tentado ou decidido leva veredito depois da tag: [✓] testado e mantido, [✗] tentado e descartado (nunca apagar), [↻ AAAA-MM-DD] substituído pela entrada dessa data. -->

## Pegadinhas (versão, API, CI)

- [2026-10-03] [env] [↻ 2026-10-29] README pedia `SPACETIMEDB_DB_NAME`/`SPACETIMEDB_HOST`, mas o código lê `NEXT_PUBLIC_SPACETIMEDB_URI`/`NEXT_PUBLIC_SPACETIMEDB_MODULE` — README corrigido
- [2026-10-03] [env] `auth.ts` aceita `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` ou `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — qualquer par serve
- [2026-10-03] [spacetime] `client/src/module_bindings/` é gerado — mudar schema sem `spacetime generate` deixa o cliente com tipos velhos
- [2026-10-03] [versão] Next 16.1 + React 19.2 + NextAuth 5 beta + SDK spacetimedb 2.0 — conferir breaking changes antes de atualizar
- [2026-10-29] [spacetime] SDK 2.13 não aceita bindings gerados pela CLI antiga (`IndexOpts` exige `accessor`) — subir a SDK exige `spacetime generate` com a CLI da mesma versão
- [2026-10-29] [spacetime] CLI 2.13 faz typecheck e EXECUTA o módulo para extrair o schema — erro de tipo ou `setInterval` no topo do módulo trava generate/publish
- [2026-10-29] [spacetime] `throw new Error` em reducer vira PANIC e o client recebe só "fatal error" — usar `SenderError` para erro do jogador
- [2026-10-29] [spacetime] reducer chamado do client devolve Promise (SDK 2.x) — try/catch síncrono não pega a falha
- [2026-10-29] [spacetime] chamada HTTP (`/call`, `/sql`) dispara clientConnected/Disconnected a cada request — teste de fila precisa de WebSocket (SDK), não HTTP
- [2026-10-29] [spacetime] trocar tabela de pública para privada é migração automática, mas pede `--yes=break-clients` (todos desconectam)
- [2026-10-29] [teste] playtest local: `spacetime start --in-memory -l 127.0.0.1:3100` + cópia do módulo com `GOOGLE_ISSUERS=['localhost']`, aud `spacetimedb` (tokens de `POST /v1/identity`)

## Decisões e o porquê

- [2026-04-24] [ranking] [✗] página de ranking no front — removida em a152d5c
- [2026-10-29] [ranking] [✗] reducers de ranking — reducer não devolve dado ao client; apagados (lobby faz top 5 via `public_player`)
- [2026-10-29] [perf] [✗] camada de performance (cache, pool, batcher) — cache entre reducers devolvia cartas mortas e `setInterval` não existe no runtime; apagada
- [2026-10-29] [auth] [✓] id_token Google como token do SpacetimeDB; servidor só registra player com iss Google + aud = nosso client ID — conexões sem isso (ex.: CLI do dono) entram mas não jogam
- [2026-10-29] [auth] [✓] jogadores anônimos antigos descartados (começar do zero) — `googleId` antigo vinha do client e nunca foi verificado
- [2026-03-05] [registro] [✓] auto-registro do player via `clientConnected` no servidor (9650ba4) — chamadas do cliente geravam duplicatas
