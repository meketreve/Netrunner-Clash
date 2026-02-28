'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Card from './Card';
import { getCardVisual } from '@/lib/card-data';
import '@/styles/cards.css';
import '@/styles/game.css';

// ============================================================
// MOCK GAME STATE (until SpacetimeDB is connected)
// This simulates the state that SpacetimeDB would provide
// ============================================================

interface CardInstance {
    id: number;
    cardDefId: number;
    location: 'deck' | 'hand' | 'field' | 'graveyard';
    fieldSlot: number;
    currentHp: number;
    currentAtk: number;
    canAttack: boolean;
    hasShield: boolean;
    hasDrain: boolean;
    stealthTurns: number;
    tempAtkBuff: number;
    owner: 'player' | 'opponent';
}

interface GameState {
    turnNumber: number;
    phase: 'main' | 'combat' | 'end';
    isMyTurn: boolean;
    myHp: number;
    opponentHp: number;
    myEnergy: number;
    myMaxEnergy: number;
    opponentEnergy: number;
    opponentMaxEnergy: number;
    status: 'active' | 'finished';
    winnerId: string;
    cards: CardInstance[];
    log: { id: number; message: string; eventType: string; turn: number }[];
}

// Generate initial mock game state
function createMockGame(): GameState {
    const playerHand: CardInstance[] = [
        { id: 1, cardDefId: 1, location: 'hand', fieldSlot: 0, currentHp: 3, currentAtk: 2, canAttack: false, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'player' },
        { id: 2, cardDefId: 3, location: 'hand', fieldSlot: 0, currentHp: 3, currentAtk: 4, canAttack: false, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'player' },
        { id: 3, cardDefId: 6, location: 'hand', fieldSlot: 0, currentHp: 8, currentAtk: 2, canAttack: false, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'player' },
        { id: 4, cardDefId: 15, location: 'hand', fieldSlot: 0, currentHp: 0, currentAtk: 0, canAttack: false, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'player' },
    ];

    const opponentField: CardInstance[] = [
        { id: 10, cardDefId: 1, location: 'field', fieldSlot: 1, currentHp: 3, currentAtk: 2, canAttack: true, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'opponent' },
        { id: 11, cardDefId: 5, location: 'field', fieldSlot: 2, currentHp: 5, currentAtk: 3, canAttack: true, hasShield: false, hasDrain: false, stealthTurns: 0, tempAtkBuff: 0, owner: 'opponent' },
    ];

    return {
        turnNumber: 3,
        phase: 'main',
        isMyTurn: true,
        myHp: 20,
        opponentHp: 18,
        myEnergy: 3,
        myMaxEnergy: 3,
        opponentEnergy: 2,
        opponentMaxEnergy: 3,
        status: 'active',
        winnerId: '',
        cards: [...playerHand, ...opponentField],
        log: [
            { id: 1, message: 'Partida iniciada!', eventType: 'game_start', turn: 1 },
            { id: 2, message: 'Oponente invocou Chrome Sentinel', eventType: 'summon', turn: 2 },
            { id: 3, message: 'Oponente invocou Viral Wraith', eventType: 'summon', turn: 2 },
            { id: 4, message: 'Chrome Sentinel atacou! -2 HP', eventType: 'attack', turn: 2 },
        ],
    };
}

// ============================================================
// GAME BOARD COMPONENT
// ============================================================

