---
updated: 2026-10-29
tier: 2
---

# Aprendizados

<!-- TETO: 100 linhas fora de blocos auto. Uma linha por fato, formato grepável: `- [AAAA-MM-DD] [tag] fato — consequência`.
     O que foi tentado ou decidido leva veredito depois da tag: [✓] testado e mantido, [✗] tentado e descartado (nunca apagar), [↻ AAAA-MM-DD] substituído pela entrada dessa data. -->

## Pegadinhas (versão, API, CI)

- [2026-10-03] [env] README pede `SPACETIMEDB_DB_NAME`/`SPACETIMEDB_HOST`, mas o código lê `NEXT_PUBLIC_SPACETIMEDB_URI`/`NEXT_PUBLIC_SPACETIMEDB_MODULE` (fallback `royal-oil-0688`) — variáveis do README não têm efeito
- [2026-10-03] [env] `auth.ts` aceita `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` ou `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — qualquer par serve
- [2026-10-03] [spacetime] `client/src/module_bindings/` é gerado — mudar schema sem `spacetime generate` deixa o cliente com tipos velhos
- [2026-10-03] [versão] Next 16.1 + React 19.2 + NextAuth 5 beta + SDK spacetimedb 2.0 — conferir breaking changes antes de atualizar

## Decisões e o porquê

- [2026-04-24] [ranking] [✗] página de ranking no front — removida em a152d5c; reducers continuam em `ranking.ts`
- [2026-03-05] [registro] [✓] auto-registro do player via `clientConnected` no servidor (9650ba4) — chamadas do cliente geravam duplicatas
