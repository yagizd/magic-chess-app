import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Preferences } from '@capacitor/preferences';
import { useLocalGame } from './hooks/useLocalGame';
import { useOnlineGame } from './hooks/useOnlineGame';
import { useBotGame, type BotDifficulty } from './hooks/useBotGame';
import { Board } from './components/Board';
import { GameInfo } from './components/GameInfo';
import { PromotionModal } from './components/PromotionModal';
import { HomeScreen } from './components/HomeScreen';
import { Lobby } from './components/Lobby';
import { GameEndOverlay } from './components/GameEndOverlay';
import { ReplayViewer } from './components/ReplayViewer';
import { Tutorial } from './components/Tutorial';
import type { RecordedMove } from '@shared/types';

type Screen = 'home' | 'local' | 'lobby' | 'online' | 'bot' | 'tutorial';

const GAME_SCREENS: Screen[] = ['local', 'lobby', 'online', 'bot'];

function vibrate(style: 'move' | 'capture' | 'end') {
  if (!Capacitor.isNativePlatform()) return;
  if (style === 'end') {
    Haptics.vibrate().catch(() => {});
  } else {
    Haptics.impact({ style: style === 'capture' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayStartPly, setReplayStartPly] = useState(0);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');

  const local = useLocalGame();
  const online = useOnlineGame();
  const bot = useBotGame(botDifficulty);

  const goHome = () => {
    setScreen('home');
    setReplaying(false);
    online.disconnect();
    local.reset();
    bot.reset();
  };

  const startBotGame = (difficulty: BotDifficulty) => {
    setBotDifficulty(difficulty);
    bot.reset();
    setScreen('bot');
  };

  const openReplay = (startPly: number) => {
    setReplayStartPly(startPly);
    setReplaying(true);
  };

  useEffect(() => {
    if (screen === 'lobby' && online.status === 'playing') {
      setScreen('online');
    }
  }, [screen, online.status]);

  useEffect(() => {
    Preferences.get({ key: 'tutorialDone' }).then(({ value }) => {
      if (value !== 'true') setScreen('tutorial');
      setTutorialChecked(true);
    });
  }, []);

  // Keep the screen awake while a game is in progress.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const inGame = GAME_SCREENS.includes(screen);
    if (inGame) {
      KeepAwake.keepAwake().catch(() => {});
    } else {
      KeepAwake.allowSleep().catch(() => {});
    }
  }, [screen]);

  // Haptic feedback on move / capture / game end for the active game mode.
  const activeRecordedMoves: RecordedMove[] =
    screen === 'online' ? online.recordedMoves : screen === 'bot' ? bot.recordedMoves : local.recordedMoves;
  const activeGameOver =
    screen === 'online'
      ? online.gameState?.isCheckmate || online.gameState?.isStalemate || online.gameState?.isDraw
      : screen === 'bot'
        ? bot.gameState.isCheckmate || bot.gameState.isStalemate || bot.gameState.isDraw
        : local.gameState.isCheckmate || local.gameState.isStalemate || local.gameState.isDraw;
  const lastMoveCountRef = useRef(0);
  const gameOverNotifiedRef = useRef(false);

  useEffect(() => {
    if (!GAME_SCREENS.includes(screen)) {
      lastMoveCountRef.current = 0;
      gameOverNotifiedRef.current = false;
      return;
    }
    if (activeRecordedMoves.length > lastMoveCountRef.current) {
      const last = activeRecordedMoves[activeRecordedMoves.length - 1];
      vibrate(last.captured ? 'capture' : 'move');
    }
    lastMoveCountRef.current = activeRecordedMoves.length;

    if (activeGameOver && !gameOverNotifiedRef.current) {
      gameOverNotifiedRef.current = true;
      vibrate('end');
    } else if (!activeGameOver) {
      gameOverNotifiedRef.current = false;
    }
  }, [screen, activeRecordedMoves, activeGameOver]);

  // Android hardware back button.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapacitorApp.addListener('backButton', () => {
      if (screen === 'tutorial') {
        setScreen('home');
        return;
      }
      if (GAME_SCREENS.includes(screen)) {
        if (window.confirm('Oyundan çıkmak istiyor musun?')) {
          goHome();
        }
        return;
      }
      if (window.confirm('Uygulamadan çıkmak istiyor musun?')) {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [screen]);

  if (!tutorialChecked) {
    return null;
  }

  if (screen === 'tutorial') {
    return <Tutorial onFinish={() => setScreen('home')} />;
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        onLocal={() => { local.reset(); setScreen('local'); }}
        onOnline={() => setScreen('lobby')}
        onBot={startBotGame}
        onTutorial={() => setScreen('tutorial')}
      />
    );
  }

  if (screen === 'lobby') {
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

    if (replaying) {
      return (
        <ReplayViewer
          moves={state.moveHistory}
          recordedMoves={online.recordedMoves}
          startPly={replayStartPly}
          onExit={() => setReplaying(false)}
        />
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
          moves={online.recordedMoves}
          onSelectMove={(idx) => openReplay(idx + 1)}
        />
        {online.promotionPending && online.playerColor && (
          <PromotionModal color={online.playerColor} onSelect={online.handlePromotion} />
        )}
        <GameEndOverlay
          state={state}
          onReplay={() => openReplay(state.moveHistory.length)}
          onHome={goHome}
        />
      </div>
    );
  }

  if (screen === 'bot') {
    if (replaying) {
      return (
        <ReplayViewer
          moves={bot.gameState.moveHistory}
          recordedMoves={bot.recordedMoves}
          startPly={replayStartPly}
          onExit={() => setReplaying(false)}
        />
      );
    }

    return (
      <div className="app">
        <Board
          board={bot.gameState.board}
          selected={bot.selected}
          validMoves={bot.validMoves}
          lastMove={bot.lastMove}
          isCheck={bot.gameState.isCheck}
          currentTurn={bot.gameState.currentTurn}
          premove={bot.premove}
          onSquareClick={bot.handleSquareClick}
          onDragMove={bot.handleDragMove}
          onRightClick={bot.handleRightClick}
        />
        <GameInfo
          state={bot.gameState}
          playerColor="white"
          isBot
          onReset={() => bot.reset()}
          onHome={goHome}
          moves={bot.recordedMoves}
          onSelectMove={(idx) => openReplay(idx + 1)}
        />
        {bot.promotionPending && (
          <PromotionModal
            color={bot.gameState.currentTurn}
            onSelect={bot.handlePromotion}
          />
        )}
        <GameEndOverlay
          state={bot.gameState}
          onReplay={() => openReplay(bot.gameState.moveHistory.length)}
          onNewGame={() => { bot.reset(); setReplaying(false); }}
          onHome={goHome}
        />
      </div>
    );
  }

  // Local game
  if (replaying) {
    return (
      <ReplayViewer
        moves={local.gameState.moveHistory}
        recordedMoves={local.recordedMoves}
        startPly={replayStartPly}
        onExit={() => setReplaying(false)}
      />
    );
  }

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
        moves={local.recordedMoves}
        onSelectMove={(idx) => openReplay(idx + 1)}
      />
      {local.promotionPending && (
        <PromotionModal
          color={local.gameState.currentTurn}
          onSelect={local.handlePromotion}
        />
      )}
      <GameEndOverlay
        state={local.gameState}
        onReplay={() => openReplay(local.gameState.moveHistory.length)}
        onNewGame={() => { local.reset(); setReplaying(false); }}
        onHome={goHome}
      />
    </div>
  );
}
