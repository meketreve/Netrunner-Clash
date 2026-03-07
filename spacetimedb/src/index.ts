// ============================================================
// NETRUNNER CLASH — SpacetimeDB Module Entry Point
// Single entry point: re-exports schema + all reducers
// ============================================================
// Schema is defined in schema.ts, reducers in their own modules.
// This file simply re-exports everything for SpacetimeDB.
// ============================================================

// Schema (default export required by SpacetimeDB)
export { default } from './schema.js';

// Matchmaking reducers
export { registerPlayer, setPlayerName, updateProfile, completeTutorial, joinQueue, leaveQueue, clientConnected, clientDisconnected } from './matchmaking.js';

// Game logic reducers
export { playCard, attack, useHack, applyBuff, endPhase, endTurn, forfeit } from './game-logic.js';

// Ranking reducers
export { getTopPlayers, searchPlayers, getPlayerRank, getRankingStats } from './ranking.js';

// Performance optimization systems
export { 
    initializePerformance, 
    updateGameMetrics, 
    onGameStart, 
    onGameEnd, 
    onPlayerDisconnect,
    runPerformanceHealthCheck,
    shutdownPerformanceSystems 
} from './performance-init.js';
