// ============================================================
// NETRUNNER CLASH — SpacetimeDB Module
// Single entry point: schema + all reducer exports
// ============================================================
// NOTE: Schema must be defined and exported BEFORE importing
// files that depend on it, to avoid temporal dead zone issues
// with SpacetimeDB's bundler.
// ============================================================

import { schema, table, t } from 'spacetimedb/server';
import { CARD_DEFS, DEFAULT_DECK } from './cards.js';

// ============================================================
// SCHEMA
// ============================================================
const spacetimedb = schema({
    player: table(
        { public: true },
        {
            identity: t.identity({ primaryKey: true }),
            name: t.string(),
            isOnline: t.bool(),
            isInQueue: t.bool(),
            wins: t.u32(),
            losses: t.u32(),
        }
    ),
    game: table(
        { public: true },
        {
            id: t.u64({ autoInc: true, primaryKey: true }),
            player1: t.identity(),
            player2: t.identity(),
            currentTurn: t.identity(),
            turnNumber: t.u32(),
            phase: t.string(),
            p1Hp: t.i32(),
            p2Hp: t.i32(),
            p1Energy: t.u32(),
            p2Energy: t.u32(),
            p1MaxEnergy: t.u32(),
            p2MaxEnergy: t.u32(),
            status: t.string(),
            winnerId: t.string(),
        }
    ),
    cardInstance: table(
        { public: true },
        {
            id: t.u64({ autoInc: true, primaryKey: true }),
            gameId: t.u64(),
            owner: t.identity(),
            cardDefId: t.u32(),
            location: t.string(),
            fieldSlot: t.u32(),
            currentHp: t.i32(),
            currentAtk: t.i32(),
            canAttack: t.bool(),
            hasShield: t.bool(),
            hasDrain: t.bool(),
            stealthTurns: t.u32(),
            tempAtkBuff: t.i32(),
            deckOrder: t.u32(),
        }
    ),
    gameLog: table(
        { public: true },
        {
            id: t.u64({ autoInc: true, primaryKey: true }),
            gameId: t.u64(),
            turn: t.u32(),
            eventType: t.string(),
            message: t.string(),
        }
    ),
});

export default spacetimedb;

// ============================================================
// HELPERS
// ============================================================
function getCardDef(id: number) {
    const card = CARD_DEFS.find((c) => c.id === id);
    if (!card) throw new Error(`Card not found: ${id}`);
    return card;
}

function getGame(ctx: any, gameId: any) {
    for (const g of ctx.db.game.iter()) {
        if (g.id === gameId) return g;
    }
    throw new Error('Game not found');
}

function isMyTurn(ctx: any, game: any) {
    if (game.currentTurn.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your turn');
    if (game.status !== 'active') throw new Error('Game is not active');
}

function getPlayerEnergy(game: any, identity: any): number {
    return identity.toHexString() === game.player1.toHexString() ? game.p1Energy : game.p2Energy;
}

function spendEnergy(game: any, identity: any, cost: number): any {
    const hex = identity.toHexString();
    if (hex === game.player1.toHexString()) {
        if (game.p1Energy < cost) throw new Error('Not enough energy');
        return { ...game, p1Energy: game.p1Energy - cost };
    } else {
        if (game.p2Energy < cost) throw new Error('Not enough energy');
        return { ...game, p2Energy: game.p2Energy - cost };
    }
}

function getFieldCards(ctx: any, gameId: any, ownerHex: string) {
    const cards: any[] = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (card.gameId === gameId && card.owner.toHexString() === ownerHex && card.location === 'field') {
            cards.push(card);
        }
    }
    return cards;
}

function getOpponent(game: any, playerHex: string) {
    return playerHex === game.player1.toHexString() ? game.player2 : game.player1;
}

function damageOpponentHp(game: any, playerHex: string, damage: number): any {
    if (playerHex === game.player1.toHexString()) return { ...game, p2Hp: game.p2Hp - damage };
    return { ...game, p1Hp: game.p1Hp - damage };
}

function healPlayer(game: any, playerHex: string, amount: number): any {
    if (playerHex === game.player1.toHexString()) return { ...game, p1Hp: Math.min(20, game.p1Hp + amount) };
    return { ...game, p2Hp: Math.min(20, game.p2Hp + amount) };
}

