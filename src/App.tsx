import { useEffect, useRef, useState } from 'react';

import {
  activeTiles,
  cloneGame,
  createGame,
  findAvailableMoves,
  hasMoves,
  isTileFree,
  isWon,
  removePair,
  shufflePlayableBoard,
  undoLastMove,
  type GameState,
} from './game/board';
import { createLevelTiles, levelCatalog } from './game/levels';
import {
  clearSavedState,
  loadSavedState,
  recordHistoryEntry,
  saveCurrentState,
  type HistoryEntry,
} from './game/persistence';
import { MahjongScene } from './render/mahjongScene';

interface AppState {
  currentLevel: number;
  game: GameState;
  hintCount: number;
  history: HistoryEntry[];
}

function createFreshState(levelId = 1): AppState {
  return {
    currentLevel: levelId,
    game: createGame({
      tiles: createLevelTiles(levelId, `level-${levelId}-${Date.now()}`),
      level: levelId,
      seed: `level-${levelId}`,
    }),
    hintCount: 0,
    history: [],
  };
}

function loadInitialState(): AppState {
  const saved = loadSavedState(localStorage);

  if (!saved || saved.game.tiles.length === 0) {
    return createFreshState(1);
  }

  return {
    currentLevel: saved.currentLevel,
    game: saved.game,
    hintCount: saved.hintCount,
    history: saved.history,
  };
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<MahjongScene | null>(null);
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [elapsed, setElapsed] = useState(0);
  const wonRef = useRef(false);

  const moves = findAvailableMoves(state.game.tiles);
  const remaining = activeTiles(state.game.tiles).length;
  const level = levelCatalog.find((candidate) => candidate.id === state.currentLevel) ?? levelCatalog[0];

  useEffect(() => {
    if (!canvasRef.current) {
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
  }, []);

  useEffect(() => {
    sceneRef.current?.renderBoard(state.game);
    saveCurrentState(localStorage, {
      currentLevel: state.currentLevel,
      game: state.game,
      hintCount: state.hintCount,
      history: state.history,
      savedAt: Date.now(),
    });
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.game.startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.game.startedAt]);

  function replaceGame(updater: (game: GameState) => void) {
    setState((current) => {
      const game = cloneGame(current.game);
      updater(game);
      return { ...current, game };
    });
  }

  function startLevel(levelId: number) {
    wonRef.current = false;
    setState({
      ...createFreshState(levelId),
      history: state.history,
    });
  }

  function handleTileClick(tileId: string) {
    setState((current) => {
      const game = cloneGame(current.game);
      const tile = game.tiles.find((candidate) => candidate.id === tileId);

      if (!tile || tile.removed) {
        return current;
      }

      if (!isTileFree(game.tiles, tileId)) {
        game.message = '这张牌还没解锁。先清掉上层或旁边的阻挡。';
        return { ...current, game };
      }

      if (game.selectedId === tileId) {
        game.selectedId = null;
        game.message = '已取消选择。';
        return { ...current, game };
      }

      if (!game.selectedId) {
        game.selectedId = tileId;
        game.message = '已选中一张可消牌，请再选一张匹配的开放牌。';
        return { ...current, game };
      }

      const result = removePair(game, game.selectedId, tileId);

      if (result.ok && isWon(game) && !wonRef.current) {
        wonRef.current = true;
        game.message = `恭喜通关！最终得分 ${game.score}，用时 ${formatDuration(elapsed)}。`;
        const historyEntry = createHistoryEntry(game, current.currentLevel, elapsed, true);
        const saved = recordHistoryEntry(localStorage, {
          currentLevel: current.currentLevel,
          game,
          hintCount: current.hintCount,
          savedAt: Date.now(),
          history: current.history,
        }, historyEntry);
        return { ...current, game, history: saved.history };
      }

      if (result.ok && !hasMoves(game)) {
        game.message = '牌面已清到死局，使用洗牌继续。';
      }

      return { ...current, game };
    });
  }

  function showHint() {
    const hint = moves[0];

    if (!hint) {
      replaceGame((game) => {
        game.message = '当前没有可消牌，可尝试洗牌。';
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

  function shuffleBoard() {
    replaceGame((game) => {
      shufflePlayableBoard(game);
    });
  }

  function undoMove() {
    wonRef.current = false;
    replaceGame((game) => {
      undoLastMove(game);
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

  return (
    <div className="shell">
      <aside className="panel" aria-label="Game controls">
        <div className="brand">
          <p className="eyebrow">Three.js + React</p>
          <h1>Vita Mahjong</h1>
          <p className="summary">顶视角 3D 麻将两消 demo，支持缩放、拖拽移动和本地存档。</p>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>关卡</h2>
            <span className="meta">{level.subtitle}</span>
          </div>
          <div className="level-list">
            {levelCatalog.map((candidate) => (
              <button
                className={candidate.id === state.currentLevel ? 'active' : ''}
                key={candidate.id}
                onClick={() => startLevel(candidate.id)}
              >
                {candidate.id}. {candidate.name}
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="stats-grid">
            <Stat label="得分" value={state.game.score} />
            <Stat label="连击" value={state.game.combo} />
            <Stat label="剩余" value={remaining} />
            <Stat label="可走步" value={moves.length} />
            <Stat label="用时" value={formatDuration(elapsed)} />
            <Stat label="提示" value={state.hintCount} />
          </div>
        </section>

        <section className="section">
          <div className="actions">
            <button onClick={showHint}>提示</button>
            <button disabled={remaining < 2} onClick={shuffleBoard}>洗牌</button>
            <button disabled={state.game.history.length === 0} onClick={undoMove}>撤销</button>
            <button onClick={restartCurrent}>重开</button>
            <button onClick={clearSave}>清存档</button>
          </div>
        </section>

        <section className="section">
          <p className="message">{state.game.message}</p>
        </section>

        <section className="section history-section">
          <div className="section-head">
            <h2>历史</h2>
            <span className="meta">{state.history.length} 条</span>
          </div>
          <div className="history-list">
            {state.history.length === 0 ? (
              <p className="empty">暂无历史记录</p>
            ) : (
              state.history.map((entry) => (
                <div className="history-item" key={entry.id}>
                  <strong>Lv.{entry.level} / {entry.score}</strong>
                  <span>{entry.won ? '通关' : '中断'} · {formatDuration(entry.elapsedSeconds)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      <main className="stage">
        <canvas ref={canvasRef} aria-label="3D Mahjong board" />
        <div className="hud">
          <span>滚轮缩放</span>
          <span>拖拽移动</span>
          <span>顶视角</span>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
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

function formatDuration(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
