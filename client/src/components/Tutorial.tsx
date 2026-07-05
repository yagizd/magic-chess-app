import { useMemo, useState } from 'react';
import type { Board as BoardType, Color, PieceType, Position } from '@shared/types';
import { getValidMoves } from '@shared/rules';
import { Preferences } from '@capacitor/preferences';

interface Props {
  onFinish: () => void;
}

interface DemoPiece {
  row: number;
  col: number;
  type: PieceType;
  color: Color;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANK1 = 7; // white back rank

const PIECE_CODE: Record<PieceType, string> = {
  king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: 'P',
};
const BASE = 'https://lichess1.org/assets/piece/cburnett/';
const pieceUrl = (color: Color, type: PieceType) =>
  `${BASE}${color === 'white' ? 'w' : 'b'}${PIECE_CODE[type]}.svg`;

function boardFrom(pieces: DemoPiece[]): BoardType {
  const board: BoardType = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const p of pieces) board[p.row][p.col] = { type: p.type, color: p.color, hasMoved: false };
  return board;
}

function MiniBoard({
  pieces, highlights, highlightCols,
}: {
  pieces: DemoPiece[];
  highlights: Position[];
  highlightCols?: number[];
}) {
  const pieceAt = (row: number, col: number) =>
    pieces.find((p) => p.row === row && p.col === col) ?? null;
  const isHighlighted = (row: number, col: number) =>
    highlights.some((h) => h.row === row && h.col === col);

  return (
    <div className="tutorial-board-wrap">
      <div className="board tutorial-board">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const light = (row + col) % 2 === 0;
            const piece = pieceAt(row, col);
            const cls = ['square', light ? 'light' : 'dark'].join(' ');
            return (
              <div key={`${row}-${col}`} className={cls}>
                {piece && (
                  <img
                    className="piece-img"
                    src={pieceUrl(piece.color, piece.type)}
                    alt={`${piece.color} ${piece.type}`}
                    draggable={false}
                  />
                )}
                {isHighlighted(row, col) && <span className="tutorial-pulse-dot" />}
              </div>
            );
          }),
        )}
      </div>
      <div className="files tutorial-files">
        {FILES.map((f, col) => (
          <span key={f} className={`coord${highlightCols?.includes(col) ? ' highlight' : ''}`}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Tutorial({ onFinish }: Props) {
  const [step, setStep] = useState(0);

  const finish = () => {
    Preferences.set({ key: 'tutorialDone', value: 'true' });
    onFinish();
  };

  const steps = useMemo(() => {
    const rookBoard = boardFrom([{ row: RANK1, col: 0, type: 'knight', color: 'white' }]);
    const knightBoard = boardFrom([{ row: RANK1, col: 1, type: 'bishop', color: 'white' }]);
    const bishopBoard = boardFrom([{ row: RANK1, col: 2, type: 'rook', color: 'white' }]);
    const naturalBoard = boardFrom([
      { row: RANK1, col: 3, type: 'queen', color: 'white' },
      { row: RANK1, col: 4, type: 'king', color: 'white' },
    ]);

    return [
      {
        text: "Magic Chess'te At, Fil ve Kale bulundukları sütuna göre farklı hareket eder.",
        pieces: [] as DemoPiece[],
        highlights: [] as Position[],
        highlightCols: [0, 1, 2, 3, 4, 5, 6, 7],
      },
      {
        text: "a ve h sütunlarındaki taşlar Kale gibi hareket eder.",
        pieces: rookBoard.flatMap((r, row) => r.flatMap((p, col) =>
          p ? [{ row, col, type: p.type, color: p.color }] : [])),
        highlights: getValidMoves(rookBoard, RANK1, 0, null).map((m) => m.to),
        highlightCols: [0, 7],
      },
      {
        text: "b ve g sütunlarındaki taşlar At gibi hareket eder.",
        pieces: knightBoard.flatMap((r, row) => r.flatMap((p, col) =>
          p ? [{ row, col, type: p.type, color: p.color }] : [])),
        highlights: getValidMoves(knightBoard, RANK1, 1, null).map((m) => m.to),
        highlightCols: [1, 6],
      },
      {
        text: "c ve f sütunlarındaki taşlar Fil gibi hareket eder.",
        pieces: bishopBoard.flatMap((r, row) => r.flatMap((p, col) =>
          p ? [{ row, col, type: p.type, color: p.color }] : [])),
        highlights: getValidMoves(bishopBoard, RANK1, 2, null).map((m) => m.to),
        highlightCols: [2, 5],
      },
      {
        text: "d ve e sütunlarındaki taşlar kendi doğal hareketiyle hareket eder.",
        pieces: naturalBoard.flatMap((r, row) => r.flatMap((p, col) =>
          p ? [{ row, col, type: p.type, color: p.color }] : [])),
        highlights: [
          ...getValidMoves(naturalBoard, RANK1, 3, null).map((m) => m.to),
          ...getValidMoves(naturalBoard, RANK1, 4, null).map((m) => m.to),
        ],
        highlightCols: [3, 4],
      },
    ];
  }, []);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-progress">
          <span className="tutorial-progress-label">{step + 1} / {steps.length}</span>
          <div className="tutorial-dots">
            {steps.map((_, i) => (
              <span key={i} className={`tutorial-dot${i <= step ? ' active' : ''}`} />
            ))}
          </div>
        </div>

        <MiniBoard
          pieces={current.pieces}
          highlights={current.highlights}
          highlightCols={current.highlightCols}
        />

        <p className="tutorial-text">{current.text}</p>

        <div className="tutorial-actions">
          <button className="home-btn ghost" onClick={finish}>Atla</button>
          {isLast ? (
            <button className="home-btn primary" onClick={finish}>
              Oyuna Başla
            </button>
          ) : (
            <button className="home-btn primary" onClick={() => setStep((s) => s + 1)}>
              İleri →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
