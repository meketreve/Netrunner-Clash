'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { CardInstance, Game } from '@/module_bindings/types';

// ============================================================
// Animation types
// ============================================================

export type CardAnimation = 'card--summoning' | 'card--attacking' | 'card--dying' | 'card--damaged' | 'card--buffed' | 'card--hacked';

export interface DamagePopup {
    id: string;
    targetType: 'card' | 'player';
    targetId: string; // card id or 'p1'/'p2'
    value: number;
    type: 'damage' | 'heal';
    x?: number;
    y?: number;
}

const ANIMATION_DURATIONS: Record<CardAnimation, number> = {
    'card--summoning': 400,
    'card--attacking': 500,
    'card--dying': 600,
    'card--damaged': 400,
    'card--buffed': 500,
    'card--hacked': 400,
};

// ============================================================
// Hook: useGameAnimations
// Detects state changes from SpacetimeDB and triggers animations
// ============================================================

export function useGameAnimations(
    gameCards: CardInstance[],
    game: Game | null,
    myIdentity: string,
) {
    const [cardAnimations, setCardAnimations] = useState<Map<string, CardAnimation>>(new Map());
    const [playerDamage, setPlayerDamage] = useState<{ target: 'me' | 'opponent'; type: 'damage' | 'heal' } | null>(null);
    const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);

    // Previous state snapshots
    const prevCardsRef = useRef<Map<string, CardInstance>>(new Map());
    const prevGameRef = useRef<{ p1Hp: number; p2Hp: number } | null>(null);
    const popupIdRef = useRef(0);

    // Trigger a card animation
    const triggerCardAnimation = useCallback((cardId: string, animation: CardAnimation) => {
        setCardAnimations(prev => {
            const next = new Map(prev);
            next.set(cardId, animation);
            return next;
        });

        // Auto-clear after animation duration
        setTimeout(() => {
            setCardAnimations(prev => {
                const next = new Map(prev);
                next.delete(cardId);
                return next;
            });
        }, ANIMATION_DURATIONS[animation]);
    }, []);

    // Trigger damage popup
    const triggerDamagePopup = useCallback((targetId: string, value: number, type: 'damage' | 'heal') => {
        const id = `popup-${++popupIdRef.current}`;
        setDamagePopups(prev => [...prev, { id, targetType: 'card', targetId, value, type }]);

        setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== id));
        }, 800);
    }, []);

    // Detect changes and trigger animations
    useEffect(() => {
        if (!game) return;

        const prevCards = prevCardsRef.current;
        const currentCards = new Map<string, CardInstance>();

        for (const card of gameCards) {
            const key = String(card.id);
            currentCards.set(key, card);
            const prev = prevCards.get(key);

            if (!prev) {
                // New card instance — check if it's on field (summon)
                if (card.location === 'field') {
                    triggerCardAnimation(key, 'card--summoning');
                }
                continue;
            }

            // Card moved to field (summoned)
            if (prev.location !== 'field' && card.location === 'field') {
                triggerCardAnimation(key, 'card--summoning');
            }

            // Card moved to graveyard (died)
            if (prev.location === 'field' && card.location === 'graveyard') {
                triggerCardAnimation(key, 'card--dying');
            }

            // Card took damage on field
            if (card.location === 'field' && prev.currentHp > card.currentHp) {
                triggerCardAnimation(key, 'card--damaged');
                triggerDamagePopup(key, prev.currentHp - card.currentHp, 'damage');
            }

            // Card received buff (HP or ATK increased)
            if (card.location === 'field' && (
                prev.currentHp < card.currentHp ||
                prev.currentAtk < card.currentAtk ||
                prev.hasShield !== card.hasShield && card.hasShield ||
                prev.hasDrain !== card.hasDrain && card.hasDrain
            )) {
                triggerCardAnimation(key, 'card--buffed');
            }

            // Card's canAttack changed from true to false (just attacked)
            if (card.location === 'field' && prev.canAttack && !card.canAttack && prev.location === 'field') {
                triggerCardAnimation(key, 'card--attacking');
            }
        }

        // Detect player HP changes
        const prevGame = prevGameRef.current;
        if (prevGame) {
            const amP1 = game.player1.toHexString() === myIdentity;
            const myPrevHp = amP1 ? prevGame.p1Hp : prevGame.p2Hp;
            const myCurrentHp = amP1 ? game.p1Hp : game.p2Hp;
            const opPrevHp = amP1 ? prevGame.p2Hp : prevGame.p1Hp;
            const opCurrentHp = amP1 ? game.p2Hp : game.p1Hp;

            if (myCurrentHp < myPrevHp) {
                setPlayerDamage({ target: 'me', type: 'damage' });
                setTimeout(() => setPlayerDamage(null), 500);
            } else if (myCurrentHp > myPrevHp) {
                setPlayerDamage({ target: 'me', type: 'heal' });
                setTimeout(() => setPlayerDamage(null), 500);
            }

            if (opCurrentHp < opPrevHp) {
                setPlayerDamage({ target: 'opponent', type: 'damage' });
                setTimeout(() => setPlayerDamage(null), 500);
            } else if (opCurrentHp > opPrevHp) {
                setPlayerDamage({ target: 'opponent', type: 'heal' });
                setTimeout(() => setPlayerDamage(null), 500);
            }
        }

        // Update snapshots
        prevCardsRef.current = currentCards;
        prevGameRef.current = { p1Hp: game.p1Hp, p2Hp: game.p2Hp };
    }, [gameCards, game, myIdentity, triggerCardAnimation, triggerDamagePopup]);

    return {
        getCardAnimation: (cardId: bigint): string => cardAnimations.get(String(cardId)) || '',
        playerDamage,
        damagePopups,
    };
}
