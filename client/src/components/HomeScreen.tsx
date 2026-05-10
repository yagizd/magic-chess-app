interface Props {
  onLocal: () => void;
  onOnline: () => void;
}

export function HomeScreen({ onLocal, onOnline }: Props) {
  return (
    <div className="home">
      <div className="home-card">
        <h1 className="home-title">MAGIC CHESS</h1>
        <p className="home-sub">Sütuna göre hareket eden satranç</p>
        <div className="home-buttons">
          <button className="home-btn primary" onClick={onLocal}>
            <span className="home-btn-icon">⚔</span>
            Aynı Bilgisayarda Oyna
          </button>
          <button className="home-btn secondary" onClick={onOnline}>
            <span className="home-btn-icon">🌐</span>
            Online Oyna
          </button>
        </div>
      </div>
    </div>
  );
}
