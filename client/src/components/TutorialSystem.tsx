'use client';

import React, { useState } from 'react';

interface TutorialStep {
    target: string;
    title: string;
    description: string;
}

const STEPS: TutorialStep[] = [
    {
        target: 'lobby',
        title: 'BEM-VINDO, NETRUNNER',
        description: 'Você está no centro de comando. Aqui você pode ver seu status e gerenciar sua conta.'
    },
    {
        target: 'google-btn',
        title: 'IDENTIDADE CYBER',
        description: 'Conecte sua conta do Google para salvar seu progresso e sincronizar seus dados.'
    },
    {
        target: 'join-btn',
        title: 'INICIAR ATAQUE',
        description: 'Quando estiver pronto, clique em BUSCAR PARTIDA para encontrar um oponente na rede.'
    },
    {
        target: 'energy',
        title: 'ENERGIA (RECURSOS)',
        description: 'Cada ação custa Energia. Você ganha +1 de Energia Máxima a cada turno.'
    },
    {
        target: 'hand',
        title: 'SUA MÃO',
        description: 'Aqui ficam seus hardwares e softwares (cartas). Arraste ou clique nelas para jogar no campo.'
    }
];

interface Props {
    onComplete: () => void;
}

export default function TutorialSystem({ onComplete }: Props) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const step = STEPS[currentStep];

    return (
        <div className="tutorial-overlay">
            <div className="tutorial-box">
                <div className="tutorial-box__header">
                    <span className="tutorial-box__step">PASSO {currentStep + 1} / {STEPS.length}</span>
                    <h3 className="tutorial-box__title">{step.title}</h3>
                </div>
                <p className="tutorial-box__text">{step.description}</p>
                <div className="tutorial-box__actions">
                    <button className="cyber-btn cyber-btn--small" onClick={onComplete}>IGNORAR</button>
                    <button className="cyber-btn" onClick={handleNext}>
                        {currentStep === STEPS.length - 1 ? 'ENTENDI!' : 'PRÓXIMO'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .tutorial-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.3s ease;
                }
                .tutorial-box {
                    background: var(--bg-panel);
                    border: 2px solid var(--cyan);
                    border-radius: var(--radius-md);
                    padding: 32px;
                    max-width: 400px;
                    box-shadow: 0 0 30px rgba(0, 240, 255, 0.2);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .tutorial-box__step {
                    font-family: var(--font-display);
                    font-size: 0.6rem;
                    color: var(--cyan-dim);
                    letter-spacing: 0.2em;
                }
                .tutorial-box__title {
                    font-family: var(--font-display);
                    color: var(--cyan);
                    margin: 4px 0;
                    text-shadow: 0 0 10px var(--cyan);
                }
                .tutorial-box__text {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }
                .tutorial-box__actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 10px;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
