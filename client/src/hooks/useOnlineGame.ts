import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getValidMoves } from '@shared/rules';
import type { Color, GameState, Move, Position, PromotionType, TimeControl } from '@shared/types';

const SERVER = 'http://localhost:3001';

export interface TimeSync {
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
}

export type OnlineStatus =
  | 'connecting'
  | 'waiting'      // room created, waiting for opponent
  | 'playing'
  | 'opponent-left'
  | 'ended';

export interface OnlineGameApi {
  status: OnlineStatus;
  roomId: string | null;
  playerColor: Color | null;
  gameState: GameState | null;
  timeSync: TimeSync | null;
  selected: Position | null;
  validMoves: Move[];
  promotionPending: Move | null;
  lastMove: Move | null;
  roomError: string | null;
  rematchRequestedByMe: boolean;
  rematchRequestedByOpponent: boolean;
  createRoom: (tc: TimeControl | null) => void;
  joinRoom: (id: string) => void;
  requestRematch: () => void;
  handleSquareClick: (row: number, col: number) => void;
  handlePromotion: (type: PromotionType) => void;
  resign: () => void;
  disconnect: () => void;
}

export function useOnlineGame(): OnlineGameApi {
  const socketRef = useRef<Socket | null>(null);

  const [status, setStatus] = useState<OnlineStatus>('connecting');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [promotionPending, setPromotionPending] = useState<Move | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [timeSync, setTimeSync] = useState<TimeSync | null>(null);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);

  const lastMove = useMemo<Move | null>(() => {
    if (!gameState) return null;
    const h = gameState.moveHistory;
    return h.length === 0 ? null : h[h.length - 1];
  }, [gameState]);

  useEffect(() => {
    const socket = io(SERVER, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('waiting'));
    socket.on('disconnect', () => setStatus('connecting'));

    socket.on('room:joined', ({ roomId: id, color }: { roomId: string; color: Color }) => {
      setRoomId(id);
      setPlayerColor(color);
      setRoomError(null);
      setRematchRequestedByMe(false);
      setRematchRequestedByOpponent(false);
      setTimeSync(null);
      setStatus(color === 'black' ? 'playing' : 'waiting');
    });

    socket.on('room:error', (msg: string) => {
      setRoomError(msg);
    });

    socket.on('opponent:joined', () => {
      setStatus('playing');
    });

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
      setSelected(null);
      setValidMoves([]);
      setPromotionPending(null);
      if (state.isCheckmate || state.isStalemate || state.isTimeout) setStatus('ended');
    });

    socket.on('game:time_sync', (sync: TimeSync) => {
      setTimeSync(sync);
    });

    socket.on('opponent:left', () => {
      setStatus('opponent-left');
    });

    socket.on('game:rematch_requested', () => {
      setRematchRequestedByOpponent(true);
    });

    socket.on('game:rematch_accepted', ({ color }: { color: Color }) => {
      setPlayerColor(color);
      setRematchRequestedByMe(false);
      setRematchRequestedByOpponent(false);
      setStatus('playing');
    });

    return () => { socket.disconnect(); };
  }, []);

  const clearSelection = () => { setSelected(null); setValidMoves([]); };

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!gameState || !playerColor) return;
    if (gameState.currentTurn !== playerColor) return;
    if (status !== 'playing') return;
    if (promotionPending) return;

    const piece = gameState.board[row][col];

    if (selected) {
      if (selected.row === row && selected.col === col) { clearSelection(); return; }

      const matching = validMoves.filter(m => m.to.row === row && m.to.col === col);
      if (matching.length > 0) {
        const promo = matching.find(m => m.promotion);
        if (promo) { setPromotionPending({ ...promo, promotion: undefined }); return; }
        socketRef.current?.emit('game:move', matching[0]);
        clearSelection();
        return;
      }

      if (piece && piece.color === playerColor) {
        setSelected({ row, col });
        setValidMoves(getValidMoves(gameState.board, row, col, gameState.enPassantTarget));
        return;
      }
      clearSelection();
      return;
    }

    if (piece && piece.color === playerColor) {
      setSelected({ row, col });
      setValidMoves(getValidMoves(gameState.board, row, col, gameState.enPassantTarget));
    }
  }, [gameState, playerColor, selected, validMoves, promotionPending, status]);

  const handlePromotion = useCallback((promotion: PromotionType) => {
    if (!promotionPending) return;
    socketRef.current?.emit('game:move', { ...promotionPending, promotion });
    setPromotionPending(null);
    clearSelection();
  }, [promotionPending]);

  const createRoom = useCallback((timeControl: TimeControl | null) => {
    setRoomError(null);
    socketRef.current?.emit('room:create', { timeControl });
  }, []);

  const joinRoom = useCallback((id: string) => {
    setRoomError(null);
    socketRef.current?.emit('room:join', { roomId: id });
  }, []);

  const resign = useCallback(() => {
    socketRef.current?.emit('game:resign');
  }, []);

  const requestRematch = useCallback(() => {
    socketRef.current?.emit('game:rematch_request');
    setRematchRequestedByMe(true);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setStatus('connecting');
    setRoomId(null);
    setPlayerColor(null);
    setGameState(null);
    setTimeSync(null);
    setRematchRequestedByMe(false);
    setRematchRequestedByOpponent(false);
    clearSelection();
  }, []);

  return {
    status, roomId, playerColor, gameState, timeSync, selected, validMoves,
    promotionPending, lastMove, roomError,
    rematchRequestedByMe, rematchRequestedByOpponent,
    createRoom, joinRoom, requestRematch, handleSquareClick, handlePromotion, resign, disconnect,
  };
}
