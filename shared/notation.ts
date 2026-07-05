import { applyMove, createInitialGameState, getMovementType } from './rules.js';
import type { Board, GameState, Move, Piece, PieceType, Position, RecordedMove } from './types.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_LETTER: Record<PieceType, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '',
};

export function squareName(pos: Position): string {
  return `${FILES[pos.col]}${8 - pos.row}`;
}

export function getEffectiveMovement(
  piece: Piece,
  col: number,
): 'rook' | 'bishop' | 'knight' | 'natural' {
  const movement = getMovementType(piece, col);
  return movement === piece.type ? 'natural' : (movement as 'rook' | 'bishop' | 'knight');
}

export function formatMoveNotation(preBoard: Board, move: Move, postState: GameState): string {
  const piece = preBoard[move.from.row][move.from.col];
  if (!piece) return '';

  const suffix = postState.isCheckmate ? '#' : postState.isCheck ? '+' : '';

  if (move.isCastling) {
    return (move.to.col === 6 ? 'O-O' : 'O-O-O') + suffix;
  }

  const movementType = getMovementType(piece, move.from.col);
  const captured = move.isEnPassant ? 'pawn' : preBoard[move.to.row][move.to.col]?.type;

  let notation = PIECE_LETTER[movementType];
  if (captured) notation += 'x';
  notation += squareName(move.to);
  if (move.promotion) notation += `=${PIECE_LETTER[move.promotion]}`;
  notation += suffix;

  return notation;
}

export function buildRecordedMove(
  preState: GameState,
  move: Move,
  postState: GameState,
): RecordedMove {
  const piece = preState.board[move.from.row][move.from.col];
  if (!piece) throw new Error('buildRecordedMove: source square is empty');

  const captured = move.isEnPassant
    ? 'pawn'
    : preState.board[move.to.row][move.to.col]?.type;

  const ply = preState.moveHistory.length;

  return {
    moveNumber: Math.floor(ply / 2) + 1,
    color: preState.currentTurn,
    piece: piece.type,
    from: move.from,
    to: move.to,
    effectiveMovement: getEffectiveMovement(piece, move.from.col),
    captured,
    isCheck: postState.isCheck,
    isCheckmate: postState.isCheckmate,
    promotion: move.promotion,
    notation: formatMoveNotation(preState.board, move, postState),
    timestamp: Date.now(),
  };
}

/** Replays a full move list from the initial position and returns the recorded move log. */
export function buildRecordedMoveHistory(moves: Move[]): RecordedMove[] {
  let state = createInitialGameState();
  const recorded: RecordedMove[] = [];
  for (const move of moves) {
    const next = applyMove(state, move);
    recorded.push(buildRecordedMove(state, move, next));
    state = next;
  }
  return recorded;
}