export default function GameBoard() {
    const [game, setGame] = useState<GameState>(createMockGame);
    const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
    const [targetMode, setTargetMode] = useState<'none' | 'attack' | 'buff' | 'hack'>('none');

    // Derived data
    const myHandCards = useMemo(() =>
        game.cards.filter(c => c.owner === 'player' && c.location === 'hand'), [game.cards]);

    const myFieldCards = useMemo(() =>
        game.cards.filter(c => c.owner === 'player' && c.location === 'field'), [game.cards]);

    const opponentFieldCards = useMemo(() =>
        game.cards.filter(c => c.owner === 'opponent' && c.location === 'field'), [game.cards]);

    // ============================================================
    // ACTIONS (mock — will be replaced by SpacetimeDB reducers)
    // ============================================================

    const handlePlayCard = useCallback((cardId: number, slot: number) => {
        setGame(prev => {
            const card = prev.cards.find(c => c.id === cardId);
            if (!card || card.location !== 'hand') return prev;

            const def = getCardVisual(card.cardDefId);
            if (prev.myEnergy < def.cost) return prev;

            const newCards = prev.cards.map(c => {
                if (c.id === cardId) {
                    return { ...c, location: 'field' as const, fieldSlot: slot, canAttack: false };
                }
                return c;
            });

            const newLog = [...prev.log, {
                id: prev.log.length + 1,
                message: `${def.name} invocado no slot ${slot}`,
                eventType: 'summon',
                turn: prev.turnNumber,
            }];

            return { ...prev, cards: newCards, myEnergy: prev.myEnergy - def.cost, log: newLog };
        });
        setSelectedCardId(null);
        setTargetMode('none');
    }, []);

    const handleAttack = useCallback((attackerId: number, targetId: number) => {
        setGame(prev => {
            const attacker = prev.cards.find(c => c.id === attackerId);
            const target = prev.cards.find(c => c.id === targetId);
            if (!attacker || !target) return prev;
            if (!attacker.canAttack) return prev;

            const atkDef = getCardVisual(attacker.cardDefId);
            const tgtDef = getCardVisual(target.cardDefId);
            const damage = attacker.currentAtk + attacker.tempAtkBuff;

            let newCards = [...prev.cards];
            let newHp = prev.opponentHp;
            const newLog = [...prev.log];

            const tgtNewHp = target.currentHp - damage;

            if (tgtNewHp <= 0) {
                // Kill the target
                newCards = newCards.map(c => {
                    if (c.id === targetId) return { ...c, location: 'graveyard' as const, currentHp: 0 };
                    if (c.id === attackerId) return { ...c, canAttack: false };
                    return c;
                });

                // Overflow damage!
                const overflow = Math.abs(tgtNewHp);
                if (overflow > 0) {
                    newHp -= overflow;
                    newLog.push({
                        id: newLog.length + 1,
                        message: `💥 ${tgtDef.name} destruído! ${overflow} dano excedente no jogador!`,
                        eventType: 'damage',
                        turn: prev.turnNumber,
                    });
                } else {
                    newLog.push({
                        id: newLog.length + 1,
                        message: `💀 ${tgtDef.name} destruído por ${atkDef.name}!`,
                        eventType: 'death',
                        turn: prev.turnNumber,
                    });
                }
            } else {
                newCards = newCards.map(c => {
                    if (c.id === targetId) return { ...c, currentHp: tgtNewHp };
                    if (c.id === attackerId) return { ...c, canAttack: false };
                    return c;
                });
                newLog.push({
                    id: newLog.length + 1,
                    message: `⚔️ ${atkDef.name} → ${tgtDef.name} (${damage} DMG, HP: ${tgtNewHp})`,
                    eventType: 'attack',
                    turn: prev.turnNumber,
                });
            }

            let status = prev.status;
            let winnerId = prev.winnerId;
            if (newHp <= 0) {
                status = 'finished';
                winnerId = 'player';
                newLog.push({ id: newLog.length + 1, message: '🏆 VITÓRIA!', eventType: 'game_end', turn: prev.turnNumber });
            }

            return { ...prev, cards: newCards, opponentHp: newHp, log: newLog, status, winnerId };
        });
        setSelectedCardId(null);
        setTargetMode('none');
    }, []);

    const handleEndPhase = useCallback(() => {
        setGame(prev => {
            if (prev.phase === 'main') {
                // Enable attacks for field cards
                const newCards = prev.cards.map(c => {
                    if (c.owner === 'player' && c.location === 'field') {
                        return { ...c, canAttack: true };
                    }
                    return c;
                });
                return { ...prev, phase: 'combat', cards: newCards };
            }
            return prev;
        });
    }, []);

    const handleEndTurn = useCallback(() => {
        setGame(prev => ({
            ...prev,
            phase: 'main',
            isMyTurn: false,
            turnNumber: prev.turnNumber + 1,
            log: [...prev.log, {
                id: prev.log.length + 1,
                message: `Turno ${prev.turnNumber + 1} — Vez do oponente`,
                eventType: 'turn',
                turn: prev.turnNumber + 1,
            }],
        }));
        // Simular turno do oponente (auto-play após 2s)
        setTimeout(() => {
            setGame(prev => ({
                ...prev,
                isMyTurn: true,
                turnNumber: prev.turnNumber + 1,
                myMaxEnergy: Math.min(8, prev.myMaxEnergy + 1),
                myEnergy: Math.min(8, prev.myMaxEnergy + 1),
                phase: 'main',
                cards: prev.cards.map(c => {
                    if (c.owner === 'player' && c.location === 'field') {
                        return { ...c, canAttack: false, tempAtkBuff: 0 };
                    }
                    return c;
                }),
                log: [...prev.log, {
                    id: prev.log.length + 1,
                    message: `Turno ${prev.turnNumber + 1} — Sua vez!`,
                    eventType: 'turn',
                    turn: prev.turnNumber + 1,
                }],
            }));
        }, 2000);
    }, []);

    // Card click handlers
    const handleCardClick = useCallback((card: CardInstance) => {
        if (!game.isMyTurn) return;

        // If in target mode, select target
        if (targetMode === 'attack' && card.owner === 'opponent' && card.location === 'field') {
            if (selectedCardId !== null) {
                handleAttack(selectedCardId, card.id);
            }
            return;
        }

        // Select own card
        if (card.owner === 'player') {
            if (selectedCardId === card.id) {
                setSelectedCardId(null);
                setTargetMode('none');
            } else {
                setSelectedCardId(card.id);
                const def = getCardVisual(card.cardDefId);
                if (card.location === 'field' && card.canAttack && game.phase === 'combat') {
                    setTargetMode('attack');
                } else {
                    setTargetMode('none');
                }
            }
        }
    }, [game.isMyTurn, game.phase, selectedCardId, targetMode, handleAttack]);

    const handleSlotClick = useCallback((slot: number) => {
        if (!game.isMyTurn || game.phase !== 'main') return;
        if (selectedCardId === null) return;

        const card = game.cards.find(c => c.id === selectedCardId);
        if (!card || card.location !== 'hand') return;

        const def = getCardVisual(card.cardDefId);
        if (def.type !== 'character') return;

        handlePlayCard(selectedCardId, slot);
    }, [game, selectedCardId, handlePlayCard]);

    const handleDirectAttack = useCallback(() => {
        if (targetMode === 'attack' && selectedCardId !== null && opponentFieldCards.length === 0) {
            // Direct attack to player
            setGame(prev => {
                const attacker = prev.cards.find(c => c.id === selectedCardId);
                if (!attacker) return prev;
                const atkDef = getCardVisual(attacker.cardDefId);
                const damage = attacker.currentAtk + attacker.tempAtkBuff;

                const newHp = prev.opponentHp - damage;
                const newCards = prev.cards.map(c =>
                    c.id === selectedCardId ? { ...c, canAttack: false } : c
                );

                let status = prev.status;
                let winnerId = prev.winnerId;
                const newLog = [...prev.log, {
                    id: prev.log.length + 1,
                    message: `⚔️ ${atkDef.name} atacou diretamente! -${damage} HP!`,
                    eventType: 'attack',
                    turn: prev.turnNumber,
                }];

                if (newHp <= 0) {
                    status = 'finished';
                    winnerId = 'player';
                    newLog.push({ id: newLog.length + 1, message: '🏆 VITÓRIA!', eventType: 'game_end', turn: prev.turnNumber });
                }

                return { ...prev, cards: newCards, opponentHp: newHp, log: newLog, status, winnerId };
            });
            setSelectedCardId(null);
            setTargetMode('none');
        }
    }, [targetMode, selectedCardId, opponentFieldCards.length]);

    // ============================================================
    // RENDER
    // ============================================================

    const renderFieldSlots = (cards: CardInstance[], isPlayer: boolean) => {
        const slots = [0, 1, 2, 3];
        return slots.map(slot => {
            const card = cards.find(c => c.fieldSlot === slot);
            const isEmpty = !card;
            const canPlace = isPlayer && game.isMyTurn && game.phase === 'main' && selectedCardId !== null && isEmpty;

            return (
                <div
                    key={slot}
                    className={`field__slot ${isEmpty ? 'field__slot--empty' : ''} ${canPlace ? 'field__slot--can-place' : ''}`}
                    onClick={() => {
                        if (canPlace) handleSlotClick(slot);
                    }}
                >
                    {card && (
                        <Card
                            cardDefId={card.cardDefId}
                            currentAtk={card.currentAtk}
                            currentHp={card.currentHp}
                            canAttack={card.canAttack}
                            hasShield={card.hasShield}
                            hasDrain={card.hasDrain}
                            stealthTurns={card.stealthTurns}
                            tempAtkBuff={card.tempAtkBuff}
                            isSelected={selectedCardId === card.id}
                            isTarget={targetMode === 'attack' && card.owner === 'opponent'}
                            location="field"
                            onClick={() => handleCardClick(card)}
                        />
                    )}
                </div>
            );
        });
    };

    const hpClass = (hp: number) =>
        hp <= 5 ? 'player-info__hp-fill--low' :
            hp <= 10 ? 'player-info__hp-fill--mid' : '';

    return (
        <div className="game-page">
            <div className="board">
                {/* Top Bar */}
                <div className="board__top-bar">
                    <div className="board__turn-info">TURNO {game.turnNumber}</div>
                    <div className="board__phase-info">
                        FASE: {game.phase === 'main' ? '⚙️ PRINCIPAL' : game.phase === 'combat' ? '⚔️ COMBATE' : '🔚 FIM'}
                    </div>
                    <div className="board__turn-info" style={{ color: game.isMyTurn ? 'var(--green)' : 'var(--red)' }}>
                        {game.isMyTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
                    </div>
                </div>

                {/* Opponent Info */}
                <div className={`player-info player-info--opponent ${!game.isMyTurn ? 'player-info--active' : ''}`}>
                    <div className="player-info__name" style={{ color: 'var(--magenta)' }}>OPONENTE</div>
                    <div className="player-info__hp">
                        <div className="player-info__hp-bar"
                            onClick={handleDirectAttack}
                            style={{ cursor: targetMode === 'attack' && opponentFieldCards.length === 0 ? 'pointer' : 'default' }}
                        >
                            <div
                                className={`player-info__hp-fill ${hpClass(game.opponentHp)}`}
                                style={{ width: `${(game.opponentHp / 20) * 100}%` }}
                            />
                        </div>
                        <div className="player-info__hp-text">{game.opponentHp}/20</div>
                    </div>
                    <div className="player-info__energy">
                        {Array.from({ length: game.opponentMaxEnergy }, (_, i) => (
                            <div key={i} className={`player-info__energy-crystal ${i < game.opponentEnergy ? 'player-info__energy-crystal--filled' : 'player-info__energy-crystal--empty'}`} />
                        ))}
                    </div>
                </div>

                {/* Game Field */}
                <div className="field">
                    {/* Opponent Field */}
                    <div className="field__row field__row--opponent">
                        {renderFieldSlots(opponentFieldCards, false)}
                    </div>

                    {/* Divider */}
                    <div className="field__divider" />

                    {/* Player Field */}
                    <div className="field__row field__row--player">
                        {renderFieldSlots(myFieldCards, true)}
                    </div>
                </div>

                {/* Player Info */}
                <div className={`player-info ${game.isMyTurn ? 'player-info--active' : ''}`}>
                    <div className="player-info__name" style={{ color: 'var(--cyan)' }}>VOCÊ</div>
                    <div className="player-info__hp">
                        <div className="player-info__hp-bar">
                            <div
                                className={`player-info__hp-fill ${hpClass(game.myHp)}`}
                                style={{ width: `${(game.myHp / 20) * 100}%` }}
                            />
                        </div>
                        <div className="player-info__hp-text">{game.myHp}/20</div>
                    </div>
                    <div className="player-info__energy">
                        {Array.from({ length: game.myMaxEnergy }, (_, i) => (
                            <div key={i} className={`player-info__energy-crystal ${i < game.myEnergy ? 'player-info__energy-crystal--filled' : 'player-info__energy-crystal--empty'}`} />
                        ))}
                    </div>
                </div>

                {/* Turn Controls */}
                {game.isMyTurn && game.status === 'active' && (
                    <div className="controls">
                        {game.phase === 'main' && (
                            <button className="cyber-btn" onClick={handleEndPhase}>
                                ⚔️ IR PARA COMBATE
                            </button>
                        )}
                        <button className="cyber-btn cyber-btn--magenta" onClick={handleEndTurn}>
                            ⏭️ FINALIZAR TURNO
                        </button>
                    </div>
                )}

                {/* Hand */}
                <div className={`hand ${myHandCards.length === 0 ? 'hand--empty' : ''}`}>
                    {myHandCards.length === 0 ? (
                        <span>Sem cartas na mão</span>
                    ) : (
                        myHandCards.map(card => (
                            <Card
                                key={card.id}
                                cardDefId={card.cardDefId}
                                currentAtk={card.currentAtk}
                                currentHp={card.currentHp}
                                isSelected={selectedCardId === card.id}
                                isDisabled={!game.isMyTurn || getCardVisual(card.cardDefId).cost > game.myEnergy}
                                location="hand"
                                onClick={() => handleCardClick(card)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Game Log */}
            <div className="game-log">
                <div className="game-log__title">📋 LOG DE BATALHA</div>
                {game.log.slice().reverse().map(entry => (
                    <div key={entry.id} className={`game-log__entry game-log__entry--${entry.eventType}`}>
                        <small style={{ color: 'var(--text-muted)' }}>T{entry.turn}</small> {entry.message}
                    </div>
                ))}
            </div>

            {/* Victory/Defeat Screen */}
            {game.status === 'finished' && (
                <div className="victory-screen">
                    <h1 className={`victory-screen__title ${game.winnerId === 'player' ? 'victory-screen__title--win' : 'victory-screen__title--lose'}`}>
                        {game.winnerId === 'player' ? 'VITÓRIA' : 'DERROTA'}
                    </h1>
                    <p className="victory-screen__subtitle">
                        {game.winnerId === 'player'
                            ? 'O netrunner inimigo foi desconectado.'
                            : 'Sua conexão foi terminada.'}
                    </p>
                    <button className="cyber-btn" onClick={() => setGame(createMockGame())}>
                        🔄 JOGAR NOVAMENTE
                    </button>
                </div>
            )}
        </div>
    );
}
