const SUPABASE_URL = "https://qemejzzxmjohrfdxfftv.supabase.co";
const SUPABASE_KEY = "sb_publishable_8oI3F-GZA8iN5gVTyXvekQ_hXr8UgeG";
const SIZE = 15;
const PADDING = 36;
const BOARD_PIXELS = 720;
const CELL = (BOARD_PIXELS - PADDING * 2) / (SIZE - 1);

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const lobby = document.querySelector("#lobby");
const gameCard = document.querySelector("#game-card");
const status = document.querySelector("#status");
const moveCount = document.querySelector("#move-count");
const undoButton = document.querySelector("#undo");
const modal = document.querySelector("#winner-modal");
const winnerStone = document.querySelector("#winner-stone");
const winnerText = document.querySelector("#winner-text");
const lobbyMessage = document.querySelector("#lobby-message");
const modeLabel = document.querySelector("#mode-label");
const copyLinkButton = document.querySelector("#copy-link");
const gameHint = document.querySelector("#game-hint");
const undoRequest = document.querySelector("#undo-request");
const undoRequestText = document.querySelector("#undo-request-text");

let board = [];
let moves = [];
let currentPlayer = 1;
let winner = 0;
let mode = "lobby";
let room = null;
let userId = null;
let roomChannel = null;

function setMessage(message, isError = false) {
  lobbyMessage.textContent = message;
  lobbyMessage.classList.toggle("error", isError);
}

function showGame() {
  lobby.hidden = true;
  gameCard.hidden = false;
  document.querySelector("#restart").hidden = false;
}

function showLobby() {
  mode = "lobby";
  room = null;
  if (roomChannel) client.removeChannel(roomChannel);
  roomChannel = null;
  history.replaceState({}, "", location.pathname);
  lobby.hidden = false;
  gameCard.hidden = true;
  document.querySelector("#restart").hidden = true;
  modal.hidden = true;
  undoRequest.hidden = true;
}

function resetLocalGame() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  moves = [];
  currentPlayer = 1;
  winner = 0;
  modal.hidden = true;
  updateStatus();
  draw();
}

function startLocalGame() {
  mode = "local";
  modeLabel.textContent = "本地双人";
  copyLinkButton.hidden = true;
  undoButton.hidden = false;
  undoButton.textContent = "悔棋";
  gameHint.textContent = "双人同屏 · 先连成五子者胜";
  showGame();
  resetLocalGame();
}

function applyRoom(nextRoom, showResult = true) {
  const previousWinner = winner;
  room = nextRoom;
  mode = "online";
  moves = room.moves || [];
  currentPlayer = room.turn;
  winner = room.winner;
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  moves.forEach((move) => { board[move.row][move.col] = move.player; });
  modeLabel.textContent = `房间 ${room.code}`;
  copyLinkButton.hidden = false;
  undoButton.hidden = false;
  undoButton.textContent = "申请悔棋";
  gameHint.textContent = room.white_id ? playerDescription() : "等待朋友通过邀请链接加入…";
  showGame();
  updateStatus();
  updateUndoRequest();
  draw();
  if (showResult && winner && !previousWinner) showWinner(winner);
}

function playerDescription() {
  if (!room) return "";
  if (userId === room.black_id) return "你执黑 · 黑方先行";
  if (userId === room.white_id) return "你执白 · 等待黑方先行";
  return "在线房间";
}

function updateUndoRequest() {
  if (mode !== "online" || !room || !room.undo_requested_by) {
    undoRequest.hidden = true;
    return;
  }
  undoRequest.hidden = false;
  const isRequester = room.undo_requested_by === userId;
  undoRequestText.textContent = isRequester
    ? "悔棋申请已发出，等待对方处理。"
    : "对方申请撤回最后一步。";
  document.querySelector("#accept-undo").hidden = isRequester;
  document.querySelector("#reject-undo").hidden = isRequester;
}

async function ensureSignedIn() {
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    userId = session.user.id;
    return;
  }
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  userId = data.user.id;
}