function logEvent(ctx: any, gameId: any, turn: number, eventType: string, message: string) {
    ctx.db.gameLog.insert({ id: BigInt(0), gameId, turn, eventType, message });
}

function updatePlayerStats(ctx: any, winner: any, loser: any) {
    const w = ctx.db.player.identity.find(winner);
    const l = ctx.db.player.identity.find(loser);
    if (w) ctx.db.player.identity.update({ ...w, wins: w.wins + 1 });
    if (l) ctx.db.player.identity.update({ ...l, losses: l.losses + 1 });
}

function checkWinCondition(ctx: any, game: any): any {
    let g = { ...game };
    if (g.p1Hp <= 0) {
        g.status = 'finished'; g.winnerId = game.player2.toHexString();
        logEvent(ctx, game.id, game.turnNumber, 'game_end', 'Jogador 2 venceu!');
        updatePlayerStats(ctx, game.player2, game.player1);
    } else if (g.p2Hp <= 0) {
        g.status = 'finished'; g.winnerId = game.player1.toHexString();
        logEvent(ctx, game.id, game.turnNumber, 'game_end', 'Jogador 1 venceu!');
        updatePlayerStats(ctx, game.player1, game.player2);
    }
    return g;
}

function createDeckForPlayer(ctx: any, gameId: any, owner: any) {
    const shuffled = [...DEFAULT_DECK];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < shuffled.length; i++) {
        const def = getCardDef(shuffled[i]);
        ctx.db.cardInstance.insert({
            id: BigInt(0), gameId, owner, cardDefId: def.id,
            location: 'deck', fieldSlot: 0, currentHp: def.hp, currentAtk: def.atk,
            canAttack: false, hasShield: false, hasDrain: false, stealthTurns: 0,
            tempAtkBuff: 0, deckOrder: i,
        });
    }
}

function drawCards(ctx: any, gameId: any, owner: any, count: number) {
    const ownerHex = owner.toHexString();
    const deckCards: any[] = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (card.gameId === gameId && card.owner.toHexString() === ownerHex && card.location === 'deck') {
            deckCards.push(card);
        }
    }
    deckCards.sort((a: any, b: any) => a.deckOrder - b.deckOrder);
    let handSize = 0;
    for (const card of ctx.db.cardInstance.iter()) {
        if (card.gameId === gameId && card.owner.toHexString() === ownerHex && card.location === 'hand') handSize++;
    }
    const drawn = Math.min(count, deckCards.length);
    for (let i = 0; i < drawn; i++) {
        if (handSize + i >= 7) break;
        ctx.db.cardInstance.id.update({ ...deckCards[i], location: 'hand' });
    }
    return drawn;
}

// ============================================================
// MATCHMAKING REDUCERS
// ============================================================

export const registerPlayer = spacetimedb.reducer((ctx: any) => {
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) return;
    ctx.db.player.insert({
        identity: ctx.sender, name: `Netrunner_${ctx.sender.toHexString().slice(0, 6)}`,
        isOnline: true, isInQueue: false, wins: 0, losses: 0,
    });
});

export const setPlayerName = spacetimedb.reducer(
    { name: t.string() },
    (ctx: any, { name }: { name: string }) => {
        const player = ctx.db.player.identity.find(ctx.sender);
        if (!player) throw new Error('Player not registered');
        ctx.db.player.identity.update({ ...player, name });
    }
);

export const joinQueue = spacetimedb.reducer((ctx: any) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new Error('Player not registered');
    if (player.isInQueue) return;
    ctx.db.player.identity.update({ ...player, isInQueue: true });

    let opponent: any = null;
    for (const p of ctx.db.player.iter()) {
        if (p.isInQueue && p.identity.toHexString() !== ctx.sender.toHexString()) { opponent = p; break; }
    }

    if (opponent) {
        const updatedPlayer = ctx.db.player.identity.find(ctx.sender);
        ctx.db.player.identity.update({ ...updatedPlayer, isInQueue: false });
        ctx.db.player.identity.update({ ...opponent, isInQueue: false });

        const game = ctx.db.game.insert({
            id: BigInt(0), player1: ctx.sender, player2: opponent.identity,
            currentTurn: ctx.sender, turnNumber: 1, phase: 'main',
            p1Hp: 20, p2Hp: 20, p1Energy: 1, p2Energy: 0, p1MaxEnergy: 1, p2MaxEnergy: 0,
            status: 'active', winnerId: '',
        });

        createDeckForPlayer(ctx, game.id, ctx.sender);
        createDeckForPlayer(ctx, game.id, opponent.identity);
        drawCards(ctx, game.id, ctx.sender, 4);
        drawCards(ctx, game.id, opponent.identity, 4);
        logEvent(ctx, game.id, 1, 'game_start', `Partida iniciada! ${player.name} vs ${opponent.name}`);
    }
});

