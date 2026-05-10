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
  premove: Move | null;
  handleSquareClick: (row: number, col: number) => void;
  handleDragMove: (from: Position, to: Position) => void;
  handleRightClick: () => void;
  handlePromotion: (promotion: PromotionType) => void;
  reset: () => void;
}

export function useLocalGame(): LocalGameApi {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [promotionPending, setPromotionPending] = useState<Move | null>(null);

  // No premove in local game (both sides always in turn) — kept for API parity
  const premove: Move | null = null;

  const lastMove = useMemo<Move | null>(() => {
    const h = gameState.moveHistory;
    return h.length === 0 ? null : h[h.length - 1];
  }, [gameState.moveHistory]);

  const clearSelection = () => {
    setSelected(null);
    setValidMoves([]);
  };

  /** Try to execute a move from `from` to `to`. Returns true if applied. */
  const tryMove = useCallback(
    (from: Position, to: Position): boolean => {
      const moves = getValidMoves(gameState.board, from.row, from.col, gameState.enPassantTarget);
      const matching = moves.filter((m) => m.to.row === to.row && m.to.col === to.col);
      if (matching.length === 0) return false;

      const promo = matching.find((m) => m.promotion);
      if (promo) {
        setSelected(from);
        setValidMoves(moves);
        setPromotionPending({ ...promo, promotion: undefined });
        return true;
      }
      const next = applyMove(gameState, matching[0]);
      setGameState(next);
      clearSelection();
      return true;
    },
    [gameState],
  );

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (promotionPending) return;
      if (gameState.isCheckmate || gameState.isStalemate) return;

      const piece = gameState.board[row][col];

      if (selected) {
        // Same square → deselect
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

        // Not a valid target — switch selection if own piece
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

      // Nothing selected → pick own piece
      if (piece && piece.color === gameState.currentTurn) {
        setSelected({ row, col });
        setValidMoves(
          getValidMoves(gameState.board, row, col, gameState.enPassantTarget),
        );
      }
    },
    [gameState, selected, validMoves, promotionPending],
  );

  const handleDragMove = useCallback(
    (from: Position, to: Position) => {
      if (promotionPending) return;
      if (gameState.isCheckmate || gameState.isStalemate) return;
      const piece = gameState.board[from.row][from.col];
      if (!piece || piece.color !== gameState.currentTurn) return;
      tryMove(from, to);
    },
    [gameState, promotionPending, tryMove],
  );

  const handleRightClick = useCallback(() => {
    clearSelection();
  }, []);

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
    premove,
    handleSquareClick,
    handleDragMove,
    handleRightClick,
    handlePromotion,
    reset,
  };
}
