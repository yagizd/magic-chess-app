import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyMove,
  createInitialGameState,
  getValidMoves,
} from '@shared/rules';
import { buildRecordedMove } from '@shared/notation';
import type {
  Color,
  GameState,
  Move,
  Position,
  PromotionType,
  RecordedMove,
} from '@shared/types';
import type { BotRequest, BotResponse } from '../workers/chessBot.worker';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

const DEPTH_BY_DIFFICULTY: Record<BotDifficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

const PLAYER_COLOR: Color = 'white';
const BOT_COLOR: Color = 'black';

export interface BotGameApi {
  gameState: GameState;
  selected: Position | null;
  validMoves: Move[];
  promotionPending: Move | null;
  lastMove: Move | null;
  premove: Move | null;
  recordedMoves: RecordedMove[];
  botThinking: boolean;
  handleSquareClick: (row: number, col: number) => void;
  handleDragMove: (from: Position, to: Position) => void;
  handleRightClick: () => void;
  handlePromotion: (promotion: PromotionType) => void;
  reset: () => void;
}

export function useBotGame(difficulty: BotDifficulty): BotGameApi {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [promotionPending, setPromotionPending] = useState<Move | null>(null);
  const [recordedMoves, setRecordedMoves] = useState<RecordedMove[]>([]);
  const [botThinking, setBotThinking] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/chessBot.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const recordMove = (preState: GameState, move: Move, postState: GameState) => {
    setRecordedMoves((prev) => [...prev, buildRecordedMove(preState, move, postState)]);
  };

  const premove: Move | null = null;

  const lastMove = useMemo<Move | null>(() => {
    const h = gameState.moveHistory;
    return h.length === 0 ? null : h[h.length - 1];
  }, [gameState.moveHistory]);

  const clearSelection = () => {
    setSelected(null);
    setValidMoves([]);
  };

  const gameOver = gameState.isCheckmate || gameState.isStalemate;

  useEffect(() => {
    if (gameOver || gameState.currentTurn !== BOT_COLOR) return;
    const worker = workerRef.current;
    if (!worker) return;

    let cancelled = false;
    setBotThinking(true);
    const depth = DEPTH_BY_DIFFICULTY[difficulty];
    const requestState = gameState;

    const handleMessage = (e: MessageEvent<BotResponse>) => {
      if (cancelled) return;
      const { bestMove } = e.data;
      if (!bestMove) {
        setBotThinking(false);
        return;
      }
      const delay = 300 + Math.random() * 500;
      setTimeout(() => {
        if (cancelled) return;
        const next = applyMove(requestState, bestMove);
        recordMove(requestState, bestMove, next);
        setGameState(next);
        setBotThinking(false);
      }, delay);
    };

    worker.addEventListener('message', handleMessage);
    const request: BotRequest = { state: requestState, botColor: BOT_COLOR, depth, difficulty };
    worker.postMessage(request);

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handleMessage);
    };
  }, [gameState, gameOver, difficulty]);

  const tryMove = useCallback(
    (from: Position, to: Position): boolean => {
      if (gameState.currentTurn !== PLAYER_COLOR) return false;
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
      recordMove(gameState, matching[0], next);
      setGameState(next);
      clearSelection();
      return true;
    },
    [gameState],
  );

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (promotionPending) return;
      if (gameOver) return;
      if (gameState.currentTurn !== PLAYER_COLOR) return;

      const piece = gameState.board[row][col];

      if (selected) {
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
          recordMove(gameState, matching[0], next);
          setGameState(next);
          clearSelection();
          return;
        }

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

      if (piece && piece.color === gameState.currentTurn) {
        setSelected({ row, col });
        setValidMoves(
          getValidMoves(gameState.board, row, col, gameState.enPassantTarget),
        );
      }
    },
    [gameState, selected, validMoves, promotionPending, gameOver],
  );

  const handleDragMove = useCallback(
    (from: Position, to: Position) => {
      if (promotionPending) return;
      if (gameOver) return;
      if (gameState.currentTurn !== PLAYER_COLOR) return;
      const piece = gameState.board[from.row][from.col];
      if (!piece || piece.color !== gameState.currentTurn) return;
      tryMove(from, to);
    },
    [gameState, promotionPending, tryMove, gameOver],
  );

  const handleRightClick = useCallback(() => {
    clearSelection();
  }, []);

  const handlePromotion = useCallback(
    (promotion: PromotionType) => {
      if (!promotionPending) return;
      const move = { ...promotionPending, promotion };
      const next = applyMove(gameState, move);
      recordMove(gameState, move, next);
      setGameState(next);
      setPromotionPending(null);
      clearSelection();
    },
    [gameState, promotionPending],
  );

  const reset = useCallback(() => {
    setGameState(createInitialGameState());
    setPromotionPending(null);
    setRecordedMoves([]);
    setBotThinking(false);
    clearSelection();
  }, []);

  return {
    gameState,
    selected,
    validMoves,
    promotionPending,
    lastMove,
    premove,
    recordedMoves,
    botThinking,
    handleSquareClick,
    handleDragMove,
    handleRightClick,
    handlePromotion,
    reset,
  };
}