export const leaveQueue = spacetimedb.reducer((ctx: any) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new Error('Player not registered');
    ctx.db.player.identity.update({ ...player, isInQueue: false });
});

// ============================================================
// GAME LOGIC REDUCERS
// ============================================================

export const playCard = spacetimedb.reducer(
    { gameId: t.u64(), cardInstanceId: t.u64(), slot: t.u32() },
    (ctx: any, { gameId, cardInstanceId, slot }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Can only play cards in main phase');
        if (slot > 3) throw new Error('Invalid slot');

        const card = ctx.db.cardInstance.id.find(cardInstanceId);
        if (!card) throw new Error('Card not found');
        if (card.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (card.location !== 'hand') throw new Error('Card not in hand');

        const def = getCardDef(card.cardDefId);
        if (def.type !== 'character') throw new Error('Only characters can be played to field');

        const fieldCards = getFieldCards(ctx, gameId, ctx.sender.toHexString());
        if (fieldCards.some((c: any) => c.fieldSlot === slot)) throw new Error('Slot occupied');

        game = spendEnergy(game, ctx.sender, def.cost);
        ctx.db.game.id.update(game);
        ctx.db.cardInstance.id.update({ ...card, location: 'field', fieldSlot: slot, canAttack: false });
        logEvent(ctx, gameId, game.turnNumber, 'summon', `${def.name} invocado no slot ${slot}`);

        if (def.effect && def.effect.trigger === 'on_enter' && def.effect.action === 'draw') {
            drawCards(ctx, game.id, card.owner, def.effect.value || 1);
        }
    }
);

export const attack = spacetimedb.reducer(
    { gameId: t.u64(), attackerId: t.u64(), targetId: t.u64() },
    (ctx: any, { gameId, attackerId, targetId }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'combat') throw new Error('Can only attack in combat phase');

        const attacker = ctx.db.cardInstance.id.find(attackerId);
        if (!attacker) throw new Error('Attacker not found');
        if (attacker.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (attacker.location !== 'field' || !attacker.canAttack) throw new Error('Cannot attack');

        const atkDef = getCardDef(attacker.cardDefId);
        const effectiveAtk = attacker.currentAtk + attacker.tempAtkBuff +
            (atkDef.keywords.includes('overload') && getPlayerEnergy(game, ctx.sender) <= 3 ? 2 : 0);
        if (effectiveAtk <= 0) throw new Error('Cannot attack with 0 ATK');

        const opponentHex = getOpponent(game, ctx.sender.toHexString()).toHexString();
        const hasBypass = atkDef.keywords.includes('bypass');

        if (targetId === BigInt(0)) {
            const opponentFieldCards = getFieldCards(ctx, gameId, opponentHex);
            if (opponentFieldCards.length > 0 && !hasBypass) throw new Error('Must attack field cards first');
            game = damageOpponentHp(game, ctx.sender.toHexString(), effectiveAtk);
            logEvent(ctx, gameId, game.turnNumber, 'attack', `${atkDef.name} atacou diretamente por ${effectiveAtk}!`);
            if (attacker.hasDrain) game = healPlayer(game, ctx.sender.toHexString(), effectiveAtk);
        } else {
            const target = ctx.db.cardInstance.id.find(targetId);
            if (!target || target.location !== 'field') throw new Error('Target not on field');
            if (target.owner.toHexString() === ctx.sender.toHexString()) throw new Error('Cannot attack own card');

            const opponentFieldCards = getFieldCards(ctx, gameId, opponentHex);
            const hasTauntCards = opponentFieldCards.some((c: any) => getCardDef(c.cardDefId).keywords.includes('taunt'));
            if (hasTauntCards && !getCardDef(target.cardDefId).keywords.includes('taunt')) throw new Error('Must attack Taunt cards first');

            let damage = effectiveAtk;
            if (target.hasShield) {
                ctx.db.cardInstance.id.update({ ...target, hasShield: false });
                logEvent(ctx, gameId, game.turnNumber, 'buff', 'Shield absorveu o golpe!');
                damage = 0;
            }

            if (damage > 0) {
                const newHp = target.currentHp - damage;
                const tgtDef = getCardDef(target.cardDefId);
                if (newHp <= 0) {
                    ctx.db.cardInstance.id.update({ ...target, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                    logEvent(ctx, gameId, game.turnNumber, 'death', `${tgtDef.name} destruído!`);
                    const overflow = Math.abs(newHp);
                    if (overflow > 0) {
                        game = damageOpponentHp(game, ctx.sender.toHexString(), overflow);
                        logEvent(ctx, gameId, game.turnNumber, 'damage', `Overflow: ${overflow} no jogador!`);
                    }
                } else {
                    ctx.db.cardInstance.id.update({ ...target, currentHp: newHp });
                    logEvent(ctx, gameId, game.turnNumber, 'attack', `${atkDef.name} → ${tgtDef.name} (${damage} DMG)`);
                }
                if (attacker.hasDrain) game = healPlayer(game, ctx.sender.toHexString(), damage);
            }
        }

        const updatedAttacker = ctx.db.cardInstance.id.find(attackerId);
        if (updatedAttacker?.location === 'field') ctx.db.cardInstance.id.update({ ...updatedAttacker, canAttack: false });
        game = checkWinCondition(ctx, game);
        ctx.db.game.id.update(game);
    }
);

export const useHack = spacetimedb.reducer(
    { gameId: t.u64(), cardInstanceId: t.u64(), targetId: t.u64() },
    (ctx: any, { gameId, cardInstanceId, targetId }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Hacks only in main phase');

        const card = ctx.db.cardInstance.id.find(cardInstanceId);
        if (!card || card.owner.toHexString() !== ctx.sender.toHexString() || card.location !== 'hand') throw new Error('Invalid card');
        const def = getCardDef(card.cardDefId);
        if (def.type !== 'hack' || !def.effect) throw new Error('Not a hack');

        game = spendEnergy(game, ctx.sender, def.cost);
        ctx.db.cardInstance.id.update({ ...card, location: 'graveyard' });
        const opponentHex = getOpponent(game, ctx.sender.toHexString()).toHexString();

        switch (def.effect.action) {
            case 'damage_all_enemies': {
                for (const e of getFieldCards(ctx, gameId, opponentHex)) {
                    const hp = e.currentHp - (def.effect.value || 0);
                    if (hp <= 0) ctx.db.cardInstance.id.update({ ...e, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                    else ctx.db.cardInstance.id.update({ ...e, currentHp: hp });
                }
                break;
            }
            case 'destroy_low_hp': {
                const tgt = ctx.db.cardInstance.id.find(targetId);
                if (tgt?.location === 'field' && tgt.currentHp <= (def.effect.value || 3))
                    ctx.db.cardInstance.id.update({ ...tgt, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                break;
            }
            case 'draw': drawCards(ctx, gameId, ctx.sender, def.effect.value || 1); break;
            case 'damage_single': {
                const tgt = ctx.db.cardInstance.id.find(targetId);
                if (tgt?.location === 'field') {
                    const hp = tgt.currentHp - (def.effect.value || 0);
                    if (hp <= 0) ctx.db.cardInstance.id.update({ ...tgt, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                    else ctx.db.cardInstance.id.update({ ...tgt, currentHp: hp });
                }
                break;
            }
            case 'debuff_atk': {
                const tgt = ctx.db.cardInstance.id.find(targetId);
                if (tgt?.location === 'field') ctx.db.cardInstance.id.update({ ...tgt, tempAtkBuff: tgt.tempAtkBuff - (def.effect.value || 2) });
                break;
            }
        }
        logEvent(ctx, gameId, game.turnNumber, 'hack', `${def.name} usado!`);
        game = checkWinCondition(ctx, game);
        ctx.db.game.id.update(game);
    }
);

export const applyBuff = spacetimedb.reducer(
    { gameId: t.u64(), buffCardId: t.u64(), targetId: t.u64() },
    (ctx: any, { gameId, buffCardId, targetId }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Buffs only in main phase');

        const buff = ctx.db.cardInstance.id.find(buffCardId);
        if (!buff || buff.owner.toHexString() !== ctx.sender.toHexString() || buff.location !== 'hand') throw new Error('Invalid buff');
        const def = getCardDef(buff.cardDefId);
        if (def.type !== 'buff') throw new Error('Not a buff');

        const target = ctx.db.cardInstance.id.find(targetId);
        if (!target?.location || target.location !== 'field' || target.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Invalid target');

        game = spendEnergy(game, ctx.sender, def.cost);
        ctx.db.game.id.update(game);
        ctx.db.cardInstance.id.update({ ...buff, location: 'graveyard' });

        switch (def.effect?.action) {
            case 'temp_buff_atk': ctx.db.cardInstance.id.update({ ...target, tempAtkBuff: target.tempAtkBuff + (def.effect.value || 0) }); break;
            case 'perm_buff_hp': ctx.db.cardInstance.id.update({ ...target, currentHp: target.currentHp + (def.effect.value || 0) }); break;
            case 'stealth': ctx.db.cardInstance.id.update({ ...target, stealthTurns: def.effect.value || 1 }); break;
            case 'perm_buff_both': ctx.db.cardInstance.id.update({ ...target, currentAtk: target.currentAtk + (def.effect.value || 0), currentHp: target.currentHp + (def.effect.value || 0) }); break;
            case 'grant_shield': ctx.db.cardInstance.id.update({ ...target, hasShield: true }); break;
            case 'grant_drain': ctx.db.cardInstance.id.update({ ...target, hasDrain: true }); break;
        }
        logEvent(ctx, gameId, game.turnNumber, 'buff', `${def.name} aplicado!`);
    }
);

export const endPhase = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx: any, { gameId }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase === 'main') game = { ...game, phase: 'combat' };
        else throw new Error('Cannot advance');
        ctx.db.game.id.update(game);
    }
);

export const endTurn = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx: any, { gameId }: any) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        const myHex = ctx.sender.toHexString();
        const opponent = getOpponent(game, myHex);
        const opponentHex = opponent.toHexString();

        // Reset temp buffs
        for (const card of ctx.db.cardInstance.iter()) {
            if (card.gameId === gameId && card.owner.toHexString() === myHex && card.location === 'field') {
                ctx.db.cardInstance.id.update({ ...card, tempAtkBuff: 0, stealthTurns: Math.max(0, card.stealthTurns - 1) });
            }
        }

        const newTurn = game.turnNumber + 1;
        const isOpP1 = opponentHex === game.player1.toHexString();
        const newMax = Math.min(8, (isOpP1 ? game.p1MaxEnergy : game.p2MaxEnergy) + 1);
        const update: any = { ...game, currentTurn: opponent, turnNumber: newTurn, phase: 'main' };
        if (isOpP1) { update.p1MaxEnergy = newMax; update.p1Energy = newMax; }
        else { update.p2MaxEnergy = newMax; update.p2Energy = newMax; }
        ctx.db.game.id.update(update);

        drawCards(ctx, gameId, opponent, 1);

        // Enable attack for opponent's cards
        for (const card of ctx.db.cardInstance.iter()) {
            if (card.gameId === gameId && card.owner.toHexString() === opponentHex && card.location === 'field') {
                ctx.db.cardInstance.id.update({ ...card, canAttack: true });
            }
        }
        logEvent(ctx, gameId, newTurn, 'turn', `Turno ${newTurn}`);
    }
);

export const forfeit = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx: any, { gameId }: any) => {
        let game = getGame(ctx, gameId);
        if (game.status !== 'active') throw new Error('Game not active');
        const myHex = ctx.sender.toHexString();
        const opponent = getOpponent(game, myHex);
        ctx.db.game.id.update({ ...game, status: 'finished', winnerId: opponent.toHexString() });
        logEvent(ctx, gameId, game.turnNumber, 'game_end', 'Vitória por desistência!');
        updatePlayerStats(ctx, opponent, ctx.sender);
    }
);
