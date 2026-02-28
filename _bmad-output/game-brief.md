# 🃏 NETRUNNER CLASH — Game Brief

> **Card game PvP por turnos com temática cyberpunk**
> Stack: Next.js (Vercel) + SpacetimeDB

---

## 1. Visão Geral

**Netrunner Clash** é um card game PvP por turnos com temática cyberpunk onde dois jogadores se enfrentam usando decks de personagens, habilidades e buffs. Cada jogador possui uma barra de vida (HP) representando sua integridade no mundo digital. O objetivo é reduzir o HP do oponente a zero.

### Premissa Narrativa

No ano de 2087, megacorporações controlam a rede global. **Netrunners** (hackers de elite) se enfrentam em arenas digitais com seus programas de combate — entidades de código vivo que lutam pela supremacia na rede. Cada carta representa um programa, um hack ou um upgrade no arsenal do netrunner.

---

## 2. Mecânicas Core

### 2.1 Estrutura do Jogo

| Elemento | Valor |
|---|---|
| **HP do Jogador** | 20 pontos |
| **Tamanho do Deck** | 20 cartas |
| **Mão Inicial** | 4 cartas |
| **Compra por Turno** | 1 carta |
| **Slots no Campo** | 4 slots por jogador |
| **Recurso (Energia)** | Começa em 1, +1 por turno (máx. 8) |

### 2.2 Tipos de Cartas

#### 🟦 Personagem (Programa)
Cartas que vão ao campo de batalha. Possuem:
- **Custo de Energia** — Quanto custa invocar
- **ATK** (Ataque) — Dano que causa ao atacar
- **HP** (Vida) — Quanto aguenta antes de ser destruído
- **Habilidade Passiva** (opcional) — Efeito contínuo enquanto estiver vivo
- **Habilidade Ativa** (opcional) — Efeito que se ativa sob condição específica

| Exemplo | Custo | ATK | HP | Habilidade |
|---|---|---|---|---|
| **Chrome Sentinel** | 2 | 2 | 3 | — |
| **Neural Hacker** | 3 | 1 | 2 | Ao entrar: compra 1 carta |
| **Cyber Ronin** | 4 | 4 | 3 | Ataca primeiro (prioridade) |
| **Neon Medic** | 3 | 0 | 4 | Início do turno: cura 1 HP de um aliado |
| **Viral Wraith** | 5 | 3 | 5 | Ao destruir inimigo: ganha +1 ATK permanente |
| **Data Golem** | 6 | 2 | 8 | **Taunt** — deve ser atacado primeiro |

#### 🟩 Buff / Upgrade
Aplicados em personagens no campo. Persistem até a carta ser destruída.
- **Overclock** (1 energia) — +2 ATK no turno atual
- **Firewall** (2 energia) — +3 HP permanente
- **Stealth Mode** (2 energia) — Não pode ser alvo de ataques por 1 turno
- **Neural Link** (3 energia) — Copia a habilidade passiva de outro aliado

#### 🟥 Hack (Magia Instantânea)
Efeito imediato, descartada após uso.
- **EMP Burst** (2 energia) — Causa 2 de dano a todos os inimigos no campo
- **System Crash** (3 energia) — Destrói 1 carta inimiga com 3 HP ou menos
- **Data Leak** (1 energia) — Revela 2 cartas da mão do oponente
- **Reboot** (4 energia) — Revive 1 personagem do descarte com 1 HP
- **Glitch** (2 energia) — Reduz o ATK de 1 carta inimiga em 2 por 1 turno

---

## 3. Regras de Gameplay

### 3.1 Estrutura do Turno

Cada turno do jogador ativo segue esta sequência:

```
1. FASE DE RECARGA
   → Ganha +1 energia máxima (até 8)
   → Energia recarrega ao máximo
   → Compra 1 carta do deck

2. FASE PRINCIPAL
   → Pode jogar cartas (personagens, buffs, hacks) gastando energia
   → Pode ativar habilidades ativas de personagens
   → Sem limite de cartas jogadas (limitado pela energia)

3. FASE DE COMBATE
   → Declara ataques com personagens no campo
   → Cada personagem pode atacar UMA vez por turno
   → Personagens recém-invocados NÃO podem atacar (Summoning Sickness)
   → Escolhe alvos: cartas inimigas OU jogador inimigo (se condições permitirem)

4. FASE FINAL
   → Passa o turno para o oponente
```

### 3.2 Sistema de Combate

#### Ataque Direto vs Ataque em Cartas

- **Se o oponente TEM cartas no campo:**
  - O jogador **DEVE** atacar as cartas inimigas primeiro
  - **Exceção:** Cartas com **Taunt** devem ser atacadas antes de qualquer outra carta
  - Personagens com **Bypass** podem ignorar e atacar direto

- **Se o oponente NÃO TEM cartas no campo:**
  - Os ataques vão direto no HP do jogador inimigo

#### Dano em Excesso (Overkill / Overflow)

> 🔥 **Regra Core inspirada em Yu-Gi-Oh:**

Quando um personagem ataca uma carta inimiga e o dano excede o HP restante da carta, o **dano excedente perfura e atinge o HP do jogador inimigo**.

**Exemplo:**
> Cyber Ronin (4 ATK) ataca Chrome Sentinel (1 HP restante)
> → Chrome Sentinel morre
> → 3 de dano excedente → Jogador inimigo toma 3 de dano

