import { useEffect, useRef } from 'react';
import type { RecordedMove } from '@shared/types';

interface Props {
  moves: RecordedMove[];
  /** Ply index (0-based) to highlight. Defaults to the last move. */
  activeIndex?: number;
  onSelectMove?: (index: number) => void;
}

interface Row {
  num: number;
  white?: RecordedMove;
  whiteIdx?: number;
  black?: RecordedMove;
  blackIdx?: number;
}

export function MoveHistory({ moves, activeIndex, onSelectMove }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [moves.length]);

  const rows: Row[] = [];
  moves.forEach((m, i) => {
    let row = rows[rows.length - 1];
    if (!row || row.num !== m.moveNumber) {
      row = { num: m.moveNumber };
      rows.push(row);
    }
    if (m.color === 'white') {
      row.white = m;
      row.whiteIdx = i;
    } else {
      row.black = m;
      row.blackIdx = i;
    }
  });

  const active = activeIndex ?? moves.length - 1;

  return (
    <div className="move-history" ref={listRef}>
      {moves.length === 0 && <div className="mh-empty">Henüz hamle yok</div>}
      {rows.map((row) => (
        <div className="mh-row" key={row.num}>
          <span className="mh-num">{row.num}.</span>
          <button
            type="button"
            className={`mh-move${row.whiteIdx === active ? ' active' : ''}`}
            disabled={!onSelectMove || row.whiteIdx === undefined}
            onClick={() => row.whiteIdx !== undefined && onSelectMove?.(row.whiteIdx)}
          >
            {row.white?.notation ?? ''}
          </button>
          <button
            type="button"
            className={`mh-move${row.blackIdx === active ? ' active' : ''}`}
            disabled={!onSelectMove || row.blackIdx === undefined}
            onClick={() => row.blackIdx !== undefined && onSelectMove?.(row.blackIdx)}
          >
            {row.black?.notation ?? ''}
          </button>
        </div>
      ))}
    </div>
  );
}
