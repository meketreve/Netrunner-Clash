---
updated: 2026-10-29
tier: 2
---

# Status — tier 2+

<!-- TETO: 60 linhas FORA do bloco auto (o bloco é do script e não conta). Resumir "Concluído" quando crescer. -->

## Estado atual

Projeto de teste PARADO desde 2026-04-24 (último commit 28b60a3, README novo). Jogo de cartas 1v1
"Netrunner Clash" jogável: matchmaking, partida, coleção e tutorial. Ranking removido do front em a152d5c.

## Próxima fase

Nenhuma definida. Ao retomar: `cd client && npm install && npm run build` e conferir se o módulo
`royal-oil-0688` ainda existe no maincloud → verify: build passa e `npm run dev` conecta e entra na fila.

## Pendências e bloqueios

- Decidir se `ranking.ts` (reducers sem tela) e a camada de performance ficam ou saem

## Bruto do git (auto — não editar)

<!-- auto:start -->
data: 2026-10-29

```
aab2218 chore: contexto do projeto e AGENTS.md
28b60a3 new readme.md
a152d5c feat: remove ranking page and cleanup home page and tutorial references
4b63081 build: update .gitignore with standard patterns for tools, build artifacts, and logs
52138d0 fix: show latest game result after forfeit, reposition forfeit button to avoid overlap
d6f39df style: center card name, increase description and flavor text sizes in collection
285c100 fix: add missing CSS imports to CollectionScreen for standalone rendering
f2cc3d8 fix: Resolve TypeScript compilation error in ranking page
--- status ---
 M .claude/context/LEARNINGS.md
 M .claude/context/MAP.md
 M .claude/context/STATUS.md
```
<!-- auto:end -->