async function createRoom() {
  try {
    setMessage("正在创建房间…");
    await ensureSignedIn();
    const { data, error } = await client.rpc("create_gomoku_room");
    if (error) throw error;
    history.replaceState({}, "", `${location.pathname}?room=${data.code}`);
    subscribeToRoom(data.id);
    applyRoom(data, false);
    setMessage("");
  } catch (error) {
    setMessage(error.message || "创建房间失败", true);
  }
}

async function joinRoom(code) {
  try {
    setMessage("正在加入房间…");
    await ensureSignedIn();
    const { data, error } = await client.rpc("join_gomoku_room", { p_code: code });
    if (error) throw error;
    history.replaceState({}, "", `${location.pathname}?room=${data.code}`);
    subscribeToRoom(data.id);
    applyRoom(data, false);
    setMessage("");
  } catch (error) {
    setMessage(error.message || "加入房间失败", true);
  }
}

function subscribeToRoom(roomId) {
  if (roomChannel) client.removeChannel(roomChannel);
  roomChannel = client.channel(`gomoku-${roomId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "gomoku_rooms",
      filter: `id=eq.${roomId}`
    }, (payload) => applyRoom(payload.new))
    .subscribe();
}

async function playOnlineMove(row, col) {
  const { data, error } = await client.rpc("play_gomoku_move", {
    p_room_id: room.id,
    p_row: row,
    p_col: col
  });
  if (error) {
    gameHint.textContent = error.message;
    return;
  }
  applyRoom(data);
}

async function requestOnlineUndo() {
  const { data, error } = await client.rpc("request_gomoku_undo", { p_room_id: room.id });
  if (error) {
    gameHint.textContent = error.message;
    return;
  }
  applyRoom(data, false);
}

async function respondOnlineUndo(accept) {
  const { data, error } = await client.rpc("respond_gomoku_undo", {
    p_room_id: room.id,
    p_accept: accept
  });
  if (error) {
    gameHint.textContent = error.message;
    return;
  }
  applyRoom(data, false);
}

async function restartGame() {
  if (mode === "local") {
    resetLocalGame();
    return;
  }
  if (mode === "online" && room) {
    const { data, error } = await client.rpc("restart_gomoku_room", { p_room_id: room.id });
    if (error) {
      gameHint.textContent = error.message;
      return;
    }
    modal.hidden = true;
    applyRoom(data, false);
  }
}

function draw() {
  ctx.clearRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);
  ctx.strokeStyle = "rgba(72, 43, 17, 0.72)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < SIZE; i += 1) {
    const offset = PADDING + i * CELL;
    ctx.beginPath(); ctx.moveTo(PADDING, offset); ctx.lineTo(BOARD_PIXELS - PADDING, offset); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(offset, PADDING); ctx.lineTo(offset, BOARD_PIXELS - PADDING); ctx.stroke();
  }
  [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].forEach(([row, col]) => {
    ctx.beginPath(); ctx.fillStyle = "#503016";
    ctx.arc(PADDING + col * CELL, PADDING + row * CELL, 5, 0, Math.PI * 2); ctx.fill();
  });
  drawStones();
}

function drawStones() {
  moves.forEach(({ row, col, player }, index) => {
    const x = PADDING + col * CELL;
    const y = PADDING + row * CELL;
    const radius = CELL * 0.42;
    const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.1, x, y, radius);
    if (player === 1) {
      gradient.addColorStop(0, "#666"); gradient.addColorStop(0.7, "#171717"); gradient.addColorStop(1, "#050505");
    } else {
      gradient.addColorStop(0, "#fff"); gradient.addColorStop(0.75, "#e5ddd2"); gradient.addColorStop(1, "#bdb3a6");
    }
    ctx.beginPath(); ctx.fillStyle = gradient; ctx.shadowColor = "rgba(45, 25, 8, 0.36)";
    ctx.shadowBlur = 9; ctx.shadowOffsetY = 4; ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = "transparent";
    if (index === moves.length - 1) {
      ctx.beginPath(); ctx.fillStyle = player === 1 ? "#ef6b42" : "#7e2616";
      ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  });
}

function updateStatus() {
  const playerName = currentPlayer === 1 ? "黑方" : "白方";
  const stoneClass = currentPlayer === 1 ? "black" : "white";
  let text = `${playerName}回合`;
  if (mode === "online" && room) {
    if (!room.white_id) text = "等待对手加入";
    else if ((currentPlayer === 1 && userId === room.black_id) || (currentPlayer === 2 && userId === room.white_id)) text = `轮到你 · ${playerName}`;
    else text = `等待对手 · ${playerName}`;
  }
  status.innerHTML = `<span class="stone ${stoneClass}"></span><span>${text}</span>`;
  moveCount.textContent = winner ? `共 ${moves.length} 手` : `第 ${moves.length + 1} 手`;
  if (mode === "online" && room) {
    const lastMove = moves[moves.length - 1];
    const myPlayer = userId === room.black_id ? 1 : userId === room.white_id ? 2 : 0;
    undoButton.disabled = !lastMove || winner !== 0 || Boolean(room.undo_requested_by) || lastMove.player !== myPlayer;
  } else {
    undoButton.disabled = moves.length === 0 || winner !== 0;
  }
}

function checkWin(row, col, player) {
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dr, dc]) => {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign; let c = col + dc * sign;
      while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
        count += 1; r += dr * sign; c += dc * sign;
      }
    }
    return count >= 5;
  });
}

function showWinner(player) {
  winnerStone.hidden = player === 3;
  if (player !== 3) winnerStone.className = `stone large ${player === 1 ? "black" : "white"}`;
  winnerText.textContent = player === 3 ? "和棋" : `${player === 1 ? "黑方" : "白方"}获胜`;
  modal.hidden = false;
}

canvas.addEventListener("pointerdown", async (event) => {
  if (winner || mode === "lobby") return;
  const rect = canvas.getBoundingClientRect();
  const col = Math.round(((event.clientX - rect.left) * BOARD_PIXELS / rect.width - PADDING) / CELL);
  const row = Math.round(((event.clientY - rect.top) * BOARD_PIXELS / rect.height - PADDING) / CELL);
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || board[row][col] !== 0) return;
  if (mode === "online") {
    await playOnlineMove(row, col);
    return;
  }
  board[row][col] = currentPlayer;
  moves.push({ row, col, player: currentPlayer });
  draw();
  if (checkWin(row, col, currentPlayer)) {
    winner = currentPlayer; updateStatus(); window.setTimeout(() => showWinner(winner), 240); return;
  }
  if (moves.length === SIZE * SIZE) { winner = 3; showWinner(3); return; }
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateStatus();
});

undoButton.addEventListener("click", () => {
  if (mode === "online") {
    requestOnlineUndo();
    return;
  }
  const lastMove = moves.pop();
  if (!lastMove || winner || mode !== "local") return;
  board[lastMove.row][lastMove.col] = 0;
  currentPlayer = lastMove.player;
  updateStatus(); draw();
});
document.querySelector("#accept-undo").addEventListener("click", () => respondOnlineUndo(true));
document.querySelector("#reject-undo").addEventListener("click", () => respondOnlineUndo(false));

document.querySelector("#create-room").addEventListener("click", createRoom);
document.querySelector("#local-game").addEventListener("click", startLocalGame);
document.querySelector("#leave-room").addEventListener("click", showLobby);
document.querySelector("#restart").addEventListener("click", restartGame);
document.querySelector("#play-again").addEventListener("click", restartGame);
document.querySelector("#join-form").addEventListener("submit", (event) => {
  event.preventDefault();
  joinRoom(document.querySelector("#room-code-input").value);
});
copyLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  copyLinkButton.textContent = "已复制";
  window.setTimeout(() => { copyLinkButton.textContent = "复制邀请链接"; }, 1600);
});

document.querySelector("#restart").hidden = true;
const invitedCode = new URLSearchParams(location.search).get("room");
if (invitedCode) joinRoom(invitedCode);
