const SIZE = 15;
const PADDING = 36;
const BOARD_PIXELS = 720;
const CELL = (BOARD_PIXELS - PADDING * 2) / (SIZE - 1);

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const status = document.querySelector("#status");
const moveCount = document.querySelector("#move-count");
const undoButton = document.querySelector("#undo");
const modal = document.querySelector("#winner-modal");
const winnerStone = document.querySelector("#winner-stone");
const winnerText = document.querySelector("#winner-text");

let board = [];
let moves = [];
let currentPlayer = 1;
let winner = 0;

function resetGame() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  moves = [];
  currentPlayer = 1;
  winner = 0;
  modal.hidden = true;
  updateStatus();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);
  drawBoard();
  drawStones();
}

function drawBoard() {
  ctx.strokeStyle = "rgba(72, 43, 17, 0.72)";
  ctx.lineWidth = 1.5;

  for (let i = 0; i < SIZE; i += 1) {
    const offset = PADDING + i * CELL;
    ctx.beginPath();
    ctx.moveTo(PADDING, offset);
    ctx.lineTo(BOARD_PIXELS - PADDING, offset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset, PADDING);
    ctx.lineTo(offset, BOARD_PIXELS - PADDING);
    ctx.stroke();
  }

  [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([row, col]) => {
    ctx.beginPath();
    ctx.fillStyle = "#503016";
    ctx.arc(PADDING + col * CELL, PADDING + row * CELL, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStones() {
  moves.forEach(({ row, col, player }, index) => {
    const x = PADDING + col * CELL;
    const y = PADDING + row * CELL;
    const radius = CELL * 0.42;
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.35,
      radius * 0.1,
      x,
      y,
      radius
    );

    if (player === 1) {
      gradient.addColorStop(0, "#666");
      gradient.addColorStop(0.7, "#171717");
      gradient.addColorStop(1, "#050505");
    } else {
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.75, "#e5ddd2");
      gradient.addColorStop(1, "#bdb3a6");
    }

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(45, 25, 8, 0.36)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    if (index === moves.length - 1) {
      ctx.beginPath();
      ctx.fillStyle = player === 1 ? "#ef6b42" : "#7e2616";
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function updateStatus() {
  const playerName = currentPlayer === 1 ? "黑方" : "白方";
  const stoneClass = currentPlayer === 1 ? "black" : "white";
  status.innerHTML = `<span class="stone ${stoneClass}"></span><span>${playerName}回合</span>`;
  moveCount.textContent = `第 ${moves.length + 1} 手`;
  undoButton.disabled = moves.length === 0 || winner !== 0;
}

function checkWin(row, col, player) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    return count >= 5;
  });
}

function showWinner(player) {
  const name = player === 1 ? "黑方" : "白方";
  winnerStone.className = `stone large ${player === 1 ? "black" : "white"}`;
  winnerText.textContent = `${name}获胜`;
  modal.hidden = false;
}

canvas.addEventListener("pointerdown", (event) => {
  if (winner) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = BOARD_PIXELS / rect.width;
  const scaleY = BOARD_PIXELS / rect.height;
  const col = Math.round(((event.clientX - rect.left) * scaleX - PADDING) / CELL);
  const row = Math.round(((event.clientY - rect.top) * scaleY - PADDING) / CELL);

  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || board[row][col] !== 0) return;

  board[row][col] = currentPlayer;
  moves.push({ row, col, player: currentPlayer });
  draw();

  if (checkWin(row, col, currentPlayer)) {
    winner = currentPlayer;
    updateStatus();
    window.setTimeout(() => showWinner(winner), 240);
    return;
  }

  if (moves.length === SIZE * SIZE) {
    winnerText.textContent = "和棋";
    winnerStone.className = "stone large white";
    modal.hidden = false;
    return;
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateStatus();
});

undoButton.addEventListener("click", () => {
  const lastMove = moves.pop();
  if (!lastMove || winner) return;
  board[lastMove.row][lastMove.col] = 0;
  currentPlayer = lastMove.player;
  updateStatus();
  draw();
});

document.querySelector("#restart").addEventListener("click", resetGame);
document.querySelector("#play-again").addEventListener("click", resetGame);

resetGame();
