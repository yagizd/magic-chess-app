import { useEffect, useState } from 'react';
import type { Color, GameState } from '@shared/types';
import type { TimeSync } from '../hooks/useOnlineGame';

interface Props {
  state: GameState;
  playerColor?: Color | null;
  isOnline?: boolean;
  onReset: () => void;
  onResign?: () => void;
  onHome: () => void;
  timeSync?: TimeSync | null;
  rematchRequestedByMe?: boolean;
  rematchRequestedByOpponent?: boolean;
  onRequestRematch?: () => void;
}

export function GameInfo({ 
  state, playerColor, isOnline, onReset, onResign, onHome,
  timeSync, rematchRequestedByMe, rematchRequestedByOpponent, onRequestRematch
}: Props) {
  const turn = state.currentTurn;
  const turnLabel = turn === 'white' ? 'Beyaz' : 'Siyah';

  let statusText = '';
  if (state.isTimeout) statusText = `${state.winner === 'white' ? 'Beyaz' : 'Siyah'} kazandı — Süre bitti`;
  else if (state.isCheckmate) statusText = `${state.winner === 'white' ? 'Beyaz' : 'Siyah'} kazandı — Şah mat`;
  else if (state.isStalemate) statusText = 'Pat — beraberlik';
  else if (state.isCheck) statusText = `${turnLabel} şahta!`;

  const myTurn = !isOnline || playerColor === turn;
  const gameActive = !state.isCheckmate && !state.isStalemate && !state.isTimeout;

  return (
    <aside className="sidebar">
      <h1>MAGIC CHESS</h1>

      {isOnline && playerColor && (
        <div className="player-badge">
          <span className={`turn-dot ${playerColor}`} />
          <span>{playerColor === 'white' ? 'Beyaz' : 'Siyah'} olarak oynuyorsun</span>
        </div>
      )}

      {timeSync && (
        <div className="clocks-container">
          <Clock 
            color={playerColor === 'white' ? 'black' : 'white'} // Top clock is opponent
            timeMs={playerColor === 'white' ? timeSync.blackTimeMs : timeSync.whiteTimeMs}
            isActive={turn !== playerColor && gameActive}
            lastMoveTimestamp={timeSync.lastMoveTimestamp}
            isGameActive={gameActive}
          />
          <Clock 
            color={playerColor || 'white'} // Bottom clock is player
            timeMs={playerColor === 'white' ? timeSync.whiteTimeMs : timeSync.blackTimeMs}
            isActive={turn === playerColor && gameActive}
            lastMoveTimestamp={timeSync.lastMoveTimestamp}
            isGameActive={gameActive}
          />
        </div>
      )}

      <div className="turn-badge">
        <span className={`turn-dot ${turn}`} />
        <span>
          {!gameActive
            ? 'Oyun bitti'
            : myTurn
              ? `${turnLabel}'ın sırası${isOnline && playerColor === turn ? ' — senin sıran!' : ''}`
              : 'Rakip düşünüyor…'}
        </span>
      </div>

      {statusText && <div className="status-text">{statusText}</div>}

      <div className="action-row">
        {isOnline ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {gameActive ? (
              <>
                {onResign && <button className="reset-btn danger" onClick={onResign}>Teslim Ol</button>}
                <button className="reset-btn" onClick={onHome}>Ana Menü</button>
              </>
            ) : (
              <>
                {rematchRequestedByMe ? (
                  <button className="reset-btn ghost" disabled>Rakip bekleniyor...</button>
                ) : rematchRequestedByOpponent ? (
                  <button className="reset-btn" style={{ backgroundColor: '#2e7d32', color: 'white' }} onClick={onRequestRematch}>Rakip rövanş istiyor! Kabul Et</button>
                ) : (
                  <button className="reset-btn" onClick={onRequestRematch}>Rövanş İste</button>
                )}
                <button className="reset-btn ghost" onClick={onHome}>Ana Menü</button>
              </>
            )}
          </div>
        ) : (
          <>
            <button className="reset-btn" onClick={onReset}>Yeni Oyun</button>
            <button className="reset-btn ghost" onClick={onHome}>Ana Menü</button>
          </>
        )}
      </div>

      <hr className="divider" />

      <p className="legend-title">Sütun Kuralları</p>
      <ul className="legend-list">
        <li><span className="swatch sw-rook" /> a, h → Kale gibi</li>
        <li><span className="swatch sw-knight" /> b, g → At gibi</li>
        <li><span className="swatch sw-bishop" /> c, f → Fil gibi</li>
        <li><span className="swatch sw-nat" /> d, e → Doğal hareket</li>
      </ul>
      <p className="legend-note">
        At · Fil · Kale hangi sütundaysa o kuralı uygular.<br />
        Şah · Vezir · Piyon her zaman kendi gibi hareket eder.
      </p>
    </aside>
  );
}

function formatTime(ms: number) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0 && ms < 10000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `0:0${s}.${tenths}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Clock({ color, timeMs, isActive, lastMoveTimestamp, isGameActive }: { color: Color, timeMs: number, isActive: boolean, lastMoveTimestamp: number, isGameActive: boolean }) {
  const [displayMs, setDisplayMs] = useState(timeMs);

  useEffect(() => {
    setDisplayMs(timeMs);
    if (!isActive || !isGameActive || lastMoveTimestamp === 0) return;

    let animationFrame: number;
    const update = () => {
      const elapsed = Date.now() - lastMoveTimestamp;
      setDisplayMs(Math.max(0, timeMs - elapsed));
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrame);
  }, [timeMs, isActive, lastMoveTimestamp, isGameActive]);

  const timeStr = formatTime(displayMs);
  return (
    <div className={`clock ${isActive ? 'active' : ''} ${color}`}>
      {timeStr}
    </div>
  );
}
