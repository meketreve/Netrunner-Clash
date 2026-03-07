// ============================================================
// NETRUNNER CLASH — Ranking Reducers
// Player statistics and leaderboard functionality
// ============================================================

import spacetimedb from './schema.js';
import { t } from 'spacetimedb/server';

// ============================================================
// Ranking Reducers
// ============================================================

/**
 * Get top players by win rate
 */
export const getTopPlayers = spacetimedb.reducer(
    { limit: t.u32().optional(), page: t.u32().optional() },
    (ctx, { limit = 100, page = 1 }) => {
        // Calculate offset for pagination
        const offset = (page - 1) * limit;
        
        // Get all players and sort by wins, then win rate
        const players = [];
        for (const player of ctx.db.player.iter()) {
            // Only include players with games played
            const totalGames = Number(player.wins) + Number(player.losses);
            if (totalGames === 0) continue;
            
            const winRate = Math.round((Number(player.wins) / totalGames) * 100);
            
            players.push({
                identity: player.identity,
                name: player.name,
                wins: Number(player.wins),
                losses: Number(player.losses),
                winRate: winRate,
                totalGames: totalGames,
                isOnline: player.isOnline,
                picture: player.picture
            });
        }
        
        // Sort by wins (primary), then win rate (secondary)
        players.sort((a, b) => {
            if (b.wins !== a.wins) {
                return Number(b.wins) - Number(a.wins);
            }
            return b.winRate - a.winRate;
        });
        
        // Apply pagination
        const paginatedPlayers = players.slice(offset, offset + limit);
        
        // Add rank to each player
        const rankedPlayers = paginatedPlayers.map((player, index) => ({
            ...player,
            rank: offset + index + 1
        }));
        
        return rankedPlayers;
    }
);

/**
 * Search players by name
 */
export const searchPlayers = spacetimedb.reducer(
    { searchTerm: t.string(), limit: t.u32().optional(), page: t.u32().optional() },
    (ctx, { searchTerm, limit = 100, page = 1 }) => {
        const offset = (page - 1) * limit;
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        const players = [];
        for (const player of ctx.db.player.iter()) {
            // Only include players with games played
            const totalGames = Number(player.wins) + Number(player.losses);
            if (totalGames === 0) continue;
            
            // Check if player name matches search
            if (player.name.toLowerCase().includes(lowerSearchTerm)) {
                const winRate = Math.round((Number(player.wins) / totalGames) * 100);
                
                players.push({
                    identity: player.identity,
                    name: player.name,
                    wins: Number(player.wins),
                    losses: Number(player.losses),
                    winRate: winRate,
                    totalGames: totalGames,
                    isOnline: player.isOnline,
                    picture: player.picture
                });
            }
        }
        
        // Sort by wins, then win rate
        players.sort((a, b) => {
            if (b.wins !== a.wins) {
                return Number(b.wins) - Number(a.wins);
            }
            return b.winRate - a.winRate;
        });
        
        // Apply pagination
        const paginatedPlayers = players.slice(offset, offset + limit);
        
        // Add rank to each player
        const rankedPlayers = paginatedPlayers.map((player, index) => ({
            ...player,
            rank: offset + index + 1
        }));
        
        return rankedPlayers;
    }
);

/**
 * Get player ranking by identity
 */
export const getPlayerRank = spacetimedb.reducer(
    { playerIdentity: t.identity() },
    (ctx, { playerIdentity }) => {
        const targetPlayer = ctx.db.player.identity().find(playerIdentity);
        if (!targetPlayer) {
            throw new Error('Player not found');
        }
        
        const totalGames = Number(targetPlayer.wins) + Number(targetPlayer.losses);
        if (totalGames === 0) {
            return {
                identity: targetPlayer.identity,
                name: targetPlayer.name,
                wins: Number(targetPlayer.wins),
                losses: Number(targetPlayer.losses),
                winRate: 0,
                totalGames: 0,
                rank: 0,
                isOnline: targetPlayer.isOnline,
                picture: targetPlayer.picture
            };
        }
        
        // Count players with better stats
        let betterPlayers = 0;
        for (const player of ctx.db.player.iter()) {
            const playerTotalGames = Number(player.wins) + Number(player.losses);
            if (playerTotalGames === 0) continue;
            
            const playerWinRate = (Number(player.wins) / playerTotalGames) * 100;
            const targetWinRate = (Number(targetPlayer.wins) / totalGames) * 100;
            
            if (Number(player.wins) > Number(targetPlayer.wins) || 
                (Number(player.wins) === Number(targetPlayer.wins) && playerWinRate > targetWinRate)) {
                betterPlayers++;
            }
        }
        
        const winRate = Math.round((Number(targetPlayer.wins) / totalGames) * 100);
        
        return {
            identity: targetPlayer.identity,
            name: targetPlayer.name,
            wins: Number(targetPlayer.wins),
            losses: Number(targetPlayer.losses),
            winRate: winRate,
            totalGames: totalGames,
            rank: betterPlayers + 1,
            isOnline: targetPlayer.isOnline,
            picture: targetPlayer.picture
        };
    }
);

/**
 * Get ranking statistics
 */
export const getRankingStats = spacetimedb.reducer(
    {},
    (ctx) => {
        const players = Array.from(ctx.db.player.iter());
        
        const totalPlayers = players.length;
        const activePlayers = players.filter(p => p.isOnline).length;
        const playersWithGames = players.filter(p => (Number(p.wins) + Number(p.losses)) > 0);
        
        const totalGames = players.reduce((sum, p) => sum + Number(p.wins) + Number(p.losses), 0);
        const totalWins = players.reduce((sum, p) => sum + Number(p.wins), 0);
        const totalLosses = players.reduce((sum, p) => sum + Number(p.losses), 0);
        
        return {
            totalPlayers,
            activePlayers,
            playersWithGames: playersWithGames.length,
            totalGames,
            totalWins,
            totalLosses,
            averageWinRate: playersWithGames.length > 0 ? 
                Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0
        };
    }
);
