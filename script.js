const playfield = document.querySelector("#playfield");
const character = document.querySelector("#character");
const characterParts = character.querySelectorAll(
  ".character__body, .character__head, .character__ear"
);
const obstacles = document.querySelector("#obstacles");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const livesElement = document.querySelector("#lives");
const resultScreen = document.querySelector("#result-screen");
const resultTitleElement = document.querySelector("#result-title");
const resultScoreElement = document.querySelector("#result-score");
const resultBestScoreElement = document.querySelector("#result-best-score");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const finishButton = document.querySelector("#finish-button");
const restartButton = document.querySelector("#restart-button");

const bestScoreKey = "cheburJump.bestScore";
const initialLives = 3;

// Горизонтальные коэффициенты — доли ширины поля, остальные позиции — пиксели.
const groundLevel = 36;
const obstacleGroundLevel = 38;
const obstacleStartX = -80;
const characterXRatio = 0.2;
const obstacleReadyXRatio = 0.81;

// Скорости — пиксели в секунду, гравитация — пиксели в секунду за секунду.
const jumpSpeed = 680;
const gravity = 2100;
const initialObstacleSpeed = 425;
const obstacleSpeedStep = 10;
const maxObstacleSpeed = 500;

// Временные интервалы заданы в миллисекундах.
const millisecondsPerSecond = 1000;
const maxFrameDelta = 50;
// Перед случайной паузой оставляем время на прыжок и приземление.
const obstacleRecoveryTime = 750;
const minObstacleDelay = 250;
const maxObstacleDelay = 900;

let bestScore = loadBestScore();
let score = 0;
let preserveScoreMessage = false;
let lives = initialLives;
let gameState = "ready";
let isJumping = false;
let animationFrameId = null;
let previousFrameTime = null;
let timeUntilNextObstacle = 0;
let verticalVelocity = 0;

// x — расстояние от левого края поля, y — высота над его нижним краем, в пикселях.
const characterPosition = { x: 0, y: groundLevel };
const activeObstacles = [];

function loadBestScore() {
  try {
    const savedScore = Number(localStorage.getItem(bestScoreKey));
    return Number.isSafeInteger(savedScore) && savedScore >= 0 ? savedScore : 0;
  } catch {
    return 0;
  }
}

function updateBestScore() {
  if (score <= bestScore) return;

  bestScore = Math.max(score, loadBestScore());
  bestScoreElement.textContent = bestScore;
  resultBestScoreElement.textContent = bestScore;

  try {
    localStorage.setItem(bestScoreKey, String(bestScore));
  } catch {
    // Если хранилище недоступно, рекорд останется только до перезагрузки страницы.
  }
}

function updatePositions() {
  const fieldWidth = playfield.clientWidth;
  characterPosition.x = fieldWidth * characterXRatio;

  character.style.left = `${characterPosition.x}px`;
  character.style.bottom = `${characterPosition.y}px`;

  for (const obstacle of activeObstacles) {
    const x = gameState === "ready"
      ? fieldWidth * obstacleReadyXRatio - obstacle.element.offsetWidth
      : obstacle.x;
    obstacle.element.style.left = `${x}px`;
    obstacle.element.style.bottom = `${obstacleGroundLevel}px`;
  }
}

function updateJump(deltaTime) {
  if (!isJumping) return;

  const deltaSeconds = deltaTime / millisecondsPerSecond;
  characterPosition.y += verticalVelocity * deltaSeconds - gravity * deltaSeconds ** 2 / 2;
  verticalVelocity -= gravity * deltaSeconds;

  if (characterPosition.y <= groundLevel && verticalVelocity <= 0) {
    resetJump();
    if (!preserveScoreMessage) {
      messageElement.textContent = activeObstacles.some((obstacle) => !obstacle.passed)
        ? "Чебурашка на земле. Кликни по полю или нажми пробел для нового прыжка."
        : "Чебурашка на земле. Жди следующий мандарин.";
    }
  }
}

function hasCollision() {
  // Границы деталей учитывают CSS-масштаб и исключают пустое место вокруг спрайта.
  for (const obstacle of activeObstacles) {
    const obstacleBounds = obstacle.element.getBoundingClientRect();
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
  }

  return false;
}

function updateScore() {
  const characterRight = Math.max(
    ...Array.from(characterParts, (part) => part.getBoundingClientRect().right)
  );

  for (const obstacle of activeObstacles) {
    if (obstacle.passed) continue;

    const obstacleBounds = obstacle.element.getBoundingClientRect();
    if (obstacleBounds.left > characterRight) {
      obstacle.passed = true;
      score += 1;
      scoreElement.textContent = score;
      updateBestScore();
      preserveScoreMessage = true;
      messageElement.textContent = `Мандарин позади! +1 очко. Текущий счёт: ${score}.`;
    }
  }
}

function getObstacleDelay() {
  const randomDelay = minObstacleDelay + Math.floor(Math.random() * (maxObstacleDelay - minObstacleDelay + 1));
  return obstacleRecoveryTime + randomDelay;
}

