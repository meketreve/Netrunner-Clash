---
updated: 2026-10-29
tier: 2
---

# Status — tier 2+

<!-- TETO: 60 linhas FORA do bloco auto (o bloco é do script e não conta). Resumir "Concluído" quando crescer. -->

## Estado atual

2026-10-29: login Google virou identidade real (OIDC), tabelas sensíveis privadas + views, bugs de partida
corrigidos, perf layer e ranking apagados, CI criado, deps no último minor (SDK spacetimedb 2.13).
Servidor validado em SpacetimeDB local com playtest de 2 jogadores; login Google real não testado aqui.

## Próxima fase

Testar no ar: em client-gamma-mauve.vercel.app, logar com Google em dois navegadores e jogar uma partida
→ verify: mesmo jogador em dois dispositivos, sem email no devtools, desconexão dá 30s de tolerância.

## Pendências e bloqueios

- Reconectar depois de 1h na mesma aba usa o token antigo (expirado): o jogador precisa recarregar a página
- Duas abas da mesma conta: fechar uma marca o jogador offline e inicia a contagem de desistência

## Bruto do git (auto — não editar)

<!-- auto:start -->
data: 2026-10-29

```
f15d437 build: atualiza SDK spacetimedb para 2.13 e regenera bindings
8045ce9 fix: corrige bugs de partida e atualiza dependências
1b5936a chore: atualiza contexto do projeto
aab2218 chore: contexto do projeto e AGENTS.md
28b60a3 new readme.md
a152d5c feat: remove ranking page and cleanup home page and tutorial references
4b63081 build: update .gitignore with standard patterns for tools, build artifacts, and logs
52138d0 fix: show latest game result after forfeit, reposition forfeit button to avoid overlap
--- status ---
 M .claude/context/LEARNINGS.md
 M .claude/context/MAP.md
 M .claude/context/STATUS.md
 M README.md
 M client/eslint.config.mjs
 M client/src/app/game/page.tsx
 M client/src/app/layout.tsx
 M client/src/app/page.tsx
 M client/src/auth.ts
 M client/src/components/CollectionScreen.tsx
... +35
```
<!-- auto:end -->
