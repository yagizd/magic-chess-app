import type {
  Board,
  Color,
  GameState,
  Move,
  Piece,
  PieceType,
  Position,
  PromotionType,
} from './types.js';

const PROMOTION_TYPES: PromotionType[] = ['queen', 'rook', 'bishop', 'knight'];

const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  ...ROOK_DIRS, ...BISHOP_DIRS,
];
const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [2, 1], [2, -1], [-2, 1], [-2, -1],
  [1, 2], [1, -2], [-1, 2], [-1, -2],
];
const KING_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const inBounds = (r: number, c: number): boolean =>
  r >= 0 && r < 8 && c >= 0 && c < 8;

const opposite = (color: Color): Color => (color === 'white' ? 'black' : 'white');

/**
 * Magic Chess sütun kuralı: rook/bishop/knight sütuna göre hareket eder.
 * king/queen/pawn her zaman kendi tipidir.
 */
export function getMovementType(piece: Piece, col: number): PieceType {
  if (piece.type === 'king' || piece.type === 'queen' || piece.type === 'pawn') {
    return piece.type;
  }
  if (col === 0 || col === 7) return 'rook';
  if (col === 1 || col === 6) return 'knight';
  if (col === 2 || col === 5) return 'bishop';
  return piece.type;
}

export function createInitialBoard(): Board {
  const back: PieceType[] = [
    'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
  ];
  const board: Board = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'black', hasMoved: false };
    board[1][c] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][c] = { type: 'pawn', color: 'white', hasMoved: false };
    board[7][c] = { type: back[c], color: 'white', hasMoved: false };
  }
  return board;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentTurn: 'white',
    moveHistory: [],
    enPassantTarget: null,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    winner: null,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function pawnAttackTargets(row: number, col: number, color: Color): Position[] {
  const dir = color === 'white' ? -1 : 1;
  const out: Position[] = [];
  for (const dc of [-1, 1]) {
    const r = row + dir;
    const c = col + dc;
    if (inBounds(r, c)) out.push({ row: r, col: c });
  }
  return out;
}

function slidingTargets(
  board: Board,
  row: number,
  col: number,
  dirs: ReadonlyArray<readonly [number, number]>,
): Position[] {
  const out: Position[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      out.push({ row: r, col: c });
      if (board[r][c]) break;
      r += dr;
      c += dc;
    }
  }
  return out;
}

/**
 * Bir taşın "kontrol ettiği" / saldırı altında tuttuğu kareler.
 * Şah tehdidi tespiti için kullanılır. (kale/koşan rok hareketi içermez)
 */
export function getAttackedSquares(board: Board, row: number, col: number): Position[] {
  const piece = board[row][col];
  if (!piece) return [];
  const movement = getMovementType(piece, col);
  switch (movement) {
    case 'rook': return slidingTargets(board, row, col, ROOK_DIRS);
    case 'bishop': return slidingTargets(board, row, col, BISHOP_DIRS);
    case 'queen': return slidingTargets(board, row, col, QUEEN_DIRS);
    case 'knight':
      return KNIGHT_OFFSETS
        .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
        .filter((p) => inBounds(p.row, p.col));
    case 'king':
      return KING_OFFSETS
        .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
        .filter((p) => inBounds(p.row, p.col));
    case 'pawn':
      return pawnAttackTargets(row, col, piece.color);
  }
}

export function isSquareAttacked(
  board: Board,
  row: number,
  col: number,
  byColor: Color,
): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== byColor) continue;
      const targets = getAttackedSquares(board, r, c);
      for (const t of targets) {
        if (t.row === row && t.col === col) return true;
      }
    }
  }
  return false;
}

export function findKing(board: Board, color: Color): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

export function isKingInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.row, king.col, opposite(color));
}

function pushPawnMoves(
  moves: Move[],
  from: Position,
  to: Position,
  promoteRow: number,
  extra: { isEnPassant?: boolean } = {},
): void {
  if (to.row === promoteRow) {
    for (const promotion of PROMOTION_TYPES) {
      moves.push({ from, to, promotion, ...extra });
    }
  } else {
    moves.push({ from, to, ...extra });
  }
}

function getPseudoLegalMoves(
  board: Board,
  row: number,
  col: number,
  enPassantTarget: Position | null,
): Move[] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: Move[] = [];
  const from: Position = { row, col };
  const movement = getMovementType(piece, col);

  const slide = (dirs: ReadonlyArray<readonly [number, number]>) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ from, to: { row: r, col: c } });
        } else {
          if (target.color !== piece.color) {
            moves.push({ from, to: { row: r, col: c } });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  };

  switch (movement) {
    case 'rook': slide(ROOK_DIRS); break;
    case 'bishop': slide(BISHOP_DIRS); break;
    case 'queen': slide(QUEEN_DIRS); break;
    case 'knight':
      for (const [dr, dc] of KNIGHT_OFFSETS) {
        const r = row + dr, c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ from, to: { row: r, col: c } });
        }
      }
      break;
    case 'king':
      for (const [dr, dc] of KING_OFFSETS) {
        const r = row + dr, c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ from, to: { row: r, col: c } });
        }
      }
      break;
    case 'pawn': {
      const dir = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;
      const promoteRow = piece.color === 'white' ? 0 : 7;

      // Forward 1
      const r1 = row + dir;
      if (inBounds(r1, col) && !board[r1][col]) {
        pushPawnMoves(moves, from, { row: r1, col }, promoteRow);
        // Forward 2
        const r2 = row + 2 * dir;
        if (row === startRow && inBounds(r2, col) && !board[r2][col]) {
          moves.push({ from, to: { row: r2, col } });
        }
      }

      // Captures (diagonal)
      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (target && target.color !== piece.color) {
          pushPawnMoves(moves, from, { row: r, col: c }, promoteRow);
        } else if (
          !target &&
          enPassantTarget &&
          enPassantTarget.row === r &&
          enPassantTarget.col === c
        ) {
          moves.push({ from, to: { row: r, col: c }, isEnPassant: true });
        }
      }
      break;
    }
  }

  return moves;
}

function getCastlingMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = [];
  const row = color === 'white' ? 7 : 0;
  const king = board[row][4];
  if (!king || king.type !== 'king' || king.color !== color || king.hasMoved) return moves;
  const enemy = opposite(color);
  if (isSquareAttacked(board, row, 4, enemy)) return moves;

  // King-side: rook on col 7, king e->g (4->6), rook h->f (7->5)
  const rookK = board[row][7];
  if (
    rookK && rookK.type === 'rook' && rookK.color === color && !rookK.hasMoved &&
    !board[row][5] && !board[row][6] &&
    !isSquareAttacked(board, row, 5, enemy) &&
    !isSquareAttacked(board, row, 6, enemy)
  ) {
    moves.push({ from: { row, col: 4 }, to: { row, col: 6 }, isCastling: true });
  }

  // Queen-side: rook on col 0, king e->c (4->2), rook a->d (0->3)
  const rookQ = board[row][0];
  if (
    rookQ && rookQ.type === 'rook' && rookQ.color === color && !rookQ.hasMoved &&
    !board[row][1] && !board[row][2] && !board[row][3] &&
    !isSquareAttacked(board, row, 3, enemy) &&
    !isSquareAttacked(board, row, 2, enemy)
  ) {
    moves.push({ from: { row, col: 4 }, to: { row, col: 2 }, isCastling: true });
  }

  return moves;
}

function simulateMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  next[move.to.row][move.to.col] = piece;
  next[move.from.row][move.from.col] = null;

  if (move.isEnPassant) {
    // Captured pawn sits at (from.row, to.col)
    next[move.from.row][move.to.col] = null;
  }
  if (move.isCastling) {
    if (move.to.col === 6) {
      next[move.to.row][5] = next[move.to.row][7];
      next[move.to.row][7] = null;
    } else {
      next[move.to.row][3] = next[move.to.row][0];
      next[move.to.row][0] = null;
    }
  }
  if (move.promotion && piece) {
    piece.type = move.promotion;
  }
  return next;
}

export function getValidMoves(
  board: Board,
  row: number,
  col: number,
  enPassantTarget: Position | null,
): Move[] {
  const piece = board[row][col];
  if (!piece) return [];
  let moves = getPseudoLegalMoves(board, row, col, enPassantTarget);
  if (piece.type === 'king') {
    moves = moves.concat(getCastlingMoves(board, piece.color));
  }
  return moves.filter((m) => {
    const next = simulateMove(board, m);
    return !isKingInCheck(next, piece.color);
  });
}

function hasAnyLegalMove(
  board: Board,
  color: Color,
  enPassantTarget: Position | null,
): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      if (getValidMoves(board, r, c, enPassantTarget).length > 0) return true;
    }
  }
  return false;
}

export function isCheckmate(
  board: Board,
  color: Color,
  enPassantTarget: Position | null = null,
): boolean {
  if (!isKingInCheck(board, color)) return false;
  return !hasAnyLegalMove(board, color, enPassantTarget);
}

export function isStalemate(
  board: Board,
  color: Color,
  enPassantTarget: Position | null = null,
): boolean {
  if (isKingInCheck(board, color)) return false;
  return !hasAnyLegalMove(board, color, enPassantTarget);
}

export function applyMove(state: GameState, move: Move): GameState {
  const movingPiece = state.board[move.from.row][move.from.col];
  if (!movingPiece) {
    throw new Error('applyMove: source square is empty');
  }

  const newBoard = simulateMove(state.board, move);
  const landed = newBoard[move.to.row][move.to.col];
  if (landed) landed.hasMoved = true;
  if (move.isCastling) {
    const rookCol = move.to.col === 6 ? 5 : 3;
    const rook = newBoard[move.to.row][rookCol];
    if (rook) rook.hasMoved = true;
  }

  let enPassantTarget: Position | null = null;
  if (
    movingPiece.type === 'pawn' &&
    Math.abs(move.to.row - move.from.row) === 2
  ) {
    enPassantTarget = {
      row: (move.from.row + move.to.row) / 2,
      col: move.from.col,
    };
  }

  const nextTurn: Color = opposite(state.currentTurn);
  const isCheck = isKingInCheck(newBoard, nextTurn);
  const noMoves = !hasAnyLegalMove(newBoard, nextTurn, enPassantTarget);
  const isCheckmateNow = isCheck && noMoves;
  const isStalemateNow = !isCheck && noMoves;

  return {
    board: newBoard,
    currentTurn: nextTurn,
    moveHistory: [...state.moveHistory, move],
    enPassantTarget,
    isCheck,
    isCheckmate: isCheckmateNow,
    isStalemate: isStalemateNow,
    isDraw: isStalemateNow,
    winner: isCheckmateNow ? state.currentTurn : null,
  };
}

// --- Helpers exposed for tests ---
export const __testing = {
  getPseudoLegalMoves,
  getCastlingMoves,
  simulateMove,
};