function createObstacle() {
  const element = document.createElement("span");
  element.className = "obstacle";
  element.setAttribute("aria-hidden", "true");
  obstacles.append(element);

  const obstacle = {
    element,
    x: obstacleStartX,
    // Уже летящие мандарины не меняют скорость при появлении следующего.
    speed: Math.min(initialObstacleSpeed + score * obstacleSpeedStep, maxObstacleSpeed),
    passed: false,
  };
  activeObstacles.push(obstacle);
  return obstacle;
}

function updateObstacles(deltaTime) {
  for (const obstacle of activeObstacles) {
    obstacle.x += deltaTime / millisecondsPerSecond * obstacle.speed;
  }

  timeUntilNextObstacle -= deltaTime;
  if (timeUntilNextObstacle <= 0) {
    const extraTime = -timeUntilNextObstacle;
    const obstacle = createObstacle();
    obstacle.x += extraTime / millisecondsPerSecond * obstacle.speed;
    timeUntilNextObstacle = getObstacleDelay() - extraTime;
    preserveScoreMessage = false;
    messageElement.textContent = "Новый мандарин приближается. Выбирай момент для прыжка.";
  }
}

function removeOffscreenObstacles() {
  for (let index = activeObstacles.length - 1; index >= 0; index -= 1) {
    if (activeObstacles[index].x > playfield.clientWidth) {
      activeObstacles[index].element.remove();
      activeObstacles.splice(index, 1);
    }
  }
}

function gameLoop(timestamp) {
  animationFrameId = null;
  if (gameState !== "playing") return;

  // После долгого перерыва не перескакиваем через препятствие и не выдаём бесплатное очко.
  const deltaTime = previousFrameTime === null ? 0 : Math.min(timestamp - previousFrameTime, maxFrameDelta);
  updateObstacles(deltaTime);
  updateJump(deltaTime);
  previousFrameTime = timestamp;
  updatePositions();

  if (hasCollision()) {
    lives -= 1;
    livesElement.textContent = lives;

    if (lives === 0) {
      setGameState("finished");
      return;
    }

    resetScene();
    updatePositions();
    messageElement.textContent = lives === 1
      ? "Столкновение! Осталась последняя жизнь. Мандарины начинают путь заново."
      : `Столкновение! Осталось ${lives} жизни. Мандарины начинают путь заново.`;
  } else {
    updateScore();
    removeOffscreenObstacles();
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

function resetScene() {
  resetJump();
  obstacles.replaceChildren();
  activeObstacles.length = 0;
  createObstacle();
  timeUntilNextObstacle = getObstacleDelay();
  preserveScoreMessage = false;
}

function setGameState(state) {
  gameState = state;
  preserveScoreMessage = false;
  const isPlaying = gameState === "playing";
  const isPaused = gameState === "paused";
  const isGameOver = gameState === "finished" && lives === 0;

  if (gameState === "ready") {
    score = 0;
    resetScene();
    scoreElement.textContent = score;
    lives = initialLives;
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
  statusElement.parentElement.dataset.state = isGameOver ? "lost" : gameState;
  playfield.hidden = gameState === "finished";
  resultScreen.hidden = gameState !== "finished";

  if (gameState === "finished") {
    resultTitleElement.textContent = isGameOver ? "Жизни закончились" : "Тренировка завершена";
    resultScoreElement.textContent = score;
    restartButton.focus();
  }

  if (gameState === "ready") {
    statusElement.textContent = "Готов к старту";
    messageElement.textContent = "Нажми «Старт», затем прыгай кликом по полю или пробелом.";
  } else if (isPlaying) {
    statusElement.textContent = "Игра идёт";
    messageElement.textContent = isJumping
      ? "Прыжок продолжается. Дождись приземления перед следующим прыжком."
      : activeObstacles.some((obstacle) => !obstacle.passed)
        ? "Клик по полю или пробел — прыжок. Перепрыгни мандарины."
        : "Жди следующий мандарин: промежуток между появлениями меняется.";
  } else if (isPaused) {
    statusElement.textContent = "Пауза";
    messageElement.textContent = "Пауза: всё движение остановлено. Нажми «Продолжить», чтобы играть с того же места.";
  } else {
    statusElement.textContent = isGameOver ? "Проигрыш" : "Завершено";
    messageElement.textContent = isGameOver
      ? "Жизни закончились. Нажми пробел или «Заново», чтобы начать новую тренировку."
      : "Тренировка завершена. Нажми пробел или «Заново», чтобы начать ещё раз.";
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

function restartGame() {
  if (gameState === "ready") return;

  setGameState("ready");
  setGameState("playing");
  playfield.focus();
}

restartButton.addEventListener("click", restartGame);

function registerTrainingJump() {
  if (gameState !== "playing" || isJumping) return;

  preserveScoreMessage = false;
  isJumping = true;
  verticalVelocity = jumpSpeed;
  messageElement.textContent =
    "Прыжок! Дождись приземления перед следующим прыжком.";
}

playfield.addEventListener("click", registerTrainingJump);

playfield.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat) registerTrainingJump();
  }
});

document.addEventListener("keydown", (event) => {
  if (gameState !== "finished" || event.key !== " ") return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  event.preventDefault();
  if (!event.repeat) restartGame();
});

window.addEventListener("resize", updatePositions);

bestScoreElement.textContent = bestScore;
resultBestScoreElement.textContent = bestScore;
setGameState("ready");
