import { useMemo, useRef, useState, useCallback } from 'react';
import type { Board as BoardType, Move, Piece, Position } from '@shared/types';
import { findKing } from '@shared/rules';

interface Props {
  board: BoardType;
  selected: Position | null;
  validMoves: Move[];
  lastMove: Move | null;
  isCheck: boolean;
  currentTurn: 'white' | 'black';
  flipBoard?: boolean;
  premove: Move | null;
  onSquareClick: (row: number, col: number) => void;
  onDragMove: (from: Position, to: Position) => void;
  onRightClick?: () => void;
}

const PIECE_CODE: Record<Piece['type'], string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};

const BASE = 'https://lichess1.org/assets/piece/cburnett/';
const pieceUrl = (color: Piece['color'], type: Piece['type']) =>
  `${BASE}${color === 'white' ? 'w' : 'b'}${PIECE_CODE[type]}.svg`;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board({
  board, selected, validMoves, lastMove, isCheck, currentTurn, flipBoard, premove,
  onSquareClick, onDragMove, onRightClick,
}: Props) {
  const targets = useMemo(() => {
    const s = new Set<string>();
    for (const m of validMoves) s.add(`${m.to.row},${m.to.col}`);
    return s;
  }, [validMoves]);

  const checkedKing = isCheck ? findKing(board, currentTurn) : null;
  const rows = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Drag state
  const [dragging, setDragging] = useState<Position | null>(null);
  const [dragOver, setDragOver] = useState<Position | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<{ piece: Piece | null; from: Position | null }>({ piece: null, from: null });

  const getSquareFromPoint = useCallback((clientX: number, clientY: number): Position | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sqSize = rect.width / 8;
    const fileIdx = Math.floor(x / sqSize);
    const rankIdx = Math.floor(y / sqSize);
    if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return null;
    const col = flipBoard ? 7 - fileIdx : fileIdx;
    const row = flipBoard ? 7 - rankIdx : rankIdx;
    return { row, col };
  }, [flipBoard]);

  const handlePointerDown = useCallback((e: React.PointerEvent, row: number, col: number) => {
    // Prevent default to avoid double-firing touch/mouse events
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Only left clicks
    e.preventDefault();
    const piece = board[row][col];
    
    if (!piece) {
      // Clicked an empty square -> just trigger click, no drag
      onSquareClick(row, col);
      return;
    }
    
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({ row, col });
    setDragOver({ row, col });
    setGhostPos({ x: e.clientX, y: e.clientY });
    ghostRef.current = { piece, from: { row, col } };
  }, [board, onSquareClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    setGhostPos({ x: e.clientX, y: e.clientY });
    const sq = getSquareFromPoint(e.clientX, e.clientY);
    if (sq) setDragOver(sq);
  }, [dragging, getSquareFromPoint]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const to = getSquareFromPoint(e.clientX, e.clientY);
    const from = ghostRef.current.from;

    if (to && from) {
      if (to.row === from.row && to.col === from.col) {
        // Dropped on same square → treat as click
        onSquareClick(from.row, from.col);
      } else {
        onDragMove(from, to);
      }
    }

    setDragging(null);
    setDragOver(null);
    setGhostPos(null);
    ghostRef.current = { piece: null, from: null };
  }, [dragging, getSquareFromPoint, onSquareClick, onDragMove]);

  const isDragTarget = dragOver && dragging &&
    (dragOver.row !== dragging.row || dragOver.col !== dragging.col);
  const dragTargetKey = isDragTarget ? `${dragOver!.row},${dragOver!.col}` : null;

  return (
    <div className="board-wrap">
      {/* Rank labels */}
      <div className="ranks">
        {rows.map((row) => (
          <span key={row} className="rank-label">{8 - row}</span>
        ))}
      </div>

      {/* Squares */}
      <div
        className={`board${dragging ? ' board--dragging' : ''}`}
        ref={boardRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          onRightClick?.();
        }}
      >
        {rows.map((row) =>
          cols.map((col) => {
            const piece = board[row][col];
            const light = (row + col) % 2 === 0;
            const isSel = selected?.row === row && selected?.col === col;
            const isTarget = targets.has(`${row},${col}`);
            const isCapture = isTarget && piece !== null && piece.color !== currentTurn;
            const isLastFrom = lastMove?.from.row === row && lastMove?.from.col === col;
            const isLastTo   = lastMove?.to.row   === row && lastMove?.to.col   === col;
            const isChkKing  = checkedKing?.row === row && checkedKing?.col === col;
            const isDragFrom = dragging?.row === row && dragging?.col === col;
            const isDragOver = dragTargetKey === `${row},${col}`;
            const isPremoveFrom = premove?.from.row === row && premove?.from.col === col;
            const isPremoveTo   = premove?.to.row   === row && premove?.to.col   === col;

            const cls = [
              'square',
              light ? 'light' : 'dark',
              isSel ? 'selected' : '',
              !isSel && isLastFrom ? 'last-from' : '',
              !isSel && isLastTo   ? 'last-to'   : '',
              isChkKing ? 'check' : '',
              isDragFrom ? 'drag-source' : '',
              isDragOver ? 'drag-over' : '',
              isPremoveFrom ? 'premove-from' : '',
              isPremoveTo   ? 'premove-to'   : '',
            ].filter(Boolean).join(' ');

            const showPiece = piece && !isDragFrom;

            return (
              <div
                key={`${row}-${col}`}
                className={cls}
                onPointerDown={(e) => handlePointerDown(e, row, col)}
              >
                {showPiece && (
                  <img
                    className="piece-img"
                    src={pieceUrl(piece.color, piece.type)}
                    alt={`${piece.color} ${piece.type}`}
                    draggable={false}
                  />
                )}
                {/* If dragging this piece, show ghost placeholder */}
                {isDragFrom && piece && (
                  <img
                    className="piece-img piece-ghost"
                    src={pieceUrl(piece.color, piece.type)}
                    alt=""
                    draggable={false}
                  />
                )}
                {isTarget && !isCapture && <span className="move-dot" />}
                {isCapture && (
                  <span className="capture-corners">
                    <span className="cc tl" />
                    <span className="cc tr" />
                    <span className="cc bl" />
                    <span className="cc br" />
                  </span>
                )}
                {isDragOver && !isCapture && targets.has(`${row},${col}`) && <span className="move-dot" />}
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

      {/* Dragging ghost image following cursor */}
      {dragging && ghostPos && ghostRef.current.piece && (
        <img
          className="drag-ghost"
          src={pieceUrl(ghostRef.current.piece.color, ghostRef.current.piece.type)}
          alt=""
          draggable={false}
          style={{
            left: ghostPos.x,
            top: ghostPos.y,
          }}
        />
      )}
    </div>
  );
}
