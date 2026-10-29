'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { tables, type DbConnection } from '@/module_bindings';
import type { Game, CardInstance, GameLog, PlayerSummary } from '@/module_bindings/types';
import Card from './Card';
import TutorialSystem from './TutorialSystem';
import { useToast } from './GameToast';
import { getCardVisual } from '@/lib/card-data';
import { useGameAnimations } from '@/lib/useGameAnimations';
import '@/styles/cards.css';
import '@/styles/game.css';

// ============================================================
// LOBBY COMPONENT — Matchmaking
// ============================================================

function Lobby() {
    const spacetime = useSpacetimeDB();
    const { data: session } = useSession();
    const conn = spacetime.getConnection() as DbConnection | null;
    const myIdentity = spacetime.identity?.toHexString() || '';

    const [allPlayers] = useTable(tables.publicPlayer);
    const [myPlayerRows] = useTable(tables.myPlayer);
    const [allGames] = useTable(tables.game);

    const myPlayer = myPlayerRows[0];
    const isInQueue = myPlayer?.isInQueue ?? false;

    // Leaderboard logic
    const topPlayers = useMemo(() =>
        [...allPlayers]
            .sort((a, b) => b.wins - a.wins)
            .slice(0, 5),
        [allPlayers]
    );

    // Profile (name, email, picture) comes from the verified Google token on the server
    const [tutorialDismissed, setTutorialDismissed] = useState(false);
    const showTutorial = !!myPlayer && !myPlayer.tutorialCompleted && !tutorialDismissed;
    // Finished game the player closed; a newer finished game has another id and shows again
    const [dismissedGameId, setDismissedGameId] = useState<bigint | null>(null);

    const handleTutorialComplete = () => {
        conn?.reducers.completeTutorial({});
        setTutorialDismissed(true);
    };

    // Check if we have an active or recently finished game (prioritize active)
    const myGame = (g: Game) => g.player1.toHexString() === myIdentity || g.player2.toHexString() === myIdentity;
    const liveGame = allGames.find((g: Game) => g.status === 'active' && myGame(g));
    const latestFinished = [...allGames]
        .filter((g: Game) => g.status === 'finished' && myGame(g))
        .sort((a, b) => Number(b.id) - Number(a.id))[0];
    const finishedGame = latestFinished && latestFinished.id !== dismissedGameId ? latestFinished : null;
    const activeGame = liveGame || finishedGame;

    if (activeGame) {
        return <GameBoard game={activeGame} myIdentity={myIdentity} onDismiss={() => setDismissedGameId(activeGame.id)} />;
    }

    const handleJoinQueue = () => conn?.reducers.joinQueue({});
    const handleLeaveQueue = () => conn?.reducers.leaveQueue({});

    return (
        <div className="game-page">
            <div className="lobby">
                <div className="lobby__header">
                    <h1 className="lobby__title">NETRUNNER CLASH</h1>
                    <p className="lobby__subtitle">
                        {spacetime.isActive ? '🟢 Conectado ao servidor' : '🔴 Conectando...'}
                    </p>
                </div>

                {session?.user && (
                    <div className="lobby__user-brief" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- Google avatar, external URL */}
                        <img src={session.user.image || ''} className="leaderboard__avatar" alt="Profile" />
                        <span style={{ fontSize: '0.8rem' }}>{session.user.name}</span>
                        <button className="cyber-btn cyber-btn--small" onClick={() => signOut()}>SAIR</button>
                    </div>
                )}

                {myPlayer && (
                    <div className="lobby__stats">
                        <div className="lobby__stat">
                            <span className="lobby__stat-label">NETRUNNER</span>
                            <span className="lobby__stat-value">{myPlayer.name}</span>
                        </div>
                        <div className="lobby__stat">
                            <span className="lobby__stat-label">VITÓRIAS</span>
                            <span className="lobby__stat-value" style={{ color: 'var(--green)' }}>{myPlayer.wins}</span>
                        </div>
                        <div className="lobby__stat">
                            <span className="lobby__stat-label">DERROTAS</span>
                            <span className="lobby__stat-value" style={{ color: 'var(--red)' }}>{myPlayer.losses}</span>
                        </div>
                    </div>
                )}

                <div className="lobby__social">
                    <div className="leaderboard">
                        <div className="leaderboard__title">🏆 Top Hackers</div>
                        <div className="leaderboard__list">
                            {topPlayers.map((player: PlayerSummary, index: number) => (
                                <div key={player.identity.toHexString()} className="leaderboard__item">
                                    <span className={`leaderboard__rank leaderboard__rank--${index + 1}`}>#{index + 1}</span>
                                    {/* eslint-disable-next-line @next/next/no-img-element -- external avatar URL */}
                                    <img src={player.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`} className="leaderboard__avatar" alt="" />
                                    <span className="leaderboard__name">{player.name}</span>
                                    <span className="leaderboard__wins">{player.wins} v</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {showTutorial && <TutorialSystem onComplete={handleTutorialComplete} />}

                <div className="lobby__actions">
                    {!isInQueue ? (
                        <>
                            <button className="cyber-btn cyber-btn--large" onClick={handleJoinQueue} disabled={!spacetime.isActive || !myPlayer}>
                                {!myPlayer ? '🔄 REGISTRANDO...' : '⚔️ BUSCAR PARTIDA'}
                            </button>
                            <Link href="/" style={{ width: '100%', maxWidth: '300px' }}>
                                <button className="cyber-btn cyber-btn--large cyber-btn--red" style={{ width: '100%' }}>
                                    🏠 VOLTAR AO MENU
                                </button>
                            </Link>
                        </>
                    ) : (
                        <div className="lobby__queue">
                            <div className="lobby__queue-spinner" />
                            <p className="lobby__queue-text">Procurando oponente...</p>
                            <button className="cyber-btn cyber-btn--magenta" onClick={handleLeaveQueue}>
                                ✖ CANCELAR
                            </button>
                        </div>
                    )}
                </div>

                <div className="lobby__online">
                    <span className="lobby__online-label">Jogadores online:</span>
                    <span className="lobby__online-count">{allPlayers.filter((p: PlayerSummary) => p.isOnline).length}</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// GAME BOARD COMPONENT — Real SpacetimeDB Data
// ============================================================

function GameBoard({ game, myIdentity, onDismiss }: { game: Game; myIdentity: string; onDismiss?: () => void }) {
    const spacetime = useSpacetimeDB();
    const conn = spacetime.getConnection() as DbConnection | null;
    const { showGameError } = useToast();

    const [allCards] = useTable(tables.myCards);
    const [allLogs] = useTable(tables.gameLog);

    const [selectedCardId, setSelectedCardId] = useState<bigint | null>(null);
    const [targetMode, setTargetMode] = useState<'none' | 'attack' | 'buff' | 'hack'>('none');

    // Animation system
    const gameCards = useMemo(() =>
        allCards.filter((c: CardInstance) => c.gameId === game.id), [allCards, game.id]);
    const { getCardAnimation, playerDamage } = useGameAnimations(gameCards, game, myIdentity);

    // Filter data for this game
    const gameLogs = useMemo(() =>
        allLogs.filter((l: GameLog) => l.gameId === game.id), [allLogs, game.id]);

    const isMyTurn = game.currentTurn.toHexString() === myIdentity;
    const amP1 = game.player1.toHexString() === myIdentity;

    const myHp = amP1 ? game.p1Hp : game.p2Hp;
    const opponentHp = amP1 ? game.p2Hp : game.p1Hp;
    const myEnergy = amP1 ? game.p1Energy : game.p2Energy;
    const myMaxEnergy = amP1 ? game.p1MaxEnergy : game.p2MaxEnergy;
    const opponentEnergy = amP1 ? game.p2Energy : game.p1Energy;
    const opponentMaxEnergy = amP1 ? game.p2MaxEnergy : game.p1MaxEnergy;

    // Separate cards by owner and location
    const myHandCards = useMemo(() =>
        gameCards.filter((c: CardInstance) => c.owner.toHexString() === myIdentity && c.location === 'hand'),
        [gameCards, myIdentity]);

    const myFieldCards = useMemo(() =>
        gameCards.filter((c: CardInstance) => c.owner.toHexString() === myIdentity && c.location === 'field'),
        [gameCards, myIdentity]);

    const opponentFieldCards = useMemo(() =>
        gameCards.filter((c: CardInstance) => c.owner.toHexString() !== myIdentity && c.location === 'field'),
        [gameCards, myIdentity]);

    // ============================================================
    // ACTIONS — Call real SpacetimeDB reducers with error handling
    // ============================================================

    // Wrapper to catch SpacetimeDB reducer errors and show as toast.
    // Reducer calls return a Promise (SDK 2.x), so failures arrive as rejections.
    const safeCall = useCallback((fn: () => Promise<void> | undefined) => {
        const onError = (err: unknown) => showGameError(err instanceof Error ? err.message : String(err));
        try {
            fn()?.catch(onError);
        } catch (err) {
            onError(err);
        }
    }, [showGameError]);

    const handlePlayCard = useCallback((cardId: bigint, slot: number) => {
        safeCall(() => conn?.reducers.playCard({ gameId: game.id, cardInstanceId: cardId, slot }));
        setSelectedCardId(null);
        setTargetMode('none');
    }, [conn, game.id, safeCall]);

    const handleAttack = useCallback((attackerId: bigint, targetId: bigint) => {
        safeCall(() => conn?.reducers.attack({ gameId: game.id, attackerId, targetId }));
        setSelectedCardId(null);
        setTargetMode('none');
    }, [conn, game.id, safeCall]);

    const handleEndPhase = useCallback(() => {
        safeCall(() => conn?.reducers.endPhase({ gameId: game.id }));
    }, [conn, game.id, safeCall]);

    const handleEndTurn = useCallback(() => {
        safeCall(() => conn?.reducers.endTurn({ gameId: game.id }));
    }, [conn, game.id, safeCall]);

    const handleForfeit = useCallback(() => {
        safeCall(() => conn?.reducers.forfeit({ gameId: game.id }));
    }, [conn, game.id, safeCall]);

    const handleUseHack = useCallback((cardId: bigint, targetId: bigint) => {
        safeCall(() => conn?.reducers.useHack({ gameId: game.id, cardInstanceId: cardId, targetId }));
        setSelectedCardId(null);
        setTargetMode('none');
    }, [conn, game.id, safeCall]);

    const handleApplyBuff = useCallback((buffCardId: bigint, targetId: bigint) => {
        safeCall(() => conn?.reducers.applyBuff({ gameId: game.id, buffCardId, targetId }));
        setSelectedCardId(null);
        setTargetMode('none');
    }, [conn, game.id, safeCall]);

    // Card click handlers
    const handleCardClick = useCallback((card: CardInstance) => {
        if (!isMyTurn) return;

        // If in target mode, select target
        if (targetMode === 'attack' && card.owner.toHexString() !== myIdentity && card.location === 'field') {
            if (selectedCardId !== null) {
                handleAttack(selectedCardId, card.id);
            }
            return;
        }

        if (targetMode === 'buff' && card.owner.toHexString() === myIdentity && card.location === 'field') {
            if (selectedCardId !== null) {
                const selectedCard = gameCards.find((c: CardInstance) => c.id === selectedCardId);
                if (selectedCard) {
                    const def = getCardVisual(selectedCard.cardDefId);
                    if (def.type === 'buff') handleApplyBuff(selectedCardId, card.id);
                    else if (def.type === 'hack') handleUseHack(selectedCardId, card.id);
                }
            }
            return;
        }

        if (targetMode === 'hack' && card.owner.toHexString() !== myIdentity && card.location === 'field') {
            if (selectedCardId !== null) {
                handleUseHack(selectedCardId, card.id);
            }
            return;
        }

        // Select own card
        if (card.owner.toHexString() === myIdentity) {
            if (selectedCardId === card.id) {
                setSelectedCardId(null);
                setTargetMode('none');
            } else {
                setSelectedCardId(card.id);
                const def = getCardVisual(card.cardDefId);
                if (card.location === 'field' && card.canAttack && game.phase === 'combat') {
                    setTargetMode('attack');
                } else if (card.location === 'hand' && def.type === 'buff') {
                    setTargetMode('buff');
                } else if (card.location === 'hand' && def.type === 'hack') {
                    setTargetMode('hack');
                } else {
                    setTargetMode('none');
                }
            }
        }
    }, [isMyTurn, game.phase, selectedCardId, targetMode, myIdentity, gameCards, handleAttack, handleApplyBuff, handleUseHack]);

    const handleSlotClick = useCallback((slot: number) => {
        if (!isMyTurn || game.phase !== 'main') return;
        if (selectedCardId === null) return;

        const card = gameCards.find((c: CardInstance) => c.id === selectedCardId);
        if (!card || card.location !== 'hand') return;

        const def = getCardVisual(card.cardDefId);
        if (def.type !== 'character') return;

        handlePlayCard(selectedCardId, slot);
    }, [isMyTurn, game.phase, selectedCardId, gameCards, handlePlayCard]);

    const handleDirectAttack = useCallback(() => {
        if (targetMode === 'attack' && selectedCardId !== null && opponentFieldCards.length === 0) {
            handleAttack(selectedCardId, BigInt(0));
        }
    }, [targetMode, selectedCardId, opponentFieldCards.length, handleAttack]);

    // ============================================================
    // RENDER
    // ============================================================

    const renderFieldSlots = (cards: CardInstance[], isPlayer: boolean) => {
        const slots = [0, 1, 2, 3];
        return slots.map(slot => {
            const card = cards.find((c: CardInstance) => c.fieldSlot === slot);
            const isEmpty = !card;
            const canPlace = isPlayer && isMyTurn && game.phase === 'main' && selectedCardId !== null && isEmpty;

            return (
                <div
                    key={slot}
                    className={`field__slot ${isEmpty ? 'field__slot--empty' : ''} ${canPlace ? 'field__slot--can-place' : ''}`}
                    onClick={() => { if (canPlace) handleSlotClick(slot); }}
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
                            isTarget={targetMode === 'attack' && card.owner.toHexString() !== myIdentity}
                            animationClass={getCardAnimation(card.id)}
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

    const isWinner = game.winnerId === myIdentity;

    return (
        <div className="game-page">
            <div className="board">
                {/* Top Bar */}
                <div className="board__top-bar">
                    <div className="board__turn-info">TURNO {game.turnNumber}</div>
                    <div className="board__phase-info">
                        FASE: {game.phase === 'main' ? '⚙️ PRINCIPAL' : game.phase === 'combat' ? '⚔️ COMBATE' : '🔚 FIM'}
                    </div>
                    <div className="board__turn-info" style={{ color: isMyTurn ? 'var(--green)' : 'var(--red)' }}>
                        {isMyTurn ? 'SUA VEZ' : 'VEZ DO OPONENTE'}
                    </div>
                </div>

                {/* Opponent Info */}
                <div className={`player-info player-info--opponent ${!isMyTurn ? 'player-info--active' : ''} ${playerDamage?.target === 'opponent' && playerDamage.type === 'damage' ? 'player-info--damage-shake' : ''} ${playerDamage?.target === 'opponent' && playerDamage.type === 'heal' ? 'player-info--heal-glow' : ''}`} style={{ position: 'relative' }}>
                    <div className="player-info__name" style={{ color: 'var(--magenta)' }}>OPONENTE</div>
                    <div className="player-info__hp">
                        <div className="player-info__hp-bar"
                            onClick={handleDirectAttack}
                            style={{ cursor: targetMode === 'attack' && opponentFieldCards.length === 0 ? 'pointer' : 'default' }}
                        >
                            <div
                                className={`player-info__hp-fill ${hpClass(opponentHp)}`}
                                style={{ width: `${(opponentHp / 20) * 100}%` }}
                            />
                        </div>
                        <div className="player-info__hp-text">{opponentHp}/20</div>
                    </div>
                    <div className="player-info__energy">
                        {Array.from({ length: opponentMaxEnergy }, (_, i) => (
                            <div key={i} className={`player-info__energy-crystal ${i < opponentEnergy ? 'player-info__energy-crystal--filled' : 'player-info__energy-crystal--empty'}`} />
                        ))}
                    </div>
                </div>

                {/* Game Field */}
                <div className="field">
                    <div className="field__row field__row--opponent">
                        {renderFieldSlots(opponentFieldCards, false)}
                    </div>
                    <div className="field__divider" />
                    <div className="field__row field__row--player">
                        {renderFieldSlots(myFieldCards, true)}
                    </div>
                </div>

                {/* Player Info */}
                <div className={`player-info ${isMyTurn ? 'player-info--active' : ''} ${playerDamage?.target === 'me' && playerDamage.type === 'damage' ? 'player-info--damage-shake' : ''} ${playerDamage?.target === 'me' && playerDamage.type === 'heal' ? 'player-info--heal-glow' : ''}`} style={{ position: 'relative' }}>
                    <div className="player-info__name" style={{ color: 'var(--cyan)' }}>VOCÊ</div>
                    <div className="player-info__hp">
                        <div className="player-info__hp-bar">
                            <div
                                className={`player-info__hp-fill ${hpClass(myHp)}`}
                                style={{ width: `${(myHp / 20) * 100}%` }}
                            />
                        </div>
                        <div className="player-info__hp-text">{myHp}/20</div>
                    </div>
                    <div className="player-info__energy">
                        {Array.from({ length: myMaxEnergy }, (_, i) => (
                            <div key={i} className={`player-info__energy-crystal ${i < myEnergy ? 'player-info__energy-crystal--filled' : 'player-info__energy-crystal--empty'}`} />
                        ))}
                    </div>
                </div>

                {/* Turn Controls */}
                {isMyTurn && game.status === 'active' && (
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
                        myHandCards.map((card: CardInstance) => (
                            <Card
                                key={String(card.id)}
                                cardDefId={card.cardDefId}
                                currentAtk={card.currentAtk}
                                currentHp={card.currentHp}
                                isSelected={selectedCardId === card.id}
                                isDisabled={!isMyTurn || getCardVisual(card.cardDefId).cost > myEnergy}
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
                {gameLogs.slice().reverse().map((entry: GameLog) => (
                    <div key={String(entry.id)} className={`game-log__entry game-log__entry--${entry.eventType}`}>
                        <small style={{ color: 'var(--text-muted)' }}>T{entry.turn}</small> {entry.message}
                    </div>
                ))}
            </div>

            {/* Victory/Defeat Screen */}
            {game.status === 'finished' && (
                <div className="victory-screen">
                    <h1 className={`victory-screen__title ${isWinner ? 'victory-screen__title--win' : 'victory-screen__title--lose'}`}>
                        {isWinner ? 'VITÓRIA' : 'DERROTA'}
                    </h1>
                    <p className="victory-screen__subtitle">
                        {isWinner
                            ? 'O netrunner inimigo foi desconectado (ou derrotado).'
                            : 'Sua conexão foi terminada (ou você foi derrotado).'}
                    </p>

                    <div className="victory-screen__stats">
                        <div className="victory-screen__stat">
                            <span className="victory-screen__stat-value">{game.turnNumber}</span>
                            <span className="victory-screen__stat-label">TURNOS</span>
                        </div>
                        <div className="victory-screen__stat">
                            <span className="victory-screen__stat-value" style={{ color: 'var(--red)' }}>
                                {20 - (amP1 ? game.p2Hp : game.p1Hp)}
                            </span>
                            <span className="victory-screen__stat-label">DANO CAUSADO</span>
                        </div>
                    </div>

                    <button className="cyber-btn" onClick={onDismiss}>
                        🔄 VOLTAR AO MENU
                    </button>
                </div>
            )}

            {/* Forfeit Button */}
            {game.status === 'active' && (
                <button className="cyber-btn cyber-btn--small cyber-btn--danger" onClick={handleForfeit} style={{ position: 'fixed', bottom: '10px', left: '10px', fontSize: '0.7rem', opacity: 0.6, zIndex: 20 }}>
                    🏳️ DESISTIR
                </button>
            )}
        </div>
    );
}

// MAIN EXPORT — Shows Lobby or Game
// ============================================================

export default function GamePage() {
    return <Lobby />;
}
