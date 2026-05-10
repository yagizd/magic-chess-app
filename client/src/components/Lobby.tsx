import { useState } from 'react';
import type { Color, TimeControl } from '@shared/types';
import type { OnlineStatus } from '../hooks/useOnlineGame';

const TIME_CONTROLS: Record<string, TimeControl[]> = {
  'Bullet': [
    { id: '1m', label: '1 min', minutes: 1, increment: 0 },
    { id: '1|1', label: '1 | 1', minutes: 1, increment: 1 },
    { id: '2|1', label: '2 | 1', minutes: 2, increment: 1 },
  ],
  'Blitz': [
    { id: '3m', label: '3 min', minutes: 3, increment: 0 },
    { id: '3|2', label: '3 | 2', minutes: 3, increment: 2 },
    { id: '5m', label: '5 min', minutes: 5, increment: 0 },
  ],
  'Rapid': [
    { id: '10m', label: '10 min', minutes: 10, increment: 0 },
    { id: '15|10', label: '15 | 10', minutes: 15, increment: 10 },
    { id: '30m', label: '30 min', minutes: 30, increment: 0 },
  ],
};

interface Props {
  status: OnlineStatus;
  roomId: string | null;
  playerColor: Color | null;
  roomError: string | null;
  onCreate: (timeControl: TimeControl | null) => void;
  onJoin: (id: string) => void;
  onBack: () => void;
}

export function Lobby({
  status, roomId, playerColor, roomError, onCreate, onJoin, onBack,
}: Props) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedTcId, setSelectedTcId] = useState<string>('10m'); // default to 10 min

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 6) onJoin(trimmed);
  };

  const copyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Waiting screen once room is created
  if (roomId && playerColor === 'white' && status === 'waiting') {
    return (
      <div className="home">
        <div className="home-card">
          <h2 className="lobby-title">Rakip bekleniyor…</h2>
          <p className="lobby-sub">Bu kodu rakibine gönder:</p>
          <div className="room-code-box">
            <span className="room-code">{roomId}</span>
            <button className="copy-btn" onClick={copyCode}>
              {copied ? '✓ Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <div className="lobby-spinner" />
          <button className="home-btn ghost mt" onClick={onBack}>Vazgeç</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-card">
        <h2 className="lobby-title">Online Oyna</h2>

        <div className="time-controls">
          {Object.entries(TIME_CONTROLS).map(([category, controls]) => (
            <div key={category} className="tc-category">
              <h3 className="tc-category-title">
                {category === 'Bullet' && '🚀 '}
                {category === 'Blitz' && '⚡ '}
                {category === 'Rapid' && '⏱️ '}
                {category}
              </h3>
              <div className="tc-grid">
                {controls.map(tc => (
                  <button
                    key={tc.id}
                    className={`tc-btn ${selectedTcId === tc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTcId(tc.id)}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          className="home-btn primary mt" 
          onClick={() => {
            const allTcs = Object.values(TIME_CONTROLS).flat();
            const selected = allTcs.find(t => t.id === selectedTcId) || null;
            onCreate(selected);
          }}
        >
          Yeni Oda Oluştur
        </button>

        <div className="lobby-divider">
          <span>veya</span>
        </div>

        <div className="join-row">
          <input
            className="code-input"
            placeholder="Oda kodu (6 harf)"
            value={code}
            maxLength={6}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            className="home-btn secondary small"
            onClick={handleJoin}
            disabled={code.trim().length !== 6}
          >
            Katıl
          </button>
        </div>

        {roomError && <p className="lobby-error">{roomError}</p>}

        <button className="home-btn ghost mt" onClick={onBack}>← Geri</button>
      </div>
    </div>
  );
}
