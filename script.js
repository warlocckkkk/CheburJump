const playfield = document.querySelector("#playfield");
const character = document.querySelector("#character");
const characterParts = character.querySelectorAll(
  ".character__body, .character__head, .character__ear"
);
const obstacles = document.querySelector("#obstacles");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const finishButton = document.querySelector("#finish-button");
const restartButton = document.querySelector("#restart-button");

let trainingJumps = 0;
let lives = 3;
let gameState = "ready";
let isJumping = false;
let animationFrameId = null;
let previousFrameTime = null;
let obstacleElapsedTime = 0;
let verticalVelocity = 0;

// Начальная скорость — пиксели в секунду, гравитация — пиксели в секунду за секунду.
const jumpSpeed = 680;
const gravity = 2100;
const groundLevel = 36;
// Постоянная скорость в пикселях в секунду позволяет перепрыгнуть мандарин на узком поле.
const obstacleSpeed = 425;

// x — расстояние от левого края поля, y — высота над его нижним краем, в пикселях.
const characterPosition = { x: 0, y: groundLevel };
const obstaclePosition = { x: 0, y: 38 };

function updatePositions() {
  const fieldWidth = playfield.clientWidth;
  characterPosition.x = fieldWidth * 0.2;
  obstaclePosition.x = gameState === "ready"
    ? fieldWidth * 0.81 - obstacles.offsetWidth
    : -80 + obstacleElapsedTime / 1000 * obstacleSpeed;

  character.style.left = `${characterPosition.x}px`;
  character.style.bottom = `${characterPosition.y}px`;
  obstacles.style.left = `${obstaclePosition.x}px`;
  obstacles.style.bottom = `${obstaclePosition.y}px`;
}

function updateJump(deltaTime) {
  if (!isJumping) return;

  const deltaSeconds = deltaTime / 1000;
  characterPosition.y += verticalVelocity * deltaSeconds - gravity * deltaSeconds ** 2 / 2;
  verticalVelocity -= gravity * deltaSeconds;

  if (characterPosition.y <= groundLevel && verticalVelocity <= 0) {
    resetJump();
    messageElement.textContent = "Чебурашка приземлился. Можно прыгнуть ещё раз.";
  }
}

function hasCollision() {
  const obstacleBounds = obstacles.getBoundingClientRect();

  // Границы деталей учитывают CSS-масштаб и исключают пустое место вокруг спрайта.
  for (const part of characterParts) {
    const characterBounds = part.getBoundingClientRect();
    if (
      characterBounds.left <= obstacleBounds.right &&
      characterBounds.right >= obstacleBounds.left &&
      characterBounds.top <= obstacleBounds.bottom &&
      characterBounds.bottom >= obstacleBounds.top
    ) {
      return true;
    }
  }

  return false;
}

function gameLoop(timestamp) {
  animationFrameId = null;
  if (gameState !== "playing") return;

  const deltaTime = previousFrameTime === null ? 0 : timestamp - previousFrameTime;
  const obstacleTravelTime = (playfield.clientWidth + 80) / obstacleSpeed * 1000;
  obstacleElapsedTime = (obstacleElapsedTime + deltaTime) % obstacleTravelTime;
  updateJump(deltaTime);
  previousFrameTime = timestamp;
  updatePositions();

  if (hasCollision()) {
    lives -= 1;
    livesElement.textContent = lives;

    if (lives === 0) {
      setGameState("finished");
      messageElement.textContent = "Жизни закончились. Нажми «Заново», чтобы начать новую тренировку.";
      return;
    }

    resetJump();
    obstacleElapsedTime = 0;
    updatePositions();
    messageElement.textContent = `Столкновение! Осталось жизней: ${lives}. Готовься к новому мандарину.`;
  }

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
  verticalVelocity = 0;
  characterPosition.y = groundLevel;
}

function setGameState(state) {
  gameState = state;
  const isPlaying = gameState === "playing";
  const isPaused = gameState === "paused";

  if (gameState === "ready") {
    resetJump();
    obstacleElapsedTime = 0;
    lives = 3;
    livesElement.textContent = lives;
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
  verticalVelocity = jumpSpeed;
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
