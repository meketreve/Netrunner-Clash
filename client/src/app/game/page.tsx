import GameBoard from '@/components/GameBoard';
import SpacetimeProvider from '@/components/SpacetimeProvider';

export default function GamePage() {
    return (
        <SpacetimeProvider>
            <GameBoard />
        </SpacetimeProvider>
    );
}
