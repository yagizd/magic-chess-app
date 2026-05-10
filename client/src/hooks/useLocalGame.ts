import { useCallback, useMemo, useState } from 'react';
import {
  applyMove,
  createInitialGameState,
  getValidMoves,
} from '@shared/rules';
import type {
  GameState,
  Move,
  Position,
  PromotionType,
} from '@shared/types';

export interface LocalGameApi {
  gameState: GameState;
  selected: Position | null;
  validMoves: Move[];
  promotionPending: Move | null;
  lastMove: Move | null;
  handleSquareClick: (row: number, col: number) => void;
  handlePromotion: (promotion: PromotionType) => void;
  reset: () => void;
}

export function useLocalGame(): LocalGameApi {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [promotionPending, setPromotionPending] = useState<Move | null>(null);

  const lastMove = useMemo<Move | null>(() => {
    const h = gameState.moveHistory;
    return h.length === 0 ? null : h[h.length - 1];
  }, [gameState.moveHistory]);

  const clearSelection = () => {
    setSelected(null);
    setValidMoves([]);
  };

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (promotionPending) return;
      if (gameState.isCheckmate || gameState.isStalemate) return;

      const piece = gameState.board[row][col];

      if (selected) {
        // Aynı kareye tıklandı → seçimi kaldır
        if (selected.row === row && selected.col === col) {
          clearSelection();
          return;
        }

        const matching = validMoves.filter(
          (m) => m.to.row === row && m.to.col === col,
        );

        if (matching.length > 0) {
          const promo = matching.find((m) => m.promotion);
          if (promo) {
            setPromotionPending({ ...promo, promotion: undefined });
            return;
          }
          const next = applyMove(gameState, matching[0]);
          setGameState(next);
          clearSelection();
          return;
        }

        // Geçerli hamle değil ama kendi taşımıza tıklarsak seçimi değiştir
        if (piece && piece.color === gameState.currentTurn) {
          setSelected({ row, col });
          setValidMoves(
            getValidMoves(gameState.board, row, col, gameState.enPassantTarget),
          );
          return;
        }

        clearSelection();
        return;
      }

      // Hiçbir şey seçili değil → kendi taşımıza tıklarsak seç
      if (piece && piece.color === gameState.currentTurn) {
        setSelected({ row, col });
        setValidMoves(
          getValidMoves(gameState.board, row, col, gameState.enPassantTarget),
        );
      }
    },
    [gameState, selected, validMoves, promotionPending],
  );

  const handlePromotion = useCallback(
    (promotion: PromotionType) => {
      if (!promotionPending) return;
      const next = applyMove(gameState, { ...promotionPending, promotion });
      setGameState(next);
      setPromotionPending(null);
      clearSelection();
    },
    [gameState, promotionPending],
  );

  const reset = useCallback(() => {
    setGameState(createInitialGameState());
    setPromotionPending(null);
    clearSelection();
  }, []);

  return {
    gameState,
    selected,
    validMoves,
    promotionPending,
    lastMove,
    handleSquareClick,
    handlePromotion,
    reset,
  };
}
