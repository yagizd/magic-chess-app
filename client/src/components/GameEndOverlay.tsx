import type { GameState } from '@shared/types';

interface Props {
  state: GameState;
  onReplay: () => void;
  onNewGame?: () => void;
  onHome: () => void;
}

export function GameEndOverlay({ state, onReplay, onNewGame, onHome }: Props) {
  const gameOver = state.isCheckmate || state.isStalemate || state.isTimeout;
  if (!gameOver) return null;

  const winnerLabel = state.winner === 'white' ? 'Beyaz' : state.winner === 'black' ? 'Siyah' : null;
  const title = winnerLabel ? `${winnerLabel} Kazandı!` : 'Berabere';
  const reason = state.isTimeout ? 'Süre bitimi' : state.isCheckmate ? 'Mat ile' : 'Pat ile';

  return (
    <div className="overlay">
      <div className="overlay-card">
        <h2>{title}</h2>
        <p className="overlay-sub">{reason} · {state.moveHistory.length} hamle</p>
        <div className="overlay-actions">
          <button className="reset-btn" onClick={onReplay}>Replay'i İzle</button>
          {onNewGame && <button className="reset-btn" onClick={onNewGame}>Yeni Oyun</button>}
          <button className="reset-btn ghost" onClick={onHome}>Ana Menü</button>
        </div>
      </div>
    </div>
  );
}