#### Campo Vazio — Dano Direto Obrigatório

> 🔥 **Regra Core:**

Se no início da **Fase de Combate** do oponente o jogador não tiver **nenhuma carta no campo**, todas as cartas inimigas atacam o jogador diretamente.

Isso cria urgência para manter o campo protegido e penaliza decks que negligenciam defesa.

### 3.3 Resolução de Combate entre Cartas

Quando uma carta ataca outra:
- **Atacante causa ATK como dano** ao HP da carta defensora
- **Defensora NÃO causa contra-ataque** (como Hearthstone, diferente de Yu-Gi-Oh)
- Se HP da defensora chega a 0 → carta destruída, vai para descarte
- Dano excedente → perfura no jogador

### 3.4 Condições de Vitória

1. **HP do oponente chega a 0** → Vitória
2. **Oponente não pode comprar carta** (deck vazio) → Vitória por *Deck Out*
3. **Oponente desconecta/abandona** → Vitória por *Forfeit*

### 3.5 Regras Especiais

#### Keywords (Palavras-chave)

| Keyword | Efeito |
|---|---|
| **Taunt** | Inimigos devem atacar esta carta primeiro |
| **Bypass** | Pode atacar o jogador mesmo com cartas no campo |
| **Priority** | Ataca primeiro em combate (destrói antes de levar contra-ataque, se houver) |
| **Shield** | Ignora o primeiro dano recebido |
| **Drain** | Ao causar dano, cura o jogador aliado no mesmo valor |
| **Overload** | +2 ATK quando o jogador tem 3 energia ou menos |

#### Limite de Mão
- Máximo de **7 cartas na mão**
- Ao comprar acima do limite, a carta mais antiga é descartada

---

## 4. Fluxo do Jogador

```
[MENU PRINCIPAL]
    ├── 🎮 JOGAR (Matchmaking)
    │     ├── Busca oponente
    │     ├── Prepara campo
    │     └── Partida em tempo real
    ├── 📦 COLEÇÃO
    │     ├── Ver todas as cartas
    │     └── Criar/Editar Decks
    ├── 🏆 RANKING
    │     └── Leaderboard global
    └── ⚙️ CONFIGURAÇÕES
          └── Avatar, nome, som
```

---

## 5. Identidade Visual

### Paleta Cyberpunk
- **Fundo:** Preto profundo (#0a0a0f) com grid neon sutil
- **Primário:** Cyan elétrico (#00f0ff)
- **Secundário:** Magenta neon (#ff00aa)
- **Energia:** Amarelo (#f0e000)
- **Dano:** Vermelho (#ff2244)
- **Cura:** Verde (#00ff88)
- **Cartas:** Fundo escuro com bordas que brilham na cor da raridade

### Tipografia
- **Títulos:** Fonte futurista/tech (ex: Orbitron, Rajdhani)
- **Corpo:** Clean e legível (ex: Inter, Space Grotesk)

### Atmosfera
- Efeitos de glitch sutil nas transições
- Partículas flutuantes de dados
- Som de sintetizador cyberpunk

---

## 6. Stack Técnica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js (App Router) + React |
| **Hospedagem Frontend** | Vercel |
| **Backend + Banco** | SpacetimeDB |
| **Estado em Tempo Real** | SpacetimeDB Subscriptions |
| **Lógica de Jogo** | SpacetimeDB Reducers (Rust) |
| **Auth** | SpacetimeDB Identity |
| **Estilização** | CSS customizado + animações |

### Por que SpacetimeDB?
- **Estado compartilhado em tempo real** — perfeito para PvP
- **Lógica server-side nos Reducers** — anti-cheat nativo (jogador não manipula regras)
- **Subscriptions automáticas** — o frontend recebe updates sem polling
- **Sem backend separado** — DB + servidor em um só

---

## 7. Escopo MVP (v1.0)

### ✅ Incluso no MVP
- [ ] Sistema de matchmaking básico (1v1)
- [ ] 20 cartas únicas (8 personagens, 6 buffs, 6 hacks)
- [ ] Sistema de turnos completo
- [ ] Sistema de energia
- [ ] Sistema de combate com overflow damage
- [ ] Barra de vida do jogador
- [ ] UI do campo de batalha
- [ ] Sistema de deck (deck pré-montado para MVP)
- [ ] Animações básicas de ataque/dano/morte
- [ ] Tela de vitória/derrota

### ❌ Fora do MVP (v2.0+)
- Sistema de ranking/ELO
- Editor de decks
- Mais cartas e expansões
- Sistema de raridade e craft
- Chat in-game
- Efeitos sonoros e música
- Tutorial interativo
- Perfil do jogador com stats
- Modos especiais (draft, arena)

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| SpacetimeDB SDK para JS ainda em evolução | Verificar compatibilidade no início; ter fallback com WebSocket manual |
| Balanceamento de cartas | Poucos cards no MVP; iterar com playtest |
| Latência na experiência PvP | SpacetimeDB é otimizado para real-time; testar cedo |
| Complexidade do frontend de card game | Focar em funcionalidade primeiro, polish depois |

---

> 🧙 **BMad Master:** Este Game Brief define a visão completa do **Netrunner Clash**. Após aprovação, o próximo passo é o **Game Design Document (GDD)** com detalhamento de todas as cartas, balanceamento numérico e especificações de UI.
