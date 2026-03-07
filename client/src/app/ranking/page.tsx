'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSpacetimeDB } from 'spacetimedb/react';
import styles from './page.module.css';

interface PlayerRanking {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
}

export default function RankingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [players, setPlayers] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const spacetime = useSpacetimeDB();
  const conn = spacetime?.getConnection() as any || null;

  const playersPerPage = 20;

  useEffect(() => {
    loadRankings();
  }, [currentPage, searchTerm]);

  const loadRankings = async () => {
    if (!conn) return;
    
    setLoading(true);
    try {
      // Buscar dados reais do SpacetimeDB
      let players: PlayerRanking[] = [];
      
      if (searchTerm) {
        // Usar busca com termo
        const searchResults = await conn.reducers.searchPlayers({ searchTerm, limit: playersPerPage, page: currentPage });
        players = searchResults.map((player: any) => ({
          playerId: player.identity.toHexString(),
          playerName: player.name,
          wins: player.wins,
          losses: player.losses,
          winRate: player.winRate,
          rank: player.rank
        }));
      } else {
        // Buscar top players
        const topPlayers = await conn.reducers.getTopPlayers({ limit: playersPerPage, page: currentPage });
        players = topPlayers.map((player: any) => ({
          playerId: player.identity.toHexString(),
          playerName: player.name,
          wins: player.wins,
          losses: player.losses,
          winRate: player.winRate,
          rank: player.rank
        }));
      }

      setPlayers(players);
      
      // Calcular totais para paginação
      const total = players.length;
      const pages = Math.ceil(total / playersPerPage);
      setTotalPages(pages);
      setTotalPlayers(total);
      
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      // Fallback para dados mock em caso de erro
      const mockPlayers: PlayerRanking[] = [
        { playerId: '1', playerName: 'CyberNinja', wins: 42, losses: 8, winRate: 84, rank: 1 },
        { playerId: '2', playerName: 'NeonSamurai', wins: 38, losses: 12, winRate: 76, rank: 2 },
        { playerId: '3', playerName: 'PixelHunter', wins: 35, losses: 15, winRate: 70, rank: 3 },
        { playerId: '4', playerName: 'DataRogue', wins: 32, losses: 18, winRate: 64, rank: 4 },
        { playerId: '5', playerName: 'CodeBreaker', wins: 28, losses: 22, winRate: 56, rank: 5 },
      ];
      
      setPlayers(mockPlayers);
      setTotalPages(1);
      setTotalPlayers(mockPlayers.length);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset para primeira página ao buscar
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'var(--gold)'; // Ouro
    if (rank === 2) return 'var(--silver)'; // Prata
    if (rank === 3) return 'var(--bronze)'; // Bronze
    return 'var(--text-primary)'; // Padrão
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className={styles.rankingPage}>
      {/* Header */}
      <div className={styles.rankingHeader}>
        <div className={styles.headerActions}>
          <h1 className={styles.rankingTitle}>
            🏆 RANKING GLOBAL
          </h1>

          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="cyber-btn" style={{ padding: '12px 24px' }}>
              ← VOLTAR
            </button>
          </Link>
        </div>

        {/* Campo de busca */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="🔍 Buscar jogador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <button
            type="submit"
            className="cyber-btn cyber-btn--cyan"
            style={{ padding: '12px 24px' }}
          >
            BUSCAR
          </button>
        </form>

        {/* Estatísticas */}
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Total de Jogadores
            </div>
            <div className={styles.statValue}>
              {totalPlayers}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>
              Página Atual
            </div>
            <div className={styles.statValue} style={{ color: 'var(--magenta)' }}>
              {currentPage} / {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className={styles.rankingTable}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingText}>
              ⏳ Carregando ranking...
            </div>
          </div>
        ) : players.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyText}>
              😔 Nenhum jogador encontrado
            </div>
            <div>
              Tente buscar com outros termos ou verifique mais tarde.
            </div>
          </div>
        ) : (
          <div>
            {/* Header da tabela */}
            <div className={styles.tableHeader}>
              <div>POSIÇÃO</div>
              <div>JOGADOR</div>
              <div style={{ textAlign: 'center' }}>VITÓRIAS</div>
              <div style={{ textAlign: 'center' }}>DERROTAS</div>
              <div style={{ textAlign: 'center' }}>WIN RATE</div>
              <div style={{ textAlign: 'center' }}>STATUS</div>
            </div>

            {/* Lista de jogadores */}
            {players.map((player) => (
              <div key={player.playerId} className={styles.playerRow}>
                <div className={`${styles.rankPosition} ${
                  player.rank === 1 ? styles.rankGold :
                  player.rank === 2 ? styles.rankSilver :
                  player.rank === 3 ? styles.rankBronze :
                  styles.rankDefault
                }`}>
                  {getRankIcon(player.rank)}
                </div>
                
                <div className={styles.playerName}>
                  {player.playerName}
                </div>
                
                <div className={styles.wins}>
                  {player.wins}
                </div>
                
                <div className={styles.losses}>
                  {player.losses}
                </div>
                
                <div className={`${styles.winRate} ${
                  player.winRate >= 60 ? styles.winRateHigh :
                  player.winRate >= 40 ? styles.winRateMedium :
                  styles.winRateLow
                }`}>
                  {player.winRate}%
                </div>
                
                <div className={styles.statusBadge}>
                  {player.rank <= 3 && (
                    <span className={styles.eliteBadge}>
                      ELITE
                    </span>
                  )}
                  {player.rank > 3 && player.rank <= 10 && (
                    <span className={styles.top10Badge}>
                      TOP 10
                    </span>
                  )}
                  {player.rank > 10 && (
                    <span className={styles.competitiveBadge}>
                      COMPETITIVO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="cyber-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ padding: '10px 16px' }}
          >
            ← ANTERIOR
          </button>

          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`cyber-btn ${currentPage === page ? 'cyber-btn--cyan' : ''} ${styles.pageButton}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            className="cyber-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ padding: '10px 16px' }}
          >
            PRÓXIMO →
          </button>
        </div>
      )}
    </div>
  );
}
