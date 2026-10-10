const playfield = document.querySelector("#playfield");
const character = document.querySelector("#character");
const obstacles = document.querySelector("#obstacles");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const finishButton = document.querySelector("#finish-button");
const restartButton = document.querySelector("#restart-button");

let trainingJumps = 0;
let gameState = "ready";
let isJumping = false;
let animationFrameId = null;
let previousFrameTime = null;
let obstacleElapsedTime = 0;
let jumpElapsedTime = 0;

// x — расстояние от левого края поля, y — высота над его нижним краем, в пикселях.
const characterPosition = { x: 0, y: 36 };
const obstaclePosition = { x: 0, y: 38 };

function updatePositions() {
  const fieldWidth = playfield.clientWidth;
  characterPosition.x = fieldWidth * 0.2;
  const progress = obstacleElapsedTime / 4000;
  obstaclePosition.x = gameState === "playing" || gameState === "paused"
    ? -80 + (fieldWidth + 80) * progress
    : fieldWidth * 0.81 - obstacles.offsetWidth;

  character.style.left = `${characterPosition.x}px`;
  character.style.bottom = `${characterPosition.y}px`;
  obstacles.style.left = `${obstaclePosition.x}px`;
  obstacles.style.bottom = `${obstaclePosition.y}px`;
}

function updateJump(deltaTime) {
  if (!isJumping) return;

  jumpElapsedTime = Math.min(jumpElapsedTime + deltaTime, 650);
  const progress = jumpElapsedTime / 650;
  characterPosition.y = 36 + 110 * (1 - Math.cos(progress * Math.PI * 2)) / 2;

  if (jumpElapsedTime === 650) {
    resetJump();
    messageElement.textContent = "Чебурашка приземлился. Можно прыгнуть ещё раз.";
  }
}

function gameLoop(timestamp) {
  animationFrameId = null;
  if (gameState !== "playing") return;

  const deltaTime = previousFrameTime === null ? 0 : timestamp - previousFrameTime;
  obstacleElapsedTime = (obstacleElapsedTime + deltaTime) % 4000;
  updateJump(deltaTime);
  previousFrameTime = timestamp;
  updatePositions();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
  if (animationFrameId !== null) return;
  previousFrameTime = null;
  updatePositions();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  previousFrameTime = null;
}

function resetJump() {
  isJumping = false;
  jumpElapsedTime = 0;
  characterPosition.y = 36;
}

function setGameState(state) {
  gameState = state;
  const isPlaying = gameState === "playing";
  const isPaused = gameState === "paused";

  if (!isPlaying && !isPaused) {
    resetJump();
    obstacleElapsedTime = 0;
  }

  if (isPlaying) startGameLoop();
  else {
    stopGameLoop();
    updatePositions();
  }

  playfield.setAttribute("aria-disabled", String(!isPlaying));
  playfield.tabIndex = isPlaying ? 0 : -1;
  startButton.disabled = gameState !== "ready";
  pauseButton.disabled = !isPlaying && !isPaused;
  pauseButton.textContent = isPaused ? "Продолжить" : "Пауза";
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  finishButton.disabled = !isPlaying && !isPaused;
  restartButton.disabled = gameState === "ready";
  statusElement.parentElement.dataset.state = gameState;

  if (gameState === "ready") {
    statusElement.textContent = "Готов";
    messageElement.textContent = "Нажми «Старт», чтобы начать тренировку.";
  } else if (isPlaying) {
    statusElement.textContent = "Игра идёт";
    messageElement.textContent = isJumping
      ? "Продолжаем прыжок. Дождись приземления."
      : "Мандарин движется! Кликни по площадке, чтобы прыгнуть.";
  } else if (isPaused) {
    statusElement.textContent = "Пауза";
    messageElement.textContent = "Тренировка на паузе. Нажми «Продолжить».";
  } else {
    statusElement.textContent = "Завершено";
    messageElement.textContent = "Тренировка завершена. Нажми «Заново», чтобы начать ещё раз.";
  }
}

startButton.addEventListener("click", () => {
  if (gameState !== "ready") return;
  setGameState("playing");
  playfield.focus();
});

pauseButton.addEventListener("click", () => {
  if (gameState === "playing") {
    setGameState("paused");
  } else if (gameState === "paused") {
    setGameState("playing");
    playfield.focus();
  }
});

finishButton.addEventListener("click", () => {
  if (gameState !== "playing" && gameState !== "paused") return;
  setGameState("finished");
});

restartButton.addEventListener("click", () => {
  if (gameState === "ready") return;

  setGameState("ready");
  trainingJumps = 0;
  scoreElement.textContent = trainingJumps;
  setGameState("playing");
  playfield.focus();
});

function registerTrainingJump() {
  if (gameState !== "playing" || isJumping) return;

  isJumping = true;
  jumpElapsedTime = 0;
  trainingJumps += 1;
  scoreElement.textContent = trainingJumps;
  messageElement.textContent =
    "Прыжок! Дождись приземления и кликни снова.";
}

playfield.addEventListener("click", registerTrainingJump);

playfield.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat) registerTrainingJump();
  }
});

window.addEventListener("resize", updatePositions);

setGameState("ready");
