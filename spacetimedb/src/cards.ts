// ============================================================
// NETRUNNER CLASH — Card Definitions (20 cards MVP)
// ============================================================

export type CardType = 'character' | 'buff' | 'hack';

export type Keyword =
    | 'taunt'
    | 'bypass'
    | 'priority'
    | 'shield'
    | 'drain'
    | 'overload';

export type EffectTrigger =
    | 'on_enter'    // Quando entra no campo
    | 'on_destroy'  // Quando é destruído
    | 'on_turn_start' // No início do turno do dono
    | 'on_attack'   // Quando ataca
    | 'passive'     // Contínuo enquanto no campo
    | 'instant';    // Efeito imediato (hacks)

export interface CardEffect {
    trigger: EffectTrigger;
    description: string;
    // Efeitos codificados como ações
    action: string;
    value?: number;
}

export interface CardDef {
    id: number;
    name: string;
    type: CardType;
    cost: number;
    atk: number;
    hp: number;
    keywords: Keyword[];
    effect: CardEffect | null;
    description: string;
    flavor: string;
}

// ============================================================
// 8 PERSONAGENS (Characters)
// ============================================================

export const CARD_DEFS: CardDef[] = [
    // --- PERSONAGENS ---
    {
        id: 1,
        name: 'Chrome Sentinel',
        type: 'character',
        cost: 2,
        atk: 2,
        hp: 3,
        keywords: [],
        effect: null,
        description: 'Unidade básica. Sem habilidades especiais.',
        flavor: 'O primeiro programa que todo netrunner aprende a compilar.',
    },
    {
        id: 2,
        name: 'Neural Hacker',
        type: 'character',
        cost: 3,
        atk: 1,
        hp: 2,
        keywords: [],
        effect: {
            trigger: 'on_enter',
            description: 'Ao entrar no campo: compra 1 carta.',
            action: 'draw',
            value: 1,
        },
        description: 'Ao entrar: compra 1 carta.',
        flavor: 'Ela não invade sistemas — ela os convence a abrir a porta.',
    },
    {
        id: 3,
        name: 'Cyber Ronin',
        type: 'character',
        cost: 4,
        atk: 4,
        hp: 3,
        keywords: ['priority'],
        effect: null,
        description: 'Priority — Ataca primeiro em combate.',
        flavor: 'Sua lâmina corta mais rápido que o lag permite.',
    },
    {
        id: 4,
        name: 'Neon Medic',
        type: 'character',
        cost: 3,
        atk: 0,
        hp: 4,
        keywords: [],
        effect: {
            trigger: 'on_turn_start',
            description: 'Início do turno: cura 1 HP de um aliado.',
            action: 'heal_ally',
            value: 1,
        },
        description: 'Início do turno: cura 1 HP de um aliado.',
        flavor: 'Os melhores médicos do submundo nunca tiveram licença.',
    },
    {
        id: 5,
        name: 'Viral Wraith',
        type: 'character',
        cost: 5,
        atk: 3,
        hp: 5,
        keywords: [],
        effect: {
            trigger: 'on_destroy',
            description: 'Ao destruir inimigo: ganha +1 ATK permanente.',
            action: 'self_buff_atk',
            value: 1,
        },
        description: 'Ao destruir inimigo: +1 ATK permanente.',
        flavor: 'Cada kill o torna mais faminto.',
    },
    {
        id: 6,
        name: 'Data Golem',
        type: 'character',
        cost: 6,
        atk: 2,
        hp: 8,
        keywords: ['taunt'],
        effect: null,
        description: 'Taunt — Inimigos devem atacar esta carta primeiro.',
        flavor: 'Uma muralha de código puro. Boa sorte tentando passar.',
    },
    {
        id: 7,
        name: 'Ghost Runner',
        type: 'character',
        cost: 3,
        atk: 3,
        hp: 2,
        keywords: ['bypass'],
        effect: null,
        description: 'Bypass — Pode atacar o jogador diretamente.',
        flavor: 'Você não viu ela entrar. Nem vai ver ela sair.',
    },
    {
        id: 8,
        name: 'Overclocked Brute',
        type: 'character',
        cost: 4,
        atk: 2,
        hp: 4,
        keywords: ['overload'],
        effect: null,
        description: 'Overload — +2 ATK quando energia ≤ 3.',
        flavor: 'Funciona melhor sob pressão. Tipo todo mundo na periferia.',
    },

    // ============================================================
    // 6 BUFFS / UPGRADES
    // ============================================================
    {
        id: 9,
        name: 'Overclock',
        type: 'buff',
        cost: 1,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: '+2 ATK no turno atual.',
            action: 'temp_buff_atk',
            value: 2,
        },
        description: '+2 ATK neste turno.',
        flavor: 'Velocidade de clock além do limite. Vai queimar, mas vai brilhar.',
    },
    {
        id: 10,
        name: 'Firewall',
        type: 'buff',
        cost: 2,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: '+3 HP permanente.',
            action: 'perm_buff_hp',
            value: 3,
        },
        description: '+3 HP permanente.',
        flavor: 'A melhor defesa é um firewall que ninguém sabe que existe.',
    },
    {
        id: 11,
        name: 'Stealth Mode',
        type: 'buff',
        cost: 2,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Não pode ser alvo por 1 turno.',
            action: 'stealth',
            value: 1,
        },
        description: 'Stealth por 1 turno.',
        flavor: 'Desaparece do radar. O inimigo ataca o vazio.',
    },
    {
        id: 12,
        name: 'Neural Link',
        type: 'buff',
        cost: 3,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: '+2 ATK e +2 HP permanente.',
            action: 'perm_buff_both',
            value: 2,
        },
        description: '+2 ATK e +2 HP permanente.',
        flavor: 'Conexão neural direta. Dor é apenas informação.',
    },
    {
        id: 13,
        name: 'Shield Protocol',
        type: 'buff',
        cost: 2,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Concede Shield — ignora o primeiro dano.',
            action: 'grant_shield',
        },
        description: 'Concede Shield ao alvo.',
        flavor: 'O primeiro golpe é grátis. Os outros não.',
    },
    {
        id: 14,
        name: 'Drain Module',
        type: 'buff',
        cost: 3,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Concede Drain — cura jogador ao causar dano.',
            action: 'grant_drain',
        },
        description: 'Concede Drain ao alvo.',
        flavor: 'Rouba energia vital do oponente. Elegante.',
    },

    // ============================================================
    // 6 HACKS (Instant Spells)
    // ============================================================
    {
        id: 15,
        name: 'EMP Burst',
        type: 'hack',
        cost: 2,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Causa 2 de dano a todos os inimigos no campo.',
            action: 'damage_all_enemies',
            value: 2,
        },
        description: '2 de dano a todos inimigos.',
        flavor: 'O pulso eletromagnético não faz distinção.',
    },
    {
        id: 16,
        name: 'System Crash',
        type: 'hack',
        cost: 3,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Destrói 1 carta inimiga com 3 HP ou menos.',
            action: 'destroy_low_hp',
            value: 3,
        },
        description: 'Destrói 1 inimigo com ≤3 HP.',
        flavor: 'Erro fatal. Sem backup. Sem recuperação.',
    },
    {
        id: 17,
        name: 'Data Leak',
        type: 'hack',
        cost: 1,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Compra 2 cartas.',
            action: 'draw',
            value: 2,
        },
        description: 'Compra 2 cartas.',
        flavor: 'Informação é poder. Poder é tudo.',
    },
    {
        id: 18,
        name: 'Reboot',
        type: 'hack',
        cost: 4,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Revive 1 personagem do descarte com 1 HP.',
            action: 'revive',
            value: 1,
        },
        description: 'Revive 1 aliado do descarte com 1 HP.',
        flavor: 'Todo programa merece uma segunda chance.',
    },
    {
        id: 19,
        name: 'Glitch',
        type: 'hack',
        cost: 2,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Reduz ATK de 1 inimigo em 2 por 1 turno.',
            action: 'debuff_atk',
            value: 2,
        },
        description: '-2 ATK em 1 inimigo neste turno.',
        flavor: 'Um glitch bem colocado é mais mortal que uma bala.',
    },
    {
        id: 20,
        name: 'Virus Inject',
        type: 'hack',
        cost: 3,
        atk: 0,
        hp: 0,
        keywords: [],
        effect: {
            trigger: 'instant',
            description: 'Causa 3 de dano a 1 carta inimiga.',
            action: 'damage_single',
            value: 3,
        },
        description: '3 de dano a 1 inimigo.',
        flavor: 'O vírus se espalha antes que você perceba.',
    },
];

// Helper: buscar carta por ID
export function getCardDef(id: number): CardDef {
    const card = CARD_DEFS.find((c) => c.id === id);
    if (!card) throw new Error(`Card not found: ${id}`);
    return card;
}

// IDs do deck padrão (20 cartas: 2 cópias de 10 cartas selecionadas)
export const DEFAULT_DECK: number[] = [
    1, 1, // Chrome Sentinel x2
    2, 2, // Neural Hacker x2
    3,    // Cyber Ronin x1
    5,    // Viral Wraith x1
    6,    // Data Golem x1
    7,    // Ghost Runner x1
    8,    // Overclocked Brute x1
    4,    // Neon Medic x1
    9, 9, // Overclock x2
    10,   // Firewall x1
    11,   // Stealth Mode x1
    15,   // EMP Burst x1
    16,   // System Crash x1
    17,   // Data Leak x1
    18,   // Reboot x1
    19,   // Glitch x1
];
