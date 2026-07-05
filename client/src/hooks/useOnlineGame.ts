import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getValidMoves } from '@shared/rules';
import { buildRecordedMove } from '@shared/notation';
import type { Color, GameState, Move, Position, PromotionType, RecordedMove, TimeControl } from '@shared/types';

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

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
  premove: Move | null;
  recordedMoves: RecordedMove[];
  rematchRequestedByMe: boolean;
  rematchRequestedByOpponent: boolean;
  createRoom: (tc: TimeControl | null) => void;
  joinRoom: (id: string) => void;
  requestRematch: () => void;
  handleSquareClick: (row: number, col: number) => void;
  handleDragMove: (from: Position, to: Position) => void;
  handleRightClick: () => void;
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
  const [premove, setPremove] = useState<Move | null>(null);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);
  const [recordedMoves, setRecordedMoves] = useState<RecordedMove[]>([]);

  // Keep a ref to premove so we can access it inside the game:state listener
  const premoveRef = useRef<Move | null>(null);
  premoveRef.current = premove;

  // Keep a ref to the previous gameState so the game:state listener can diff
  // against it to detect & record the newly-applied move.
  const gameStateRef = useRef<GameState | null>(null);
  gameStateRef.current = gameState;

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
      setPremove(null);
      premoveRef.current = null;
      setRecordedMoves([]);
      setStatus(color === 'black' ? 'playing' : 'waiting');
    });

    socket.on('room:error', (msg: string) => {
      setRoomError(msg);
    });

    socket.on('opponent:joined', () => {
      setStatus('playing');
    });

    socket.on('game:state', (state: GameState) => {
      const prev = gameStateRef.current;
      if (prev && state.moveHistory.length === prev.moveHistory.length + 1) {
        const move = state.moveHistory[state.moveHistory.length - 1];
        setRecordedMoves((rec) => [...rec, buildRecordedMove(prev, move, state)]);
      } else if (state.moveHistory.length === 0) {
        setRecordedMoves([]);
      }
      setGameState(state);
      setSelected(null);
      setValidMoves([]);
      setPromotionPending(null);
      if (state.isCheckmate || state.isStalemate || state.isTimeout) {
        setStatus('ended');
        setPremove(null);
        premoveRef.current = null;
        return;
      }

      // Fire premove if it's now our turn
      const pending = premoveRef.current;
      if (pending) {
        // We need playerColor here — read from closure won't be fresh, use a ref trick via the
        // setter callback pattern — read from state inside set won't work for socket callbacks.
        // Instead we rely on the playerColorRef below.
        const col = playerColorRef.current;
        if (col && state.currentTurn === col) {
          // Validate the premove is still legal in the new state
          const moves = getValidMoves(
            state.board,
            pending.from.row,
            pending.from.col,
            state.enPassantTarget,
          );
          const match = moves.find(
            (m) => m.to.row === pending.to.row && m.to.col === pending.to.col,
          );
          if (match) {
            const promo = match.promotion ? { ...match, promotion: undefined } : null;
            if (promo) {
              // Need promotion choice — show modal, keep premove for user to resolve
              setSelected({ row: pending.from.row, col: pending.from.col });
              setValidMoves(moves);
              setPromotionPending(promo);
            } else {
              socket.emit('game:move', match);
            }
          }
          setPremove(null);
          premoveRef.current = null;
        }
      }
    });

    socket.on('game:time_sync', (sync: TimeSync) => {
      setTimeSync(sync);
    });

    socket.on('game:move_rejected', ({ reason }: { reason: string }) => {
      console.warn('Move rejected:', reason);
      setPremove(null);
      premoveRef.current = null;
      clearSelection();
    });

    socket.on('opponent:left', () => {
      setStatus('opponent-left');
    });

    socket.on('game:rematch_requested', () => {
      setRematchRequestedByOpponent(true);
    });

    socket.on('game:rematch_accepted', ({ color }: { color: Color }) => {
      setPlayerColor(color);
      playerColorRef.current = color;
      setRematchRequestedByMe(false);
      setRematchRequestedByOpponent(false);
      setPremove(null);
      premoveRef.current = null;
      setStatus('playing');
    });

    return () => { socket.disconnect(); };
  }, []);

  // Ref for playerColor so the socket listener can access the fresh value
  const playerColorRef = useRef<Color | null>(null);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);

  const clearSelection = () => { setSelected(null); setValidMoves([]); };

  /** Attempt to emit a move given from→to. Returns true if emitted (or queued as premove). */
  const attemptMove = useCallback(
    (
      from: Position,
      to: Position,
      gs: GameState,
      color: Color,
    ): 'moved' | 'premoved' | 'invalid' => {
      const isMyTurn = gs.currentTurn === color;
      const piece = gs.board[from.row][from.col];
      if (!piece || piece.color !== color) return 'invalid';

      if (isMyTurn) {
        const moves = getValidMoves(gs.board, from.row, from.col, gs.enPassantTarget);
        const matching = moves.filter((m) => m.to.row === to.row && m.to.col === to.col);
        if (matching.length === 0) return 'invalid';
        const promo = matching.find((m) => m.promotion);
        if (promo) {
          setSelected(from);
          setValidMoves(moves);
          setPromotionPending({ ...promo, promotion: undefined });
          return 'moved';
        }
        socketRef.current?.emit('game:move', matching[0]);
        return 'moved';
      } else {
        // Queue as premove (only one at a time)
        setPremove({ from, to });
        premoveRef.current = { from, to };
        return 'premoved';
      }
    },
    [],
  );

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (!gameState || !playerColor) return;
      if (status !== 'playing') return;
      if (promotionPending) return;

      const piece = gameState.board[row][col];
      const isMyTurn = gameState.currentTurn === playerColor;

      // ── Cancel premove by clicking source again ──────────
      if (premove && premove.from.row === row && premove.from.col === col) {
        setPremove(null); clearSelection(); return;
      }
      if (premove && premove.to.row === row && premove.to.col === col) {
        setPremove(null); clearSelection(); return;
      }

      // ── Standard selection / move ────────────────────────
      if (selected) {
        if (selected.row === row && selected.col === col) { clearSelection(); return; }

        if (isMyTurn) {
          const matching = validMoves.filter((m) => m.to.row === row && m.to.col === col);
          if (matching.length > 0) {
            const promo = matching.find((m) => m.promotion);
            if (promo) { setPromotionPending({ ...promo, promotion: undefined }); return; }
            socketRef.current?.emit('game:move', matching[0]);
            clearSelection();
            return;
          }
        } else {
          // Not my turn — try setting premove
          const fromPos = selected;
          const toPos = { row, col };
          const srcPiece = gameState.board[fromPos.row][fromPos.col];
          if (srcPiece && srcPiece.color === playerColor) {
            setPremove({ from: fromPos, to: toPos });
            clearSelection();
            return;
          }
        }

        if (piece && piece.color === playerColor) {
          setSelected({ row, col });
          if (isMyTurn) {
            setValidMoves(getValidMoves(gameState.board, row, col, gameState.enPassantTarget));
          } else {
            setValidMoves([]);
          }
          return;
        }
        clearSelection();
        return;
      }

      // Nothing selected
      if (piece && piece.color === playerColor) {
        setSelected({ row, col });
        if (isMyTurn) {
          setValidMoves(getValidMoves(gameState.board, row, col, gameState.enPassantTarget));
        } else {
          setValidMoves([]);
        }
      }
    },
    [gameState, playerColor, selected, validMoves, promotionPending, status, premove],
  );

  const handleDragMove = useCallback(
    (from: Position, to: Position) => {
      if (!gameState || !playerColor) return;
      if (status !== 'playing') return;
      if (promotionPending) return;
      clearSelection();
      attemptMove(from, to, gameState, playerColor);
    },
    [gameState, playerColor, status, promotionPending, attemptMove],
  );

  const handleRightClick = useCallback(() => {
    setPremove(null);
    clearSelection();
  }, []);

  const handlePromotion = useCallback(
    (promotion: PromotionType) => {
      if (!promotionPending) return;
      socketRef.current?.emit('game:move', { ...promotionPending, promotion });
      setPromotionPending(null);
      clearSelection();
    },
    [promotionPending],
  );

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
    setPremove(null);
    premoveRef.current = null;
    setRematchRequestedByMe(false);
    setRematchRequestedByOpponent(false);
    setRecordedMoves([]);
    clearSelection();
  }, []);

  return {
    status, roomId, playerColor, gameState, timeSync, selected, validMoves,
    promotionPending, lastMove, roomError, premove, recordedMoves,
    rematchRequestedByMe, rematchRequestedByOpponent,
    createRoom, joinRoom, requestRematch, handleSquareClick, handleDragMove,
    handleRightClick, handlePromotion, resign, disconnect,
  };
}
