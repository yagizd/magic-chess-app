import { useEffect, useState } from 'react';
import type { Color, GameState, RecordedMove } from '@shared/types';
import type { TimeSync } from '../hooks/useOnlineGame';
import { MoveHistory } from './MoveHistory';

interface Props {
  state: GameState;
  playerColor?: Color | null;
  isOnline?: boolean;
  isBot?: boolean;
  onReset: () => void;
  onResign?: () => void;
  onHome: () => void;
  timeSync?: TimeSync | null;
  rematchRequestedByMe?: boolean;
  rematchRequestedByOpponent?: boolean;
  onRequestRematch?: () => void;
  moves?: RecordedMove[];
  onSelectMove?: (index: number) => void;
}

export function GameInfo({
  state, playerColor, isOnline, isBot, onReset, onResign, onHome,
  timeSync, rematchRequestedByMe, rematchRequestedByOpponent, onRequestRematch,
  moves, onSelectMove,
}: Props) {
  const turn = state.currentTurn;
  const turnLabel = turn === 'white' ? 'Beyaz' : 'Siyah';

  let statusText = '';
  if (state.isTimeout) statusText = `${state.winner === 'white' ? 'Beyaz' : 'Siyah'} kazandı — Süre bitti`;
  else if (state.isCheckmate) statusText = `${state.winner === 'white' ? 'Beyaz' : 'Siyah'} kazandı — Şah mat`;
  else if (state.isStalemate) statusText = 'Pat — beraberlik';
  else if (state.isCheck) statusText = `${turnLabel} şahta!`;

  const myTurn = isBot ? turn === (playerColor || 'white') : (!isOnline || playerColor === turn);
  const gameActive = !state.isCheckmate && !state.isStalemate && !state.isTimeout;

  const opponentColor: Color = playerColor === 'white' ? 'black' : 'white';
  const myColor: Color = playerColor || 'white';
  const opponentLabel = opponentColor === 'white' ? 'Beyaz' : 'Siyah';
  const myLabel = isOnline ? (myColor === 'white' ? 'Beyaz' : 'Siyah') : 'Sen';

  const turnLabelText = !gameActive
    ? 'Oyun bitti'
    : myTurn
      ? 'Senin sıran'
      : 'Rakip düşünüyor…';

  const actionButtons = isOnline ? (
    gameActive ? (
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
    )
  ) : (
    <>
      <button className="reset-btn" onClick={onReset}>Yeni Oyun</button>
      <button className="reset-btn ghost" onClick={onHome}>Ana Menü</button>
    </>
  );

  return (
    <div className="game-info">
      <div className="gi-bar gi-bar-opponent">
        <span className="bar-name">{opponentLabel}</span>
        {timeSync && (
          <Clock
            color={opponentColor}
            timeMs={opponentColor === 'white' ? timeSync.whiteTimeMs : timeSync.blackTimeMs}
            isActive={turn === opponentColor && gameActive}
            lastMoveTimestamp={timeSync.lastMoveTimestamp}
            isGameActive={gameActive}
          />
        )}
      </div>

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
              color={opponentColor}
              timeMs={opponentColor === 'white' ? timeSync.whiteTimeMs : timeSync.blackTimeMs}
              isActive={turn === opponentColor && gameActive}
              lastMoveTimestamp={timeSync.lastMoveTimestamp}
              isGameActive={gameActive}
            />
            <Clock
              color={myColor}
              timeMs={myColor === 'white' ? timeSync.whiteTimeMs : timeSync.blackTimeMs}
              isActive={turn === myColor && gameActive}
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
          {actionButtons}
        </div>

        <hr className="divider" />

        {moves && <MoveHistory moves={moves} onSelectMove={onSelectMove} />}

        <div className="rules-summary">
          <p>At, Fil ve Kale, bulundukları sütuna göre hareket eder.</p>
          <p>Şah, Vezir ve Piyon her zaman kendi normal hareketini yapar.</p>
        </div>
      </aside>

      <div className="gi-turn-label">{turnLabelText}</div>

      <div className="gi-bar gi-bar-player">
        <span className="bar-name">{myLabel}</span>
        {timeSync && (
          <Clock
            color={myColor}
            timeMs={myColor === 'white' ? timeSync.whiteTimeMs : timeSync.blackTimeMs}
            isActive={turn === myColor && gameActive}
            lastMoveTimestamp={timeSync.lastMoveTimestamp}
            isGameActive={gameActive}
          />
        )}
      </div>

      {moves && (
        <div className="gi-mobile-history">
          <MoveHistory moves={moves} onSelectMove={onSelectMove} />
        </div>
      )}

      <div className="gi-mobile-actions">
        {actionButtons}
      </div>
    </div>
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
  const low = displayMs <= 30000;
  const critical = displayMs <= 10000;
  const cls = ['clock', isActive ? 'active' : '', color, low ? 'low' : '', critical ? 'critical' : '']
    .filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {timeStr}
    </div>
  );
}
