import { useMemo } from 'react';
import type { Board as BoardType, Move, Piece, Position } from '@shared/types';
import { findKing, getMovementType } from '@shared/rules';

interface Props {
  board: BoardType;
  selected: Position | null;
  validMoves: Move[];
  lastMove: Move | null;
  isCheck: boolean;
  currentTurn: 'white' | 'black';
  flipBoard?: boolean;
  onSquareClick: (row: number, col: number) => void;
}

const PIECE_CODE: Record<Piece['type'], string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};

const BASE = 'https://lichess1.org/assets/piece/cburnett/';
const pieceUrl = (color: Piece['color'], type: Piece['type']) =>
  `${BASE}${color === 'white' ? 'w' : 'b'}${PIECE_CODE[type]}.svg`;

function colTintClass(piece: Piece | null, col: number): string {
  if (!piece) return '';
  if (piece.type !== 'rook' && piece.type !== 'bishop' && piece.type !== 'knight') return '';
  const mv = getMovementType(piece, col);
  if (mv === 'rook') return 'tint-rook';
  if (mv === 'knight') return 'tint-knight';
  if (mv === 'bishop') return 'tint-bishop';
  return '';
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board({
  board, selected, validMoves, lastMove, isCheck, currentTurn, flipBoard, onSquareClick,
}: Props) {
  const targets = useMemo(() => {
    const s = new Set<string>();
    for (const m of validMoves) s.add(`${m.to.row},${m.to.col}`);
    return s;
  }, [validMoves]);

  const checkedKing = isCheck ? findKing(board, currentTurn) : null;
  const rows = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="board-wrap">
      {/* Rank labels */}
      <div className="ranks">
        {rows.map((row) => (
          <span key={row} className="rank-label">{8 - row}</span>
        ))}
      </div>

      {/* Squares */}
      <div className="board">
        {rows.map((row) =>
          cols.map((col) => {
            const piece = board[row][col];
            const light = (row + col) % 2 === 0;
            const isSel = selected?.row === row && selected?.col === col;
            const isTarget = targets.has(`${row},${col}`);
            const isCapture = isTarget && piece !== null && piece.color !== currentTurn;
            const isLastFrom = lastMove?.from.row === row && lastMove?.from.col === col;
            const isLastTo   = lastMove?.to.row === row && lastMove?.to.col === col;
            const isChkKing  = checkedKing?.row === row && checkedKing?.col === col;

            const cls = [
              'square',
              light ? 'light' : 'dark',
              colTintClass(piece, col),
              isSel ? 'selected' : '',
              !isSel && isLastFrom ? 'last-from' : '',
              !isSel && isLastTo   ? 'last-to'   : '',
              isChkKing ? 'check' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${row}-${col}`}
                className={cls}
                onClick={() => onSquareClick(row, col)}
              >
                {piece && (
                  <img
                    className="piece-img"
                    src={pieceUrl(piece.color, piece.type)}
                    alt={`${piece.color} ${piece.type}`}
                    draggable={false}
                  />
                )}
                {isTarget && !isCapture && <span className="move-dot" />}
                {isCapture && <span className="capture-ring" />}
              </div>
            );
          }),
        )}
      </div>

      {/* File labels */}
      <div className="files">
        {cols.map((col) => (
          <span key={col} className="coord">{FILES[col]}</span>
        ))}
      </div>
    </div>
  );
}
