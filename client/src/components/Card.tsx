'use client';

import React from 'react';
import { getCardVisual } from '@/lib/card-data';

interface CardProps {
    cardDefId: number;
    currentAtk?: number;
    currentHp?: number;
    maxHp?: number;
    canAttack?: boolean;
    hasShield?: boolean;
    hasDrain?: boolean;
    stealthTurns?: number;
    tempAtkBuff?: number;
    isSelected?: boolean;
    isTarget?: boolean;
    isDisabled?: boolean;
    animationClass?: string;
    location?: 'hand' | 'field' | 'graveyard' | 'collection';
    onClick?: () => void;
    className?: string;
}

const CARD_ART: Record<number, string> = {
    1: '🤖', 2: '🧠', 3: '⚔️', 4: '💊', 5: '👻', 6: '🛡️', 7: '🏃', 8: '💪',
    9: '⚡', 10: '🔥', 11: '👁️', 12: '🔗', 13: '🛡️', 14: '💉',
    15: '💥', 16: '💀', 17: '📡', 18: '🔄', 19: '🌀', 20: '🦠',
};

export default function Card({
    cardDefId,
    currentAtk,
    currentHp,
    maxHp,
    canAttack = false,
    hasShield = false,
    hasDrain = false,
    stealthTurns = 0,
    tempAtkBuff = 0,
    isSelected = false,
    isTarget = false,
    isDisabled = false,
    animationClass = '',
    location = 'hand',
    onClick,
    className = '',
}: CardProps) {
    const card = getCardVisual(cardDefId);
    const displayAtk = currentAtk ?? card.atk;
    const displayHp = currentHp ?? card.hp;
    const originalHp = maxHp ?? card.hp;

    const atkWithBuff = displayAtk + tempAtkBuff;
    const isDamaged = displayHp < originalHp;

    const classNames = [
        'card',
        `card--type-${card.type}`,
        location === 'hand' ? 'card--in-hand' : '',
        location === 'field' ? 'card--on-field' : '',
        isSelected ? 'card--selected' : '',
        isTarget ? 'card--target' : '',
        isDisabled ? 'card--disabled' : '',
        animationClass,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classNames}
            onClick={isDisabled ? undefined : onClick}
            style={{ borderColor: isSelected || isTarget ? undefined : card.color + '60' }}
        >
            {/* Cost badge */}
            <div className="card__cost">{card.cost}</div>

            {/* Status icons */}
            <div className="card__status-icons">
                {hasShield && <span className="card__status-icon" title="Shield">🛡️</span>}
                {hasDrain && <span className="card__status-icon" title="Drain">💉</span>}
                {stealthTurns > 0 && <span className="card__status-icon" title="Stealth">👁️</span>}
                {canAttack && location === 'field' && card.type === 'character' && (
                    <span className="card__status-icon" title="Pode atacar" style={{ color: 'var(--green)' }}>⚡</span>
                )}
            </div>

            {/* Header */}
            <div className="card__header">
                <div className="card__name">{card.name}</div>
            </div>

            {/* Art */}
            <div className="card__art" style={{
                background: `radial-gradient(circle, ${card.color}15 0%, transparent 70%)`
            }}>
                {CARD_ART[cardDefId] || '❓'}
            </div>

            {/* Body */}
            <div className="card__body">
                <div className="card__description">{card.description}</div>
                {card.keywords.length > 0 && (
                    <div className="card__keywords">
                        {card.keywords.map((kw) => (
                            <span key={kw} className="card__keyword">{kw}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer (ATK/HP) — only for characters */}
            {card.type === 'character' && (
                <div className="card__footer">
                    <div className={`card__stat card__stat--atk`}>
                        ⚔️ {atkWithBuff !== card.atk ? (
                            <span style={{ color: atkWithBuff > card.atk ? 'var(--green)' : 'var(--red)' }}>
                                {atkWithBuff}
                            </span>
                        ) : atkWithBuff}
                    </div>
                    <div className={`card__stat ${isDamaged ? 'card__stat--hp-damaged' : 'card__stat--hp'}`}>
                        ❤️ {displayHp}
                    </div>
                </div>
            )}

            {/* Tooltip on hover */}
            <div className="card__tooltip">
                <div className="card__tooltip-name" style={{ color: card.color }}>{card.name}</div>
                <div className="card__tooltip-desc">{card.description}</div>
                <div className="card__tooltip-flavor">{card.flavor}</div>
            </div>
        </div>
    );
}
