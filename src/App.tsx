import { useEffect, useMemo, useRef, useState } from 'react';

import {
  cloneGame,
  createGame,
  findAvailableMoves,
  isTileFree,
  isWon,
  removePair,
  remainingTiles,
  undoLastMove,
  type GameState,
} from './game/board';
import successTitleImage from './assets/success_title.PNG';
import { createLevelTiles, getLevel, levelCatalog } from './core/levelLoader';
import {
  preloadStaticResources,
  resetStaticResourcePreload,
  type PreloadProgress,
} from './core/preloadAssets';
import { calculateInGameIq } from './game/inGameIqCalculator';
import {
  clearSavedState,
  loadSavedState,
  recordHistoryEntry,
  saveCurrentState,
  type HistoryEntry,
} from './game/persistence';
import { STEP_QUEUE_MAX_SIZE } from './game/constants';
import { enqueueTile } from './game/stepQueue';
import { getMahjongFaceQueueSpriteStyle } from './render/mahjongSpriteMap';
import { MahjongScene } from './render/mahjongScene';

type Page = 'home' | 'game' | 'complete' | 'failed';
type BootStatus = 'loading' | 'ready' | 'failed';

interface AppState {
  page: Page;
  currentLevel: number;
  game: GameState;
  hintCount: number;
  undoCount: number;
  history: HistoryEntry[];
  final?: CompletionSummary;
  failed?: FailureSummary;
}

interface CompletionSummary {
  level: number;
  score: number;
  combo: number;
  steps: number;
  elapsedSeconds: number;
  iq: number;
  iqLabel: string;
}

interface FailureSummary {
  level: number;
  reason: string;
  elapsedSeconds: number;
  queuedFaces: string[];
}

function createFreshState(levelId = 1, page: Page = 'home'): AppState {
  const level = getLevel(levelId);

  return {
    page,
    currentLevel: level.id,
    game: createGame({
      tiles: createLevelTiles(level.id),
      level: level.id,
      seed: level.seed,
    }),
    hintCount: 0,
    undoCount: 0,
    history: [],
  };
}

function loadInitialState(): AppState {
  const saved = loadSavedState(localStorage);

  if (!saved || saved.game.tiles.length === 0) {
    return createFreshState(1);
  }

  return {
    page: 'home',
    currentLevel: saved.currentLevel,
    game: saved.game,
    hintCount: saved.hintCount,
    undoCount: 0,
    history: saved.history,
  };
}

export function App() {
  const [bootStatus, setBootStatus] = useState<BootStatus>('loading');
  const [bootProgress, setBootProgress] = useState<PreloadProgress>({ loaded: 0, total: 5, label: '准备资源' });
  const [bootError, setBootError] = useState<string | null>(null);
  const [initialState, setInitialState] = useState<AppState | null>(null);

  useEffect(() => {
    let active = true;

    preloadStaticResources((progress) => {
      if (active) {
        setBootProgress(progress);
      }
    })
      .then(() => {
        if (!active) {
          return;
        }

        setInitialState(loadInitialState());
        setBootStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setBootError(error instanceof Error ? error.message : '资源加载失败');
        setBootStatus('failed');
      });

    return () => {
      active = false;
    };
  }, []);

  if (bootStatus !== 'ready' || !initialState) {
    return (
      <LoadingPage
        error={bootError}
        progress={bootProgress}
        onRetry={() => {
          resetStaticResourcePreload();
          setBootError(null);
          setBootProgress({ loaded: 0, total: 5, label: '重新加载资源' });
          setBootStatus('loading');
          preloadStaticResources(setBootProgress)
            .then(() => {
              setInitialState(loadInitialState());
              setBootStatus('ready');
            })
            .catch((error: unknown) => {
              setBootError(error instanceof Error ? error.message : '资源加载失败');
              setBootStatus('failed');
            });
        }}
      />
    );
  }

  return <GameApp initialState={initialState} />;
}

