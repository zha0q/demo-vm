import {
  createGame,
  findAvailableMoves,
  hasMoves,
  isTileFree,
  isWon,
  removePair,
  shufflePlayableBoard,
  undoLastMove,
} from './game/board.js';
import { createLevelTiles, levelCatalog } from './game/levels.js';
import { MahjongScene } from './render/mahjongScene.js';

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="shell">
    <aside class="panel">
      <div class="brand">
        <p class="eyebrow">Three.js Demo</p>
        <h1>Vita Mahjong</h1>
        <p class="summary">简化美术、完整核心玩法的 3D 麻将两消 demo。</p>
      </div>

      <section class="card card-levels">
        <div class="section-head">
          <h2>关卡</h2>
          <span id="levelSubtitle" class="meta"></span>
        </div>
        <div id="levelButtons" class="level-list"></div>
      </section>

      <section class="card card-stats">
        <div class="stats-grid">
          <div>
            <span class="label">得分</span>
            <strong id="scoreValue">0</strong>
          </div>
          <div>
            <span class="label">连击</span>
            <strong id="comboValue">0</strong>
          </div>
          <div>
            <span class="label">剩余</span>
            <strong id="tilesValue">0</strong>
          </div>
          <div>
            <span class="label">可走步</span>
            <strong id="movesValue">0</strong>
          </div>
          <div>
            <span class="label">用时</span>
            <strong id="timerValue">00:00</strong>
          </div>
          <div>
            <span class="label">提示</span>
            <strong id="hintValue">0</strong>
          </div>
        </div>
      </section>

      <section class="card card-actions">
        <div class="section-head">
          <h2>操作</h2>
        </div>
        <div class="actions">
          <button id="hintButton">提示</button>
          <button id="shuffleButton">洗牌</button>
          <button id="undoButton">撤销</button>
          <button id="restartButton">重开</button>
        </div>
      </section>

      <section class="card card-status">
        <div class="section-head">
          <h2>状态</h2>
        </div>
        <p id="messageBox" class="message"></p>
      </section>

      <section class="card card-rules">
        <div class="section-head">
          <h2>规则</h2>
        </div>
        <ul>
          <li>只有没有被上层遮挡、且左右至少一侧开放的牌可以选。</li>
          <li>普通牌必须完全相同；花牌之间互配，季节牌之间互配。</li>
          <li>若无步可走可用洗牌重排剩余牌面，牌位结构保持不变。</li>
        </ul>
      </section>
    </aside>

    <main class="stage">
      <canvas id="boardCanvas" aria-label="3D Mahjong board"></canvas>
      <div class="overlay">
        <div class="legend">
          <span><i class="dot free"></i>可消</span>
          <span><i class="dot blocked"></i>被锁</span>
          <span><i class="dot selected"></i>已选</span>
        </div>
      </div>
    </main>
  </div>
`;

const elements = {
  levelButtons: document.querySelector('#levelButtons'),
  levelSubtitle: document.querySelector('#levelSubtitle'),
  scoreValue: document.querySelector('#scoreValue'),
  comboValue: document.querySelector('#comboValue'),
  tilesValue: document.querySelector('#tilesValue'),
  movesValue: document.querySelector('#movesValue'),
  timerValue: document.querySelector('#timerValue'),
  hintValue: document.querySelector('#hintValue'),
  messageBox: document.querySelector('#messageBox'),
  hintButton: document.querySelector('#hintButton'),
  shuffleButton: document.querySelector('#shuffleButton'),
  undoButton: document.querySelector('#undoButton'),
  restartButton: document.querySelector('#restartButton'),
};

const scene = new MahjongScene({
  canvas: document.querySelector('#boardCanvas'),
  onTileClick: handleTileClick,
});

let currentLevel = 1;
let game = null;
let hintCount = 0;
let timerId = null;

renderLevelButtons();
startLevel(currentLevel);
wireButtons();

function startLevel(levelId) {
  currentLevel = levelId;
  hintCount = 0;
  game = createGame({
    tiles: createLevelTiles(levelId, `level-${levelId}`),
    level: levelId,
    seed: `level-${levelId}`,
  });
  clearInterval(timerId);
  timerId = window.setInterval(updateTimer, 1000);
  syncView();
}

function renderLevelButtons() {
  elements.levelButtons.innerHTML = '';

  for (const level of levelCatalog) {
    const button = document.createElement('button');
    button.textContent = `${level.id}. ${level.name}`;
    button.addEventListener('click', () => startLevel(level.id));
    elements.levelButtons.append(button);
  }
}

function wireButtons() {
  elements.hintButton.addEventListener('click', () => {
    const hint = findAvailableMoves(game.tiles)[0];

    if (!hint) {
      updateMessage('当前没有可消牌，可尝试洗牌。');
      return;
    }

    hintCount += 1;
    scene.flashHint(hint);
    updateMessage('已高亮一组可消牌。');
    syncView();
  });

  elements.shuffleButton.addEventListener('click', () => {
    const result = shufflePlayableBoard(game);
    updateMessage(result.message);
    syncView();
  });

  elements.undoButton.addEventListener('click', () => {
    const result = undoLastMove(game);
    updateMessage(result.message);
    syncView();
  });

  elements.restartButton.addEventListener('click', () => startLevel(currentLevel));
}

function handleTileClick(tileId) {
  const tile = game.tiles.find((candidate) => candidate.id === tileId);

  if (!tile || tile.removed) {
    return;
  }

  if (!isTileFree(game.tiles, tileId)) {
    updateMessage('这张牌还没解锁。先清掉上层或旁边的阻挡。');
    return;
  }

  if (game.selectedId === tileId) {
    game.selectedId = null;
    updateMessage('已取消选择。');
    syncView();
    return;
  }

  if (!game.selectedId) {
    game.selectedId = tileId;
    updateMessage('已选中一张可消牌，请再选一张匹配的开放牌。');
    syncView();
    return;
  }

  const result = removePair(game, game.selectedId, tileId);
  updateMessage(result.message);

  if (result.ok && isWon(game)) {
    clearInterval(timerId);
    updateMessage(`恭喜通关！最终得分 ${game.score}，用时 ${formatDuration(elapsedSeconds())}。`);
    syncView();
    return;
  }

  if (result.ok && !hasMoves(game)) {
    updateMessage('牌面已清到死局，使用洗牌继续。');
  }

  syncView();
}

function syncView() {
  const level = levelCatalog.find((candidate) => candidate.id === currentLevel) ?? levelCatalog[0];
  const moves = findAvailableMoves(game.tiles);

  document.querySelectorAll('#levelButtons button').forEach((button, index) => {
    button.classList.toggle('active', levelCatalog[index].id === currentLevel);
  });

  elements.levelSubtitle.textContent = level.subtitle;
  elements.scoreValue.textContent = String(game.score);
  elements.comboValue.textContent = String(game.combo);
  elements.tilesValue.textContent = String(game.tiles.filter((tile) => !tile.removed).length);
  elements.movesValue.textContent = String(moves.length);
  elements.hintValue.textContent = String(hintCount);
  elements.messageBox.textContent = game.message;
  elements.shuffleButton.disabled = game.tiles.filter((tile) => !tile.removed).length < 2;
  elements.undoButton.disabled = game.history.length === 0;

  scene.renderBoard(game);
  updateTimer();
}

function updateMessage(message) {
  game.message = message;
}

function updateTimer() {
  if (!game) {
    return;
  }

  elements.timerValue.textContent = formatDuration(elapsedSeconds());
}

function elapsedSeconds() {
  return Math.floor((Date.now() - game.startedAt) / 1000);
}

function formatDuration(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
