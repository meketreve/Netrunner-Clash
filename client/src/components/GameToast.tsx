'use client';

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import '@/styles/toast.css';

// ============================================================
// Toast Context — Global error/info notifications
// ============================================================

type ToastType = 'error' | 'warning' | 'info' | 'success';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    icon: string;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showGameError: (rawError: string) => void;
}

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
    showGameError: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

// Translate server error messages to user-friendly PT-BR
const ERROR_TRANSLATIONS: Record<string, { message: string; icon: string; type: ToastType }> = {
    // Combat errors
    'Must attack Taunt cards first': {
        message: '🛡️ Você deve atacar as cartas com Provocar primeiro!',
        icon: '🛡️', type: 'warning'
    },
    'Cannot attack with 0 ATK': {
        message: '⚔️ Esta carta não tem ATK suficiente para atacar!',
        icon: '⚔️', type: 'warning'
    },
    'Can only attack in combat phase': {
        message: '⚔️ Ataques só podem ser feitos na fase de Combate!',
        icon: '⚔️', type: 'info'
    },
    'Cannot attack this turn': {
        message: '⏳ Esta carta já atacou ou acabou de entrar no campo!',
        icon: '⏳', type: 'warning'
    },
    'Must attack field cards first (or need Bypass)': {
        message: '🚫 Ataque as cartas inimigas antes de atacar diretamente! (ou use Bypass)',
        icon: '🚫', type: 'warning'
    },
    'Target is in stealth': {
        message: '👻 O alvo está furtivo e não pode ser atacado!',
        icon: '👻', type: 'warning'
    },
    'Cannot attack own card': {
        message: '🚫 Você não pode atacar suas próprias cartas!',
        icon: '🚫', type: 'error'
    },

    // Phase & Turn errors
    'Not your turn': {
        message: '⏳ Não é o seu turno! Aguarde o oponente.',
        icon: '⏳', type: 'info'
    },
    'Game is not active': {
        message: '🚫 Esta partida já foi encerrada.',
        icon: '🚫', type: 'error'
    },

    // Energy / Resource errors
    'Not enough energy': {
        message: '⚡ Energia insuficiente para esta ação!',
        icon: '⚡', type: 'warning'
    },

    // Card play errors
    'Can only play cards in main phase': {
        message: '🃏 Cartas só podem ser jogadas na fase Principal!',
        icon: '🃏', type: 'info'
    },
    'Slot already occupied': {
        message: '🚫 Este slot já está ocupado! Escolha outro.',
        icon: '🚫', type: 'warning'
    },
    'Only characters can be played to field': {
        message: '🃏 Apenas personagens podem ser colocados no campo!',
        icon: '🃏', type: 'info'
    },
    'Card not in hand': {
        message: '🚫 Esta carta não está na sua mão.',
        icon: '🚫', type: 'error'
    },

    // Hack/Buff errors
    'Can only use hacks in main phase': {
        message: '💻 Hacks só podem ser usados na fase Principal!',
        icon: '💻', type: 'info'
    },
    'Can only apply buffs in main phase': {
        message: '✨ Buffs só podem ser aplicados na fase Principal!',
        icon: '✨', type: 'info'
    },
    'Can only buff own cards': {
        message: '✨ Você só pode aplicar buffs nas suas próprias cartas!',
        icon: '✨', type: 'warning'
    },
    'Card is not a hack': {
        message: '🚫 Esta carta não é um hack!',
        icon: '🚫', type: 'error'
    },
    'Card is not a buff': {
        message: '🚫 Esta carta não é um buff!',
        icon: '🚫', type: 'error'
    },

    // Registration errors
    'Player not registered': {
        message: '🔄 Registrando jogador... tente novamente.',
        icon: '🔄', type: 'info'
    },
};

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    // Track last error to avoid duplicate toasts
    const lastErrorRef = React.useRef<string>('');
    const lastErrorTimeRef = React.useRef<number>(0);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const icons = { error: '❌', warning: '⚠️', info: 'ℹ️', success: '✅' };
        const id = ++toastIdCounter;
        setToasts(prev => [...prev, { id, message, type, icon: icons[type] }]);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const showGameError = useCallback((rawError: string) => {
        // Try to extract the error message from SpacetimeDB format
        let errorMsg = rawError;

        // SpacetimeDB errors often come as "InternalError: The instance encountered a fatal error."
        // The actual message is in the server logs, but the client receives a generic error.
        // We need to match against known error patterns
        const match = rawError.match(/Error:\s*(.+)/);
        if (match) errorMsg = match[1].trim();

        const translation = ERROR_TRANSLATIONS[errorMsg];
        if (translation) {
            showToast(translation.message, translation.type);
        } else {
            // Fallback for unknown errors
            showToast(`⚠️ ${errorMsg}`, 'error');
        }
    }, [showToast]);

    // Global listener for SpacetimeDB async errors
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            const msg = event.reason?.message || String(event.reason || '');

            // Only intercept SpacetimeDB InternalErrors
            if (msg.includes('InternalError') || msg.includes('fatal error')) {
                event.preventDefault(); // Prevent console error

                // Debounce: skip if same error within 1 second
                const now = Date.now();
                if (msg === lastErrorRef.current && now - lastErrorTimeRef.current < 1000) return;
                lastErrorRef.current = msg;
                lastErrorTimeRef.current = now;

                // SpacetimeDB doesn't send the actual error message to the client,
                // so we show a generic game error
                showToast('⚠️ Ação inválida! Verifique as regras de combate.', 'warning');
            }
        };

        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, [showToast]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showGameError }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast toast--${toast.type}`}
                        onClick={() => removeToast(toast.id)}
                    >
                        <span className="toast__icon">{toast.icon}</span>
                        <span className="toast__message">{toast.message}</span>
                        <button className="toast__close" onClick={(e) => {
                            e.stopPropagation();
                            removeToast(toast.id);
                        }}>✕</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export default ToastProvider;
