'use client';

import React, { useState, useMemo } from 'react';
import { CARDS, getCardVisual, type CardType } from '@/lib/card-data';
import Card from './Card';

interface CollectionScreenProps {
    onBack: () => void;
}

export default function CollectionScreen({ onBack }: CollectionScreenProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<CardType | 'all'>('all');

    const cardList = useMemo(() => Object.values(CARDS), []);

    const filteredCards = useMemo(() => {
        return cardList.filter(card => {
            const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || card.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [cardList, searchTerm, filterType]);

    return (
        <div className="collection-screen">
            <div className="collection-screen__header">
                <div className="collection-screen__info">
                    <h2 className="collection-screen__title">CATÁLOGO DE CARTAS</h2>
                    <p className="collection-screen__count">{filteredCards.length} / {cardList.length} CARTAS ENCONTRADAS</p>
                </div>
                <button className="cyber-btn cyber-btn--small" onClick={onBack}>
                    ⬅️ VOLTAR AO LOBBY
                </button>
            </div>

            <div className="collection-screen__toolbar">
                <div className="collection-screen__search">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou efeito..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="cyber-input"
                    />
                </div>
                <div className="collection-screen__filters">
                    <button
                        className={`cyber-btn cyber-btn--small ${filterType === 'all' ? 'cyber-btn--active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        TODAS
                    </button>
                    <button
                        className={`cyber-btn cyber-btn--small ${filterType === 'character' ? 'cyber-btn--active' : ''}`}
                        onClick={() => setFilterType('character')}
                    >
                        PERSONAGENS
                    </button>
                    <button
                        className={`cyber-btn cyber-btn--small ${filterType === 'buff' ? 'cyber-btn--active' : ''}`}
                        onClick={() => setFilterType('buff')}
                    >
                        BUFFS
                    </button>
                    <button
                        className={`cyber-btn cyber-btn--small ${filterType === 'hack' ? 'cyber-btn--active' : ''}`}
                        onClick={() => setFilterType('hack')}
                    >
                        HACKS
                    </button>
                </div>
            </div>

            <div className="collection-screen__grid">
                {filteredCards.length > 0 ? (
                    filteredCards.map(card => (
                        <div key={card.id} className="collection-screen__card-wrapper">
                            <Card
                                cardDefId={card.id}
                                currentAtk={card.atk}
                                currentHp={card.hp}
                                location="collection"
                                size="large"
                            />
                            <div className="collection-screen__card-flavor">
                                "{card.flavor}"
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="collection-screen__empty">
                        Nenhuma carta encontrada para esses critérios.
                    </div>
                )}
            </div>
        </div>
    );
}
