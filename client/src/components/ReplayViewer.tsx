import { useMemo, useState } from 'react';
import { applyMove, createInitialGameState } from '@shared/rules';
import type { GameState, Move, RecordedMove } from '@shared/types';
import { Board } from './Board';
import { MoveHistory } from './MoveHistory';

interface Props {
  moves: Move[];
  recordedMoves: RecordedMove[];
  startPly: number;
  onExit: () => void;
}

export function ReplayViewer({ moves, recordedMoves, startPly, onExit }: Props) {
  const states = useMemo(() => {
    let s = createInitialGameState();
    const arr: GameState[] = [s];
    for (const move of moves) {
      s = applyMove(s, move);
      arr.push(s);
    }
    return arr;
  }, [moves]);

  const [ply, setPly] = useState(() => Math.min(Math.max(startPly, 0), moves.length));

  const current = states[ply];
  const lastMove = ply > 0 ? moves[ply - 1] : null;

  const goStart = () => setPly(0);
  const goEnd = () => setPly(moves.length);
  const goPrev = () => setPly((p) => Math.max(0, p - 1));
  const goNext = () => setPly((p) => Math.min(moves.length, p + 1));

  return (
    <div className="app replay-mode">
      <Board
        board={current.board}
        selected={null}
        validMoves={[]}
        lastMove={lastMove}
        isCheck={current.isCheck}
        currentTurn={current.currentTurn}
        premove={null}
        onSquareClick={() => {}}
        onDragMove={() => {}}
      />
      <aside className="sidebar replay-sidebar">
        <h1>REPLAY</h1>
        <MoveHistory
          moves={recordedMoves}
          activeIndex={ply > 0 ? ply - 1 : undefined}
          onSelectMove={(idx) => setPly(idx + 1)}
        />
        <div className="replay-controls">
          <button type="button" onClick={goStart} disabled={ply === 0}>|◀</button>
          <button type="button" onClick={goPrev} disabled={ply === 0}>◀</button>
          <button type="button" onClick={goNext} disabled={ply === moves.length}>▶</button>
          <button type="button" onClick={goEnd} disabled={ply === moves.length}>▶|</button>
        </div>
        <button className="reset-btn ghost mt" onClick={onExit}>Oyuna Dön</button>
      </aside>
    </div>
  );
}
