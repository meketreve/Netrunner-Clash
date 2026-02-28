// ============================================================
// Card visual data for the frontend (mirrors server cards.ts)
// ============================================================

export type CardType = 'character' | 'buff' | 'hack';
export type Keyword = 'taunt' | 'bypass' | 'priority' | 'shield' | 'drain' | 'overload';

export interface CardVisual {
    id: number;
    name: string;
    type: CardType;
    cost: number;
    atk: number;
    hp: number;
    keywords: Keyword[];
    description: string;
    flavor: string;
    color: string; // Cor da borda neon
}

export const CARDS: Record<number, CardVisual> = {
    1: { id: 1, name: 'Chrome Sentinel', type: 'character', cost: 2, atk: 2, hp: 3, keywords: [], description: 'Unidade básica.', flavor: 'O primeiro programa que todo netrunner aprende a compilar.', color: '#00f0ff' },
    2: { id: 2, name: 'Neural Hacker', type: 'character', cost: 3, atk: 1, hp: 2, keywords: [], description: 'Ao entrar: compra 1 carta.', flavor: 'Ela convence sistemas a abrir a porta.', color: '#00ff88' },
    3: { id: 3, name: 'Cyber Ronin', type: 'character', cost: 4, atk: 4, hp: 3, keywords: ['priority'], description: 'Priority — Ataca primeiro.', flavor: 'Sua lâmina corta mais rápido que o lag.', color: '#ff8800' },
    4: { id: 4, name: 'Neon Medic', type: 'character', cost: 3, atk: 0, hp: 4, keywords: [], description: 'Início turno: cura 1 HP aliado.', flavor: 'Os melhores médicos nunca tiveram licença.', color: '#00ff88' },
    5: { id: 5, name: 'Viral Wraith', type: 'character', cost: 5, atk: 3, hp: 5, keywords: [], description: 'Ao destruir inimigo: +1 ATK.', flavor: 'Cada kill o torna mais faminto.', color: '#ff00aa' },
    6: { id: 6, name: 'Data Golem', type: 'character', cost: 6, atk: 2, hp: 8, keywords: ['taunt'], description: 'Taunt — Deve ser atacado primeiro.', flavor: 'Uma muralha de código puro.', color: '#00f0ff' },
    7: { id: 7, name: 'Ghost Runner', type: 'character', cost: 3, atk: 3, hp: 2, keywords: ['bypass'], description: 'Bypass — Ataca direto o jogador.', flavor: 'Você não viu ela entrar.', color: '#ff00aa' },
    8: { id: 8, name: 'Overclocked Brute', type: 'character', cost: 4, atk: 2, hp: 4, keywords: ['overload'], description: 'Overload — +2 ATK se energia ≤ 3.', flavor: 'Funciona melhor sob pressão.', color: '#f0e000' },
    9: { id: 9, name: 'Overclock', type: 'buff', cost: 1, atk: 0, hp: 0, keywords: [], description: '+2 ATK neste turno.', flavor: 'Velocidade além do limite.', color: '#f0e000' },
    10: { id: 10, name: 'Firewall', type: 'buff', cost: 2, atk: 0, hp: 0, keywords: [], description: '+3 HP permanente.', flavor: 'A melhor defesa é um firewall invisível.', color: '#00f0ff' },
    11: { id: 11, name: 'Stealth Mode', type: 'buff', cost: 2, atk: 0, hp: 0, keywords: [], description: 'Stealth por 1 turno.', flavor: 'Desaparece do radar.', color: '#8888aa' },
    12: { id: 12, name: 'Neural Link', type: 'buff', cost: 3, atk: 0, hp: 0, keywords: [], description: '+2 ATK e +2 HP permanente.', flavor: 'Dor é apenas informação.', color: '#ff00aa' },
    13: { id: 13, name: 'Shield Protocol', type: 'buff', cost: 2, atk: 0, hp: 0, keywords: [], description: 'Concede Shield ao alvo.', flavor: 'O primeiro golpe é grátis.', color: '#00f0ff' },
    14: { id: 14, name: 'Drain Module', type: 'buff', cost: 3, atk: 0, hp: 0, keywords: [], description: 'Concede Drain ao alvo.', flavor: 'Rouba energia vital do oponente.', color: '#00ff88' },
    15: { id: 15, name: 'EMP Burst', type: 'hack', cost: 2, atk: 0, hp: 0, keywords: [], description: '2 DMG a todos inimigos.', flavor: 'O pulso não faz distinção.', color: '#f0e000' },
    16: { id: 16, name: 'System Crash', type: 'hack', cost: 3, atk: 0, hp: 0, keywords: [], description: 'Destrói 1 inimigo com ≤3 HP.', flavor: 'Erro fatal. Sem backup.', color: '#ff2244' },
    17: { id: 17, name: 'Data Leak', type: 'hack', cost: 1, atk: 0, hp: 0, keywords: [], description: 'Compra 2 cartas.', flavor: 'Informação é poder.', color: '#00ff88' },
    18: { id: 18, name: 'Reboot', type: 'hack', cost: 4, atk: 0, hp: 0, keywords: [], description: 'Revive 1 aliado com 1 HP.', flavor: 'Todo programa merece uma segunda chance.', color: '#00f0ff' },
    19: { id: 19, name: 'Glitch', type: 'hack', cost: 2, atk: 0, hp: 0, keywords: [], description: '-2 ATK em 1 inimigo.', flavor: 'Um glitch bem colocado é mortal.', color: '#ff00aa' },
    20: { id: 20, name: 'Virus Inject', type: 'hack', cost: 3, atk: 0, hp: 0, keywords: [], description: '3 DMG a 1 inimigo.', flavor: 'O vírus se espalha antes que perceba.', color: '#ff2244' },
};

export function getCardVisual(id: number): CardVisual {
    return CARDS[id] || { id: 0, name: '???', type: 'character' as CardType, cost: 0, atk: 0, hp: 0, keywords: [], description: '', flavor: '', color: '#555' };
}
