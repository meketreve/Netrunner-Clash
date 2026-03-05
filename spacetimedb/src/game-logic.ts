// ============================================================
// NETRUNNER CLASH — Game Logic Reducers
// Combat, turns, buffs, hacks, win conditions
// ============================================================

import spacetimedb from './schema.js';
import { t } from 'spacetimedb/server';
import { getCardDef } from './cards.js';
import { drawCards } from './matchmaking.js';

// ============================================================
// Helpers
// ============================================================
function getGame(ctx: any, gameId: bigint) {
    for (const g of ctx.db.game.iter()) {
        if (g.id === gameId) return g;
    }
    throw new Error('Game not found');
}

function isMyTurn(ctx: any, game: any) {
    if (game.currentTurn.toHexString() !== ctx.sender.toHexString()) {
        throw new Error('Not your turn');
    }
    if (game.status !== 'active') {
        throw new Error('Game is not active');
    }
}

function getPlayerEnergy(game: any, identity: any): number {
    const hex = identity.toHexString();
    return hex === game.player1.toHexString() ? game.p1Energy : game.p2Energy;
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

function getFieldCards(ctx: any, gameId: bigint, ownerHex: string) {
    const cards = [];
    for (const card of ctx.db.cardInstance.iter()) {
        if (
            card.gameId === gameId &&
            card.owner.toHexString() === ownerHex &&
            card.location === 'field'
        ) {
            cards.push(card);
        }
    }
    return cards;
}

function getOpponent(game: any, playerHex: string) {
    return playerHex === game.player1.toHexString()
        ? game.player2
        : game.player1;
}

function getOpponentHp(game: any, playerHex: string): number {
    return playerHex === game.player1.toHexString() ? game.p2Hp : game.p1Hp;
}

function damageOpponentHp(game: any, playerHex: string, damage: number): any {
    if (playerHex === game.player1.toHexString()) {
        return { ...game, p2Hp: game.p2Hp - damage };
    } else {
        return { ...game, p1Hp: game.p1Hp - damage };
    }
}

function healPlayer(game: any, playerHex: string, amount: number): any {
    if (playerHex === game.player1.toHexString()) {
        return { ...game, p1Hp: Math.min(20, game.p1Hp + amount) };
    } else {
        return { ...game, p2Hp: Math.min(20, game.p2Hp + amount) };
    }
}

function checkWinCondition(ctx: any, game: any): any {
    let updatedGame = { ...game };
    const p1Hex = game.player1.toHexString();
    const p2Hex = game.player2.toHexString();

    if (updatedGame.p1Hp <= 0) {
        updatedGame.status = 'finished';
        updatedGame.winnerId = p2Hex;
        logEvent(ctx, game.id, game.turnNumber, 'game_end', 'Jogador 2 venceu!');
        updatePlayerStats(ctx, game.player2, game.player1);
    } else if (updatedGame.p2Hp <= 0) {
        updatedGame.status = 'finished';
        updatedGame.winnerId = p1Hex;
        logEvent(ctx, game.id, game.turnNumber, 'game_end', 'Jogador 1 venceu!');
        updatePlayerStats(ctx, game.player1, game.player2);
    }

    return updatedGame;
}

function updatePlayerStats(ctx: any, winner: any, loser: any) {
    const w = ctx.db.player.identity.find(winner);
    const l = ctx.db.player.identity.find(loser);
    if (w) ctx.db.player.identity.update({ ...w, wins: w.wins + 1 });
    if (l) ctx.db.player.identity.update({ ...l, losses: l.losses + 1 });
}

function logEvent(
    ctx: any,
    gameId: bigint,
    turn: number,
    eventType: string,
    message: string
) {
    ctx.db.gameLog.insert({
        id: 0n,
        gameId,
        turn,
        eventType,
        message,
    });
}

// ============================================================
// REDUCER: Play a character card from hand to field
// ============================================================
export const playCard = spacetimedb.reducer(
    { gameId: t.u64(), cardInstanceId: t.u64(), slot: t.u32() },
    (ctx, { gameId, cardInstanceId, slot }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Can only play cards in main phase');
        if (slot > 3) throw new Error('Invalid slot (0-3)');

        // Find the card
        const card = ctx.db.cardInstance.id.find(cardInstanceId);
        if (!card) throw new Error('Card not found');
        if (card.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (card.location !== 'hand') throw new Error('Card not in hand');

        const def = getCardDef(card.cardDefId);
        if (def.type !== 'character') throw new Error('Only characters can be played to field');

        // Check slot is empty
        const fieldCards = getFieldCards(ctx, gameId, ctx.sender.toHexString());
        if (fieldCards.some((c: any) => c.fieldSlot === slot)) {
            throw new Error('Slot already occupied');
        }

        // Spend energy
        game = spendEnergy(game, ctx.sender, def.cost);
        ctx.db.game.id.update(game);

        // Place card on field with summoning sickness
        ctx.db.cardInstance.id.update({
            ...card,
            location: 'field',
            fieldSlot: slot,
            canAttack: false, // Summoning sickness
        });

        logEvent(ctx, gameId, game.turnNumber, 'summon', `${def.name} invocado no slot ${slot}`);

        // Handle on_enter effects
        if (def.effect && def.effect.trigger === 'on_enter') {
            handleOnEnterEffect(ctx, game, card, def);
        }
    }
);

function handleOnEnterEffect(ctx: any, game: any, card: any, def: any) {
    if (def.effect.action === 'draw') {
        drawCards(ctx, game.id, card.owner, def.effect.value);
        logEvent(ctx, game.id, game.turnNumber, 'draw', `${def.name}: comprou ${def.effect.value} carta(s)`);
    }
}

// ============================================================
// REDUCER: Attack with a field card
// ============================================================
export const attack = spacetimedb.reducer(
    { gameId: t.u64(), attackerId: t.u64(), targetId: t.u64() },
    (ctx, { gameId, attackerId, targetId }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'combat') throw new Error('Can only attack in combat phase');

        const attacker = ctx.db.cardInstance.id.find(attackerId);
        if (!attacker) throw new Error('Attacker not found');
        if (attacker.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (attacker.location !== 'field') throw new Error('Attacker not on field');
        if (!attacker.canAttack) throw new Error('Cannot attack this turn');

        const atkDef = getCardDef(attacker.cardDefId);
        const effectiveAtk = attacker.currentAtk + attacker.tempAtkBuff +
            (atkDef.keywords.includes('overload') && getPlayerEnergy(game, ctx.sender) <= 3 ? 2 : 0);

        if (effectiveAtk <= 0) throw new Error('Cannot attack with 0 ATK');

        const opponentHex = getOpponent(game, ctx.sender.toHexString()).toHexString();
        const opponentFieldCards = getFieldCards(ctx, gameId, opponentHex);

        // Check Bypass keyword — can attack player directly
        const hasBypass = atkDef.keywords.includes('bypass');

        // Target = 0n means attack player directly
        if (targetId === 0n) {
            // Can only attack directly if field empty or has bypass
            if (opponentFieldCards.length > 0 && !hasBypass) {
                throw new Error('Must attack field cards first (or need Bypass)');
            }

            game = damageOpponentHp(game, ctx.sender.toHexString(), effectiveAtk);
            logEvent(ctx, gameId, game.turnNumber, 'attack',
                `${atkDef.name} atacou o jogador diretamente por ${effectiveAtk} de dano!`);

            // Drain: heal player
            if (attacker.hasDrain) {
                game = healPlayer(game, ctx.sender.toHexString(), effectiveAtk);
                logEvent(ctx, gameId, game.turnNumber, 'heal', `Drain: ${effectiveAtk} HP restaurado`);
            }
        } else {
            // Attack a card
            const target = ctx.db.cardInstance.id.find(targetId);
            if (!target) throw new Error('Target not found');
            if (target.location !== 'field') throw new Error('Target not on field');
            if (target.owner.toHexString() === ctx.sender.toHexString()) throw new Error('Cannot attack own card');
            if (target.stealthTurns > 0) throw new Error('Target is in stealth');

            // Check Taunt: must attack taunt cards first
            const hasTauntCards = opponentFieldCards.some((c: any) => {
                const d = getCardDef(c.cardDefId);
                return d.keywords.includes('taunt');
            });
            if (hasTauntCards) {
                const targetDef = getCardDef(target.cardDefId);
                if (!targetDef.keywords.includes('taunt')) {
                    throw new Error('Must attack Taunt cards first');
                }
            }

            const tgtDef = getCardDef(target.cardDefId);

            // Apply damage to target
            let damage = effectiveAtk;

            // Shield absorbs first hit
            if (target.hasShield) {
                ctx.db.cardInstance.id.update({ ...target, hasShield: false });
                logEvent(ctx, gameId, game.turnNumber, 'buff', `Shield de ${tgtDef.name} absorveu o golpe!`);
                damage = 0;
            }

            if (damage > 0) {
                const newHp = target.currentHp - damage;

                if (newHp <= 0) {
                    // Card destroyed
                    ctx.db.cardInstance.id.update({
                        ...target,
                        location: 'graveyard',
                        currentHp: 0,
                        fieldSlot: 0,
                    });
                    logEvent(ctx, gameId, game.turnNumber, 'death', `${tgtDef.name} foi destruído!`);

                    // OVERFLOW DAMAGE — excess goes to player
                    const overflow = Math.abs(newHp);
                    if (overflow > 0) {
                        game = damageOpponentHp(game, ctx.sender.toHexString(), overflow);
                        logEvent(ctx, gameId, game.turnNumber, 'damage',
                            `Dano excedente: ${overflow} no jogador!`);
                    }

                    // On-destroy effect for attacker (Viral Wraith)
                    const atkEffect = atkDef.effect;
                    if (atkEffect && atkEffect.trigger === 'on_destroy' && atkEffect.action === 'self_buff_atk') {
                        const updatedAttacker = ctx.db.cardInstance.id.find(attackerId);
                        if (updatedAttacker) {
                            ctx.db.cardInstance.id.update({
                                ...updatedAttacker,
                                currentAtk: updatedAttacker.currentAtk + (atkEffect.value || 1),
                            });
                            logEvent(ctx, gameId, game.turnNumber, 'buff',
                                `${atkDef.name} ganhou +${atkEffect.value} ATK!`);
                        }
                    }
                } else {
                    ctx.db.cardInstance.id.update({ ...target, currentHp: newHp });
                    logEvent(ctx, gameId, game.turnNumber, 'attack',
                        `${atkDef.name} causou ${damage} em ${tgtDef.name} (HP: ${newHp})`);
                }

                // Drain: heal player
                if (attacker.hasDrain) {
                    game = healPlayer(game, ctx.sender.toHexString(), damage);
                    logEvent(ctx, gameId, game.turnNumber, 'heal', `Drain: ${damage} HP restaurado`);
                }
            }
        }

        // Mark attacker as having attacked
        const updatedAttacker = ctx.db.cardInstance.id.find(attackerId);
        if (updatedAttacker && updatedAttacker.location === 'field') {
            ctx.db.cardInstance.id.update({ ...updatedAttacker, canAttack: false });
        }

        // Check win condition
        game = checkWinCondition(ctx, game);
        ctx.db.game.id.update(game);
    }
);

// ============================================================
// REDUCER: Use Hack card (instant spell)
// ============================================================
export const useHack = spacetimedb.reducer(
    { gameId: t.u64(), cardInstanceId: t.u64(), targetId: t.u64() },
    (ctx, { gameId, cardInstanceId, targetId }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Can only use hacks in main phase');

        const card = ctx.db.cardInstance.id.find(cardInstanceId);
        if (!card) throw new Error('Card not found');
        if (card.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (card.location !== 'hand') throw new Error('Card not in hand');

        const def = getCardDef(card.cardDefId);
        if (def.type !== 'hack') throw new Error('Card is not a hack');
        if (!def.effect) throw new Error('Hack has no effect');

        // Spend energy
        game = spendEnergy(game, ctx.sender, def.cost);

        // Discard the hack card
        ctx.db.cardInstance.id.update({ ...card, location: 'graveyard' });

        const myHex = ctx.sender.toHexString();
        const opponentHex = getOpponent(game, myHex).toHexString();

        // Execute effect
        switch (def.effect.action) {
            case 'damage_all_enemies': {
                const enemies = getFieldCards(ctx, gameId, opponentHex);
                for (const enemy of enemies) {
                    const newHp = enemy.currentHp - (def.effect.value || 0);
                    if (newHp <= 0) {
                        ctx.db.cardInstance.id.update({ ...enemy, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                        const eDef = getCardDef(enemy.cardDefId);
                        logEvent(ctx, gameId, game.turnNumber, 'death', `${eDef.name} destruído por ${def.name}!`);
                    } else {
                        ctx.db.cardInstance.id.update({ ...enemy, currentHp: newHp });
                    }
                }
                break;
            }
            case 'destroy_low_hp': {
                const target = ctx.db.cardInstance.id.find(targetId);
                if (target && target.location === 'field' && target.currentHp <= (def.effect.value || 3)) {
                    ctx.db.cardInstance.id.update({ ...target, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                    const tDef = getCardDef(target.cardDefId);
                    logEvent(ctx, gameId, game.turnNumber, 'death', `${tDef.name} crashou!`);
                }
                break;
            }
            case 'draw': {
                drawCards(ctx, gameId, ctx.sender, def.effect.value || 1);
                break;
            }
            case 'revive': {
                // Find first dead character
                for (const c of ctx.db.cardInstance.iter()) {
                    if (
                        c.gameId === gameId &&
                        c.owner.toHexString() === myHex &&
                        c.location === 'graveyard'
                    ) {
                        const cDef = getCardDef(c.cardDefId);
                        if (cDef.type === 'character') {
                            // Find empty slot
                            const fieldCards = getFieldCards(ctx, gameId, myHex);
                            const usedSlots = new Set(fieldCards.map((fc: any) => fc.fieldSlot));
                            let freeSlot = -1;
                            for (let s = 0; s < 4; s++) {
                                if (!usedSlots.has(s)) { freeSlot = s; break; }
                            }
                            if (freeSlot >= 0) {
                                ctx.db.cardInstance.id.update({
                                    ...c, location: 'field', fieldSlot: freeSlot,
                                    currentHp: def.effect?.value || 1, canAttack: false,
                                });
                                logEvent(ctx, gameId, game.turnNumber, 'summon', `${cDef.name} reviveu com 1 HP!`);
                            }
                            break;
                        }
                    }
                }
                break;
            }
            case 'debuff_atk': {
                const target = ctx.db.cardInstance.id.find(targetId);
                if (target && target.location === 'field') {
                    ctx.db.cardInstance.id.update({
                        ...target,
                        tempAtkBuff: target.tempAtkBuff - (def.effect.value || 2),
                    });
                    const tDef = getCardDef(target.cardDefId);
                    logEvent(ctx, gameId, game.turnNumber, 'buff', `${tDef.name} sofreu -${def.effect.value} ATK!`);
                }
                break;
            }
            case 'damage_single': {
                const target = ctx.db.cardInstance.id.find(targetId);
                if (target && target.location === 'field') {
                    const newHp = target.currentHp - (def.effect.value || 0);
                    if (newHp <= 0) {
                        ctx.db.cardInstance.id.update({ ...target, location: 'graveyard', currentHp: 0, fieldSlot: 0 });
                        const tDef = getCardDef(target.cardDefId);
                        logEvent(ctx, gameId, game.turnNumber, 'death', `${tDef.name} destruído por ${def.name}!`);
                    } else {
                        ctx.db.cardInstance.id.update({ ...target, currentHp: newHp });
                    }
                }
                break;
            }
        }

        logEvent(ctx, gameId, game.turnNumber, 'hack', `${def.name} usado!`);
        game = checkWinCondition(ctx, game);
        ctx.db.game.id.update(game);
    }
);

// ============================================================
// REDUCER: Apply Buff to a character
// ============================================================
export const applyBuff = spacetimedb.reducer(
    { gameId: t.u64(), buffCardId: t.u64(), targetId: t.u64() },
    (ctx, { gameId, buffCardId, targetId }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);
        if (game.phase !== 'main') throw new Error('Can only apply buffs in main phase');

        const buffCard = ctx.db.cardInstance.id.find(buffCardId);
        if (!buffCard) throw new Error('Buff card not found');
        if (buffCard.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Not your card');
        if (buffCard.location !== 'hand') throw new Error('Card not in hand');

        const def = getCardDef(buffCard.cardDefId);
        if (def.type !== 'buff') throw new Error('Card is not a buff');

        const target = ctx.db.cardInstance.id.find(targetId);
        if (!target) throw new Error('Target not found');
        if (target.location !== 'field') throw new Error('Target not on field');
        if (target.owner.toHexString() !== ctx.sender.toHexString()) throw new Error('Can only buff own cards');

        // Spend energy
        game = spendEnergy(game, ctx.sender, def.cost);
        ctx.db.game.id.update(game);

        // Discard buff card
        ctx.db.cardInstance.id.update({ ...buffCard, location: 'graveyard' });

        // Apply effect
        const tDef = getCardDef(target.cardDefId);
        switch (def.effect?.action) {
            case 'temp_buff_atk':
                ctx.db.cardInstance.id.update({
                    ...target,
                    tempAtkBuff: target.tempAtkBuff + (def.effect.value || 0),
                });
                break;
            case 'perm_buff_hp':
                ctx.db.cardInstance.id.update({
                    ...target,
                    currentHp: target.currentHp + (def.effect.value || 0),
                });
                break;
            case 'stealth':
                ctx.db.cardInstance.id.update({
                    ...target,
                    stealthTurns: def.effect.value || 1,
                });
                break;
            case 'perm_buff_both':
                ctx.db.cardInstance.id.update({
                    ...target,
                    currentAtk: target.currentAtk + (def.effect.value || 0),
                    currentHp: target.currentHp + (def.effect.value || 0),
                });
                break;
            case 'grant_shield':
                ctx.db.cardInstance.id.update({ ...target, hasShield: true });
                break;
            case 'grant_drain':
                ctx.db.cardInstance.id.update({ ...target, hasDrain: true });
                break;
        }

        logEvent(ctx, gameId, game.turnNumber, 'buff', `${def.name} aplicado em ${tDef.name}!`);
    }
);

// ============================================================
// REDUCER: Advance to next phase
// ============================================================
export const endPhase = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx, { gameId }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);

        const phaseOrder: Record<string, string> = {
            main: 'combat',
            combat: 'end',
        };

        const nextPhase = phaseOrder[game.phase];
        if (!nextPhase) throw new Error('Cannot advance from this phase');

        game = { ...game, phase: nextPhase };

        // If entering combat, enable attacks for all field cards
        if (nextPhase === 'combat') {
            const myCards = getFieldCards(ctx, gameId, ctx.sender.toHexString());
            for (const card of myCards) {
                if (card.canAttack) continue; // already can attack
                // Cards that have been on field for > 0 turns can attack
                // canAttack is set to true at start of turn (not on summon)
            }
        }

        ctx.db.game.id.update(game);
    }
);

// ============================================================
// REDUCER: End Turn
// ============================================================
export const endTurn = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx, { gameId }) => {
        let game = getGame(ctx, gameId);
        isMyTurn(ctx, game);

        const myHex = ctx.sender.toHexString();
        const opponent = getOpponent(game, myHex);
        const opponentHex = opponent.toHexString();

        // Reset temp buffs for current player's cards
        for (const card of ctx.db.cardInstance.iter()) {
            if (
                card.gameId === gameId &&
                card.owner.toHexString() === myHex &&
                card.location === 'field'
            ) {
                ctx.db.cardInstance.id.update({
                    ...card,
                    tempAtkBuff: 0,
                    stealthTurns: Math.max(0, card.stealthTurns - 1),
                });
            }
        }

        // Switch to opponent's turn
        const newTurnNumber = game.turnNumber + 1;

        // Calculate new energy for opponent
        const isOpponentP1 = opponentHex === game.player1.toHexString();
        let newMaxEnergy, newEnergy;
        if (isOpponentP1) {
            newMaxEnergy = Math.min(8, game.p1MaxEnergy + 1);
            newEnergy = newMaxEnergy;
        } else {
            newMaxEnergy = Math.min(8, game.p2MaxEnergy + 1);
            newEnergy = newMaxEnergy;
        }

        const gameUpdate: any = {
            ...game,
            currentTurn: opponent,
            turnNumber: newTurnNumber,
            phase: 'main', // Start at main phase (recharge is automatic)
        };

        if (isOpponentP1) {
            gameUpdate.p1MaxEnergy = newMaxEnergy;
            gameUpdate.p1Energy = newEnergy;
        } else {
            gameUpdate.p2MaxEnergy = newMaxEnergy;
            gameUpdate.p2Energy = newEnergy;
        }

        ctx.db.game.id.update(gameUpdate);

        // Draw a card for opponent
        const drawn = drawCards(ctx, gameId, opponent, 1);

        // Check deck out
        if (drawn === 0) {
            // Check if deck is empty
            let deckCount = 0;
            for (const c of ctx.db.cardInstance.iter()) {
                if (c.gameId === gameId && c.owner.toHexString() === opponentHex && c.location === 'deck') {
                    deckCount++;
                }
            }
            if (deckCount === 0) {
                const finalGame = { ...gameUpdate, status: 'finished', winnerId: myHex };
                ctx.db.game.id.update(finalGame);
                logEvent(ctx, gameId, newTurnNumber, 'game_end', 'Vitória por Deck Out!');
                updatePlayerStats(ctx, ctx.sender, opponent);
                return;
            }
        }

        // Enable attack for opponent's field cards, trigger on_turn_start effects
        for (const card of ctx.db.cardInstance.iter()) {
            if (
                card.gameId === gameId &&
                card.owner.toHexString() === opponentHex &&
                card.location === 'field'
            ) {
                ctx.db.cardInstance.id.update({ ...card, canAttack: true });

                // Handle on_turn_start effects (Neon Medic)
                const cDef = getCardDef(card.cardDefId);
                if (cDef.effect && cDef.effect.trigger === 'on_turn_start') {
                    if (cDef.effect.action === 'heal_ally') {
                        // Heal a random ally
                        const allies = getFieldCards(ctx, gameId, opponentHex);
                        const damaged = allies.filter((a: any) => {
                            const aDef = getCardDef(a.cardDefId);
                            return a.currentHp < aDef.hp + (a.currentHp - aDef.hp); // has taken damage
                        });
                        if (damaged.length > 0) {
                            const healTarget = damaged[0];
                            ctx.db.cardInstance.id.update({
                                ...healTarget,
                                currentHp: healTarget.currentHp + (cDef.effect.value || 1),
                            });
                            const htDef = getCardDef(healTarget.cardDefId);
                            logEvent(ctx, gameId, newTurnNumber, 'heal',
                                `${cDef.name} curou ${htDef.name} em ${cDef.effect.value} HP`);
                        }
                    }
                }
            }
        }

        logEvent(ctx, gameId, newTurnNumber, 'turn', `Turno ${newTurnNumber}`);
    }
);

// ============================================================
// REDUCER: Forfeit (give up)
// ============================================================
export const forfeit = spacetimedb.reducer(
    { gameId: t.u64() },
    (ctx, { gameId }) => {
        let game = getGame(ctx, gameId);
        if (game.status !== 'active') throw new Error('Game is not active');

        const myHex = ctx.sender.toHexString();
        if (myHex !== game.player1.toHexString() && myHex !== game.player2.toHexString()) {
            throw new Error('Not a player in this game');
        }

        const opponent = getOpponent(game, myHex);
        game = {
            ...game,
            status: 'finished',
            winnerId: opponent.toHexString(),
        };
        ctx.db.game.id.update(game);

        logEvent(ctx, gameId, game.turnNumber, 'game_end', 'Vitória por desistência!');
        updatePlayerStats(ctx, opponent, ctx.sender);
    }
);
