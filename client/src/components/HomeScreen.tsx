import { useState } from 'react';
import type { BotDifficulty } from '../hooks/useBotGame';

interface Props {
  onLocal: () => void;
  onOnline: () => void;
  onBot: (difficulty: BotDifficulty) => void;
  onTutorial: () => void;
}

const DIFFICULTIES: { id: BotDifficulty; label: string }[] = [
  { id: 'easy', label: 'Kolay' },
  { id: 'medium', label: 'Orta' },
  { id: 'hard', label: 'Zor' },
];

export function HomeScreen({ onLocal, onOnline, onBot, onTutorial }: Props) {
  const [showDifficulty, setShowDifficulty] = useState(false);

  if (showDifficulty) {
    return (
      <div className="home">
        <div className="home-card">
          <h2 className="lobby-title">Zorluk Seç</h2>
          <div className="home-buttons">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                className="home-btn secondary"
                onClick={() => onBot(d.id)}
              >
                {d.label}
              </button>
            ))}
            <button className="home-btn ghost" onClick={() => setShowDifficulty(false)}>
              Geri
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-card">
        <h1 className="home-title">MAGIC CHESS</h1>
        <p className="home-sub">Sütuna göre hareket eden satranç</p>
        <div className="home-buttons">
          <button className="home-btn primary" onClick={onLocal}>
            <span className="home-btn-icon">⚔</span>
            Aynı Cihazda Oyna
          </button>
          <button className="home-btn secondary" onClick={onOnline}>
            <span className="home-btn-icon">🌐</span>
            Online Oyna
          </button>
          <button className="home-btn ghost" onClick={() => setShowDifficulty(true)}>
            <span className="home-btn-icon">🤖</span>
            Bota Karşı Oyna
          </button>
          <button className="home-btn ghost" onClick={onTutorial}>
            <span className="home-btn-icon">📘</span>
            Kuralları Öğren
          </button>
        </div>
      </div>
    </div>
  );
}
