import { applyMove, getMovementType, getValidMoves } from '@shared/rules';
import type { Board, Color, GameState, Move, Piece, PieceType } from '@shared/types';

type Strength = 'easy' | 'medium' | 'hard';

export interface BotRequest {
  state: GameState;
  botColor: Color;
  depth: number;
  difficulty: Strength;
}

export interface BotResponse {
  bestMove: Move | null;
}

interface WorkerScope {
  onmessage: ((ev: MessageEvent<BotRequest>) => void) | null;
  postMessage(message: BotResponse): void;
}

const ctx = self as unknown as WorkerScope;

const BASE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

function opponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

// ── Standard evaluation (easy / medium — unchanged) ──────────────

function evaluate(board: Board, color: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const movementType = getMovementType(piece, c);
      const mobility = getValidMoves(board, r, c, null).length * 5;
      const pieceScore = BASE_VALUES[movementType] + mobility;
      score += piece.color === color ? pieceScore : -pieceScore;
    }
  }
  return score;
}

function orderMoves(moves: Move[], board: Board): Move[] {
  return [...moves].sort((a, b) => {
    const aCapture = board[a.to.row][a.to.col] ? 1 : 0;
    const bCapture = board[b.to.row][b.to.col] ? 1 : 0;
    return bCapture - aCapture;
  });
}

// ── Enhanced evaluation (hard only) ───────────────────────────────

// Classic simplified piece-square tables, rank8 (row 0) to rank1 (row 7),
// from White's perspective. Mirrored vertically for Black.
const PST: Record<PieceType, number[][]> = {
  pawn: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  knight: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  bishop: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  rook: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  queen: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  king: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

function pstBonus(type: PieceType, row: number, col: number, color: Color): number {
  const r = color === 'white' ? row : 7 - row;
  return PST[type][r][col];
}

// Rook/bishop/knight identity can change with the column they're on.
// Reward a piece whose current column gives it an equal-or-stronger
// movement type than its own; penalize one stuck with a weaker one.
const MUTABLE_TYPES: PieceType[] = ['rook', 'bishop', 'knight'];

function columnAdjustment(piece: Piece, col: number): number {
  if (!MUTABLE_TYPES.includes(piece.type)) return 0;
  const effective = getMovementType(piece, col);
  const ownValue = BASE_VALUES[piece.type];
  const effectiveValue = BASE_VALUES[effective];
  const identityBonus = effective === piece.type ? 10 : 0;
  return (effectiveValue - ownValue) * 0.2 + identityBonus;
}

function evaluateHard(board: Board, color: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const movementType = getMovementType(piece, c);
      const mobility = getValidMoves(board, r, c, null).length * 5;
      const pst = pstBonus(piece.type, r, c, piece.color);
      const colAdj = columnAdjustment(piece, c);
      const pieceScore = BASE_VALUES[movementType] + mobility + pst + colAdj;
      score += piece.color === color ? pieceScore : -pieceScore;
    }
  }
  return score;
}

interface ScoredMove {
  move: Move;
  next: GameState;
  key: number;
}

// Mate moves first, then captures (highest captured value first), then the rest.
function scoreMoveForOrdering(move: Move, board: Board, next: GameState): number {
  if (next.isCheckmate) return 1_000_000;
  const captured = board[move.to.row][move.to.col];
  if (captured) return 100_000 + BASE_VALUES[captured.type];
  if (move.isEnPassant) return 100_000 + BASE_VALUES.pawn;
  return 0;
}

function orderMovesHard(state: GameState, moves: Move[]): ScoredMove[] {
  const scored = moves.map((move) => {
    const next = applyMove(state, move);
    const key = scoreMoveForOrdering(move, state.board, next);
    return { move, next, key };
  });
  scored.sort((a, b) => b.key - a.key);
  return scored;
}

// ── Move generation (shared) ──────────────────────────────────────

function getAllMoves(state: GameState, color: Color): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || piece.color !== color) continue;
      moves.push(...getValidMoves(state.board, r, c, state.enPassantTarget));
    }
  }
  return moves;
}

// ── Standard search (easy / medium — unchanged) ───────────────────

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botColor: Color,
): number {
  if (depth === 0 || state.isCheckmate || state.isStalemate) {
    return evaluate(state.board, botColor);
  }

  const turnColor = maximizing ? botColor : opponent(botColor);
  const moves = orderMoves(getAllMoves(state, turnColor), state.board);
  if (moves.length === 0) {
    return evaluate(state.board, botColor);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    let a = alpha;
    for (const move of moves) {
      const next = applyMove(state, move);
      const ev = minimax(next, depth - 1, a, beta, false, botColor);
      maxEval = Math.max(maxEval, ev);
      a = Math.max(a, ev);
      if (beta <= a) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  let b = beta;
  for (const move of moves) {
    const next = applyMove(state, move);
    const ev = minimax(next, depth - 1, alpha, b, true, botColor);
    minEval = Math.min(minEval, ev);
    b = Math.min(b, ev);
    if (b <= alpha) break;
  }
  return minEval;
}

function findBestMove(state: GameState, botColor: Color, depth: number): Move | null {
  const moves = orderMoves(getAllMoves(state, botColor), state.board);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = minimax(next, depth - 1, alpha, beta, false, botColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}

// ── Enhanced search (hard only) ───────────────────────────────────

function minimaxHard(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botColor: Color,
): number {
  if (depth === 0 || state.isCheckmate || state.isStalemate) {
    return evaluateHard(state.board, botColor);
  }

  const turnColor = maximizing ? botColor : opponent(botColor);
  const moves = getAllMoves(state, turnColor);
  if (moves.length === 0) {
    return evaluateHard(state.board, botColor);
  }
  const ordered = orderMovesHard(state, moves);

  if (maximizing) {
    let maxEval = -Infinity;
    let a = alpha;
    for (const { next } of ordered) {
      const ev = minimaxHard(next, depth - 1, a, beta, false, botColor);
      maxEval = Math.max(maxEval, ev);
      a = Math.max(a, ev);
      if (beta <= a) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  let b = beta;
  for (const { next } of ordered) {
    const ev = minimaxHard(next, depth - 1, alpha, b, true, botColor);
    minEval = Math.min(minEval, ev);
    b = Math.min(b, ev);
    if (b <= alpha) break;
  }
  return minEval;
}

function findBestMoveHard(state: GameState, botColor: Color, depth: number): Move | null {
  const moves = getAllMoves(state, botColor);
  if (moves.length === 0) return null;
  const ordered = orderMovesHard(state, moves);

  let bestMove = ordered[0].move;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const { move, next } of ordered) {
    const score = minimaxHard(next, depth - 1, alpha, beta, false, botColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}

ctx.onmessage = (e: MessageEvent<BotRequest>) => {
  const { state, botColor, depth, difficulty } = e.data;
  const bestMove = difficulty === 'hard'
    ? findBestMoveHard(state, botColor, depth)
    : findBestMove(state, botColor, depth);
  ctx.postMessage({ bestMove });
};
