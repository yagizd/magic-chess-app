import { useState } from 'react';
import { useLocalGame } from './hooks/useLocalGame';
import { useOnlineGame } from './hooks/useOnlineGame';
import { Board } from './components/Board';
import { GameInfo } from './components/GameInfo';
import { PromotionModal } from './components/PromotionModal';
import { HomeScreen } from './components/HomeScreen';
import { Lobby } from './components/Lobby';

type Screen = 'home' | 'local' | 'lobby' | 'online';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  const local = useLocalGame();
  const online = useOnlineGame();

  const goHome = () => {
    setScreen('home');
    online.disconnect();
    local.reset();
  };

  if (screen === 'home') {
    return (
      <HomeScreen
        onLocal={() => { local.reset(); setScreen('local'); }}
        onOnline={() => setScreen('lobby')}
      />
    );
  }

  if (screen === 'lobby') {
    if (online.status === 'playing') {
      setScreen('online');
    }
    return (
      <Lobby
        status={online.status}
        roomId={online.roomId}
        playerColor={online.playerColor}
        roomError={online.roomError}
        onCreate={online.createRoom}
        onJoin={online.joinRoom}
        onBack={goHome}
      />
    );
  }

  if (screen === 'online') {
    const state = online.gameState;

    if (online.status === 'opponent-left') {
      return (
        <div className="home">
          <div className="home-card">
            <h2 className="lobby-title">Rakip bağlantısı kesildi</h2>
            <button className="home-btn primary mt" onClick={goHome}>Ana Menü</button>
          </div>
        </div>
      );
    }

    if (!state) {
      return (
        <div className="home">
          <div className="home-card">
            <div className="lobby-spinner" />
            <p className="lobby-sub mt">Oyun yükleniyor…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="app">
        <Board
          board={state.board}
          selected={online.selected}
          validMoves={online.validMoves}
          lastMove={online.lastMove}
          isCheck={state.isCheck}
          currentTurn={state.currentTurn}
          flipBoard={online.playerColor === 'black'}
          premove={online.premove}
          onSquareClick={online.handleSquareClick}
          onDragMove={online.handleDragMove}
          onRightClick={online.handleRightClick}
        />
        <GameInfo
          state={state}
          playerColor={online.playerColor}
          isOnline
          timeSync={online.timeSync}
          onReset={goHome}
          onResign={online.resign}
          onHome={goHome}
          rematchRequestedByMe={online.rematchRequestedByMe}
          rematchRequestedByOpponent={online.rematchRequestedByOpponent}
          onRequestRematch={online.requestRematch}
        />
        {online.promotionPending && online.playerColor && (
          <PromotionModal color={online.playerColor} onSelect={online.handlePromotion} />
        )}
      </div>
    );
  }

  // Local game
  return (
    <div className="app">
      <Board
        board={local.gameState.board}
        selected={local.selected}
        validMoves={local.validMoves}
        lastMove={local.lastMove}
        isCheck={local.gameState.isCheck}
        currentTurn={local.gameState.currentTurn}
        premove={local.premove}
        onSquareClick={local.handleSquareClick}
        onDragMove={local.handleDragMove}
        onRightClick={local.handleRightClick}
      />
      <GameInfo
        state={local.gameState}
        onReset={local.reset}
        onHome={goHome}
      />
      {local.promotionPending && (
        <PromotionModal
          color={local.gameState.currentTurn}
          onSelect={local.handlePromotion}
        />
      )}
    </div>
  );
}