function GameApp({ initialState }: { initialState: AppState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<MahjongScene | null>(null);
  const [state, setState] = useState<AppState>(() => initialState);
  const [elapsed, setElapsed] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const wonRef = useRef(false);

  const level = getLevel(state.currentLevel);
  const moves = findAvailableMoves(state.game.tiles);
  const remaining = remainingTiles(state.game.tiles).length;
  const clearedPairs = Math.round((state.game.tiles.length - remaining) / 2);
  const totalPairs = Math.max(1, Math.floor(state.game.tiles.length / 2));
  const iq = useMemo(
    () =>
      calculateInGameIq({
        clearedPairs,
        totalPairs,
        currentCombo: state.game.combo,
        elapsedSeconds: elapsed,
        difficultyScore: level.difficultyScore,
        iqWeight: level.iqWeight,
      }),
    [clearedPairs, elapsed, level.difficultyScore, level.iqWeight, state.game.combo, totalPairs],
  );
  const hintRemaining = Math.max(0, level.hintCount - state.hintCount);
  const undoRemaining = Math.max(0, level.undoCount - state.undoCount);
  const sceneKey = `${state.currentLevel}:${state.game.seed}`;
  useEffect(() => {
    if (state.page !== 'game' || remaining !== 0 || wonRef.current) {
      return;
    }

    setState((current) => completeStateIfWon(current, elapsed, wonRef));
  }, [elapsed, remaining, state.page]);

  useEffect(() => {
    if (!canvasRef.current || state.page !== 'game') {
      return;
    }

    const scene = new MahjongScene({
      canvas: canvasRef.current,
      onTileClick: handleTileClick,
    });
    sceneRef.current = scene;
    scene.renderBoard(state.game);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [sceneKey, state.page]);

  useEffect(() => {
    sceneRef.current?.renderBoard(state.game);
    saveCurrentState(localStorage, {
      currentLevel: state.currentLevel,
      game: state.game,
      hintCount: state.hintCount,
      savedAt: Date.now(),
      history: state.history,
    });
  }, [state.currentLevel, state.game, state.hintCount, state.history]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.game.startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.game.startedAt]);

  function replaceGame(updater: (game: GameState) => void, extras: Partial<AppState> = {}) {
    setState((current) => {
      const game = cloneGame(current.game);
      updater(game);
      return { ...current, ...extras, game };
    });
  }

  function startLevel(levelId: number) {
    wonRef.current = false;
    setMoreOpen(false);
    setState({
      ...createFreshState(levelId, 'game'),
      history: state.history,
    });
  }

  function goHome() {
    setMoreOpen(false);
    setState((current) => ({ ...current, page: 'home' }));
  }

  function handleTileClick(tileId: string) {
    setState((current) => {
      if (current.page !== 'game') {
        return current;
      }

      const game = cloneGame(current.game);
      const tile = game.tiles.find((candidate) => candidate.id === tileId);

      if (!tile || tile.removed) {
        return current;
      }

      if (game.stepQueue.tileIds.includes(tileId)) {
        const queuedTile = game.tiles.find((candidate) => candidate.id === tileId);

        if (queuedTile) {
          queuedTile.state = 'active';
        }

        game.stepQueue = {
          tileIds: game.stepQueue.tileIds.filter((id) => id !== tileId),
          matchingTileIds: [],
        };
        game.message = '已从托牌槽移回牌桌。';
        return { ...current, game };
      }

      if (!isTileFree(game.tiles, tileId)) {
        game.message = '这张牌还没解锁。先清掉上层或旁边的阻挡。';
        return { ...current, game };
      }

      const queueResult = enqueueTile(game.stepQueue, tile, game.tiles);

      if (!queueResult.accepted) {
        game.message = '托牌槽已满，本关失败。';
        return {
          ...current,
          page: 'failed',
          game,
          failed: {
            level: current.currentLevel,
            reason: '托牌槽已满，且四张牌之间无法配对。',
            elapsedSeconds: elapsed,
            queuedFaces: game.stepQueue.tileIds.map((id) => game.tiles.find((candidate) => candidate.id === id)?.face ?? ''),
          },
        };
      }

      game.stepQueue = queueResult.queue;
      game.selectedId = queueResult.matchedTileIds.length === 0 ? tileId : null;

      if (queueResult.matchedTileIds.length === 0) {
        const queuedTile = game.tiles.find((candidate) => candidate.id === tileId);

        if (queuedTile) {
          queuedTile.state = 'queued';
        }

        if (queueResult.queue.tileIds.length >= STEP_QUEUE_MAX_SIZE) {
          game.message = '托牌槽已满，本关失败。';
          return {
            ...current,
            page: 'failed',
            game,
            failed: {
              level: current.currentLevel,
              reason: '托牌槽已满，且四张牌之间无法配对。',
              elapsedSeconds: elapsed,
              queuedFaces: queueResult.queue.tileIds.map((id) => game.tiles.find((candidate) => candidate.id === id)?.face ?? ''),
            },
          };
        }

        if (!canContinueWithStepQueue(game)) {
          return failStateForNoStepQueueMoves(current, game, elapsed);
        }

        game.message = '已放入托牌槽，继续寻找可配对牌。';
        return { ...current, game };
      }

      const [firstId, secondId] = queueResult.matchedTileIds;
      const result = removePair(game, firstId, secondId);
      game.stepQueue = queueResult.queue;

      if (!result.ok) {
        return { ...current, game };
      }

      for (const matchedId of queueResult.matchedTileIds) {
        const matchedTile = game.tiles.find((candidate) => candidate.id === matchedId);

        if (matchedTile) {
          matchedTile.state = 'removed';
        }
      }

      if (isWon(game) && !wonRef.current) {
        return completeStateIfWon({ ...current, game }, elapsed, wonRef);
      }

      if (!canContinueWithStepQueue(game)) {
        return failStateForNoStepQueueMoves(current, game, elapsed);
      }

      return { ...current, game };
    });
  }

  function showHint() {
    const hint = moves[0];

    if (!hint) {
      replaceGame((game) => {
        game.message = '当前没有可消牌，可以直接重开本关。';
      });
      return;
    }

    if (hintRemaining <= 0) {
      replaceGame((game) => {
        game.message = '提示次数已经用完。';
      });
      return;
    }

    sceneRef.current?.flashHint(hint);
    setState((current) => {
      const game = cloneGame(current.game);
      game.message = '已高亮一组可消牌。';
      return { ...current, hintCount: current.hintCount + 1, game };
    });
  }

  function undoMove() {
    if (undoRemaining <= 0 || state.game.history.length === 0) {
      return;
    }

    wonRef.current = false;
    setState((current) => {
      const game = cloneGame(current.game);
      undoLastMove(game);
      game.tiles.forEach((tile) => {
        tile.state = tile.removed ? 'removed' : 'active';
      });
      return { ...current, undoCount: current.undoCount + 1, game, page: 'game', final: undefined, failed: undefined };
    });
  }

  function restartCurrent() {
    startLevel(state.currentLevel);
  }

  function clearSave() {
    clearSavedState(localStorage);
    wonRef.current = false;
    setState(createFreshState(1));
  }

  function playLatest() {
    wonRef.current = false;
    setState((current) => completeStateIfWon({ ...current, page: 'game', final: undefined, failed: undefined }, elapsed, wonRef));
  }

  if (state.page === 'home') {
    return (
      <HomePage
        currentLevel={state.currentLevel}
        history={state.history}
        onClearSave={clearSave}
        onPlay={playLatest}
      />
    );
  }

  if (state.page === 'complete' && state.final) {
    return (
      <CompletePage
        final={state.final}
        levelName={level.name}
        onHome={goHome}
        onNext={() => startLevel(nextLevelId(state.currentLevel))}
        onReplay={restartCurrent}
      />
    );
  }

  if (state.page === 'failed' && state.failed) {
    return (
      <>
        <GamePage
          canvasRef={canvasRef}
          currentLevel={state.currentLevel}
          game={state.game}
          hintRemaining={hintRemaining}
          iq={iq}
          levelName={level.name}
          moreOpen={false}
          movesCount={moves.length}
          remaining={remaining}
          undoRemaining={undoRemaining}
          elapsed={elapsed}
          onBack={goHome}
          onHint={showHint}
          onMore={() => setMoreOpen((open) => !open)}
          onRestart={restartCurrent}
          onUndo={undoMove}
        />
        <FailedPage
          failed={state.failed}
          levelName={level.name}
          onHome={goHome}
          onReplay={restartCurrent}
        />
      </>
    );
  }

  return (
    <GamePage
      canvasRef={canvasRef}
      currentLevel={state.currentLevel}
      game={state.game}
      hintRemaining={hintRemaining}
      iq={iq}
      levelName={level.name}
      moreOpen={moreOpen}
      movesCount={moves.length}
      remaining={remaining}
      undoRemaining={undoRemaining}
      elapsed={elapsed}
      onBack={goHome}
      onHint={showHint}
      onMore={() => setMoreOpen((open) => !open)}
      onRestart={restartCurrent}
      onUndo={undoMove}
    />
  );
}

function LoadingPage({
  error,
  progress,
  onRetry,
}: {
  error: string | null;
  progress: PreloadProgress;
  onRetry: () => void;
}) {
  const percent = Math.round((progress.loaded / Math.max(1, progress.total)) * 100);

  return (
    <main className="loading-screen" aria-busy={!error} aria-label="资源加载">
      <section className="loading-panel">
        <div className="loading-emblem">牌</div>
        <p className="loading-kicker">Vita Mohjong</p>
        <h1>{error ? '资源加载失败' : '正在布置牌局'}</h1>
        <div className="loading-bar" aria-label={`加载进度 ${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="loading-status">
          {error ? '请检查网络后重试。' : `${progress.label} · ${percent}%`}
        </p>
        {error ? (
          <>
            <small className="loading-error">{error}</small>
            <button className="loading-retry" onClick={onRetry}>
              重新加载
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}

function HomePage({
  currentLevel,
  history,
  onClearSave,
  onPlay,
}: {
  currentLevel: number;
  history: HistoryEntry[];
  onClearSave: () => void;
  onPlay: () => void;
}) {
  const wonCount = history.filter((entry) => entry.won).length;

  return (
    <main className="home-screen">
      <button className="top-icon avatar" aria-label="玩家档案">
        人
      </button>
      <div className="home-tools" aria-label="首页工具">
        <button className="top-icon" aria-label="音效">
          ♪
        </button>
        <button className="top-icon" aria-label="清除存档" onClick={onClearSave}>
          ⚙
        </button>
      </div>
      <section className="home-title" aria-label="游戏标题">
        <span>Vita</span>
        <strong>Mohjong</strong>
        <small>第 {currentLevel} 关 · 已通关 {wonCount}</small>
      </section>
      <button className="primary-start" onClick={onPlay}>
        关卡 {currentLevel}
      </button>
    </main>
  );
}

function GamePage({
  canvasRef,
  currentLevel,
  game,
  hintRemaining,
  iq,
  levelName,
  moreOpen,
  movesCount,
  remaining,
  undoRemaining,
  elapsed,
  onBack,
  onHint,
  onMore,
  onRestart,
  onUndo,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentLevel: number;
  game: GameState;
  hintRemaining: number;
  iq: ReturnType<typeof calculateInGameIq>;
  levelName: string;
  moreOpen: boolean;
  movesCount: number;
  remaining: number;
  undoRemaining: number;
  elapsed: number;
  onBack: () => void;
  onHint: () => void;
  onMore: () => void;
  onRestart: () => void;
  onUndo: () => void;
}) {
  const queueFaces = game.stepQueue.tileIds.map((id) => game.tiles.find((tile) => tile.id === id)?.face ?? '');

  return (
    <main className="game-screen">
      <header className="game-topbar">
        <button className="round-wood" aria-label="返回首页" onClick={onBack}>
          ‹
        </button>
        <div className="iq-readout" aria-label="本局 IQ">
          <span>清台 IQ</span>
          <strong>{iq.iq}</strong>
          <small>{iq.label}</small>
        </div>
        <div className="more-wrap">
          <div className={moreOpen ? 'more-menu open' : 'more-menu'} aria-hidden={!moreOpen}>
            <button aria-label="静音">♪</button>
            <button aria-label="重开" onClick={onRestart}>
              ↻
            </button>
          </div>
          <button className="round-wood" aria-label="更多" onClick={onMore}>
            ≡
          </button>
        </div>
      </header>

      <StepQueueView faces={queueFaces} />

      <section className="board-stage" aria-label="3D 麻将棋盘">
        <canvas ref={canvasRef} aria-label="3D Mahjong board" />
      </section>

      <p className="game-message">{game.message}</p>

      <footer className="bottom-actions" aria-label="底部操作">
        <ActionButton badge={currentLevel} disabled={false} label={`Lv. ${currentLevel}`} onClick={onRestart}>
          ↻
        </ActionButton>
        <ActionButton badge={hintRemaining} disabled={hintRemaining === 0 || movesCount === 0} label="提示" onClick={onHint}>
          ?
        </ActionButton>
        <ActionButton badge={undoRemaining} disabled={undoRemaining === 0 || game.history.length === 0} label="撤回" onClick={onUndo}>
          ↶
        </ActionButton>
      </footer>

      <div className="game-stats" aria-label="局内状态">
        <span>{levelName}</span>
        <span>{formatDuration(elapsed)}</span>
        <span>剩 {remaining}</span>
      </div>
    </main>
  );
}

function StepQueueView({ faces }: { faces: string[] }) {
  return (
    <div className="step-queue" aria-label="托牌槽">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="queue-slot" key={index}>
          {faces[index] ? <TileFace face={faces[index]} /> : null}
        </div>
      ))}
    </div>
  );
}

function TileFace({ face }: { face: string }) {
  return (
    <span className="queue-tile">
      <span className="queue-tile-sprite" style={getMahjongFaceQueueSpriteStyle(face, 44, 62)} />
    </span>
  );
}

function ActionButton({
  badge,
  children,
  disabled,
  label,
  onClick,
}: {
  badge: number;
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="action-button" disabled={disabled} onClick={onClick}>
      <span className="badge">{badge}</span>
      <strong>{children}</strong>
      <small>{label}</small>
    </button>
  );
}

function CompletePage({
  final,
  levelName,
  onHome,
  onNext,
  onReplay,
}: {
  final: CompletionSummary;
  levelName: string;
  onHome: () => void;
  onNext: () => void;
  onReplay: () => void;
}) {
  return (
    <main className="complete-screen">
      <section className="complete-panel">
        <img className="complete-title-image" src={successTitleImage} alt="通关成就" />
        <div className="lotus-mark">✦</div>
        <h1>{final.iqLabel}</h1>
        <p>{levelName} 已清台，节奏稳健，牌路清晰。</p>
        <div className="complete-stats">
          <RewardStat label="时间" value={formatDuration(final.elapsedSeconds)} />
          <RewardStat label="IQ" value={final.iq} />
          <RewardStat label="连击" value={final.combo} />
        </div>
        <div className="reward-track" aria-label="奖励进度">
          {Array.from({ length: 6 }, (_, index) => (
            <span className={index <= (final.level - 1) % 6 ? 'lit' : ''} key={index} />
          ))}
        </div>
        <button className="next-button" onClick={onNext}>
          下一关
        </button>
        <div className="complete-links">
          <button onClick={onReplay}>重玩</button>
          <button onClick={onHome}>首页</button>
        </div>
      </section>
    </main>
  );
}

function FailedPage({
  failed,
  levelName,
  onHome,
  onReplay,
}: {
  failed: FailureSummary;
  levelName: string;
  onHome: () => void;
  onReplay: () => void;
}) {
  return (
    <main className="failure-overlay">
      <section className="complete-panel failed-panel">
        <div className="lotus-mark">!</div>
        <h1>本关失败</h1>
        <p>{levelName} · {failed.reason}</p>
        <div className="failed-queue" aria-label="失败时托牌槽">
          {failed.queuedFaces.map((face, index) => (
            <TileFace face={face} key={`${face}-${index}`} />
          ))}
        </div>
        <div className="complete-stats">
          <RewardStat label="关卡" value={failed.level} />
          <RewardStat label="用时" value={formatDuration(failed.elapsedSeconds)} />
          <RewardStat label="槽位" value={failed.queuedFaces.length} />
        </div>
        <button className="retry-button" onClick={onReplay}>
          重玩本关
        </button>
        <div className="complete-links">
          <button onClick={onHome}>首页</button>
        </div>
      </section>
    </main>
  );
}

function RewardStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="reward-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function createHistoryEntry(game: GameState, level: number, elapsedSeconds: number, won: boolean): HistoryEntry {
  return {
    id: `${Date.now()}-${level}-${game.score}`,
    level,
    score: game.score,
    elapsedSeconds,
    completedAt: Date.now(),
    won,
  };
}

function completeGame(current: AppState, elapsedSeconds: number) {
  const final = createCompletionSummary(current, elapsedSeconds);
  const historyEntry = createHistoryEntry(current.game, current.currentLevel, elapsedSeconds, true);
  const saved = recordHistoryEntry(localStorage, {
    currentLevel: current.currentLevel,
    game: current.game,
    hintCount: current.hintCount,
    savedAt: Date.now(),
    history: current.history,
  }, historyEntry);

  return {
    final,
    nextState: {
      ...current,
      page: 'complete' as const,
      final,
      failed: undefined,
      history: saved.history,
    },
  };
}

function createCompletionSummary(current: AppState, elapsedSeconds: number): CompletionSummary {
  const level = getLevel(current.currentLevel);
  const finalIq = calculateInGameIq({
    clearedPairs: Math.floor(current.game.tiles.length / 2),
    totalPairs: Math.max(1, Math.floor(current.game.tiles.length / 2)),
    currentCombo: current.game.combo,
    elapsedSeconds,
    difficultyScore: level.difficultyScore,
    iqWeight: level.iqWeight,
  });

  return {
    level: current.currentLevel,
    score: current.game.score,
    combo: current.game.combo,
    steps: current.game.history.length,
    elapsedSeconds,
    iq: finalIq.iq,
    iqLabel: finalIq.label,
  };
}

function completeStateIfWon(current: AppState, elapsedSeconds: number, wonRef: React.MutableRefObject<boolean>) {
  if (current.page !== 'game' || !isWon(current.game) || wonRef.current) {
    return current;
  }

  wonRef.current = true;
  return completeGame(current, elapsedSeconds).nextState;
}

function failStateForNoStepQueueMoves(current: AppState, game: GameState, elapsedSeconds: number): AppState {
  const activeCount = game.tiles.filter((tile) => !tile.removed && tile.state !== 'queued').length;
  const reason = activeCount === 0
    ? '牌桌已清空，但托牌槽仍有未配对牌。'
    : '暂无可继续操作的开放牌。';

  game.message = reason;

  return {
    ...current,
    page: 'failed',
    game,
    failed: {
      level: current.currentLevel,
      reason,
      elapsedSeconds,
      queuedFaces: game.stepQueue.tileIds.map((id) => game.tiles.find((candidate) => candidate.id === id)?.face ?? ''),
    },
  };
}

function canContinueWithStepQueue(game: GameState) {
  if (isWon(game)) {
    return true;
  }

  return game.tiles.some((tile) => {
    if (tile.removed || tile.state === 'queued' || tile.state === 'matching' || tile.state === 'animating') {
      return false;
    }

    return isTileFree(game.tiles, tile.id) && enqueueTile(game.stepQueue, tile, game.tiles).accepted;
  });
}

function nextLevelId(currentLevel: number) {
  const currentIndex = levelCatalog.findIndex((level) => level.id === currentLevel);
  return levelCatalog[(currentIndex + 1) % levelCatalog.length]?.id ?? 1;
}

function formatDuration(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
