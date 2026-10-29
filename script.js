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
const bonusPoints = 5;

// Горизонтальные коэффициенты — доли ширины поля, остальные позиции — пиксели.
const groundLevel = 36;
const obstacleGroundLevel = 38;
// Приподнятый мандарин тоже можно перепрыгнуть обычным прыжком.
const obstacleLevels = [obstacleGroundLevel, obstacleGroundLevel + 18];
const obstacleStartX = -80;
const characterXRatio = 0.2;
const obstacleReadyXRatio = 0.81;
// Бонус находится выше стоящего персонажа, но в пределах обычного прыжка.
const bonusLevel = 190;
const bonusEveryObstacles = 3;

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

// Звук: длительность в секундах, частота в герцах, громкость от 0 до 1.
const jumpSoundDuration = 0.12;
const jumpSoundFrequency = 440;
const jumpSoundVolume = 0.06;

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
let obstaclesSpawned = 0;
let activeBonus = null;
let jumpAudioContext = null;
let activeJumpSound = null;
let jumpSoundRequestId = 0;

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
    obstacle.element.style.bottom = `${obstacle.y}px`;
  }

  if (activeBonus) {
    activeBonus.element.style.left = `${activeBonus.x}px`;
    activeBonus.element.style.bottom = `${activeBonus.y}px`;
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

function isTouchingCharacter(element) {
  const objectBounds = element.getBoundingClientRect();
  // Границы деталей учитывают CSS-масштаб и исключают пустое место вокруг спрайта.
  for (const part of characterParts) {
    const characterBounds = part.getBoundingClientRect();
    if (
      characterBounds.left <= objectBounds.right &&
      characterBounds.right >= objectBounds.left &&
      characterBounds.top <= objectBounds.bottom &&
      characterBounds.bottom >= objectBounds.top
    ) {
      return true;
    }
  }

  return false;
}

function hasCollision() {
  return activeObstacles.some((obstacle) => isTouchingCharacter(obstacle.element));
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

function createObstacle(y = obstacleGroundLevel) {
  const element = document.createElement("span");
  element.className = "obstacle";
  element.setAttribute("aria-hidden", "true");
  obstacles.append(element);

  const obstacle = {
    element,
    x: obstacleStartX,
    y,
    // Уже летящие мандарины не меняют скорость при появлении следующего.
    speed: Math.min(initialObstacleSpeed + score * obstacleSpeedStep, maxObstacleSpeed),
    passed: false,
  };
  activeObstacles.push(obstacle);
  obstaclesSpawned += 1;
  return obstacle;
}

function clearBonus() {
  if (activeBonus) activeBonus.element.remove();
  activeBonus = null;
}

function createBonus(obstacle) {
  clearBonus();
  const element = document.createElement("span");
  element.className = "obstacle obstacle--bonus";
  element.textContent = "★";
  element.setAttribute("aria-hidden", "true");
  obstacles.append(element);
  activeBonus = {
    element,
    x: obstacle.x + (obstacle.element.offsetWidth - element.offsetWidth) / 2,
    y: bonusLevel,
    speed: obstacle.speed,
  };
}

function collectOrRemoveBonus() {
  if (!activeBonus) return;

  if (isTouchingCharacter(activeBonus.element)) {
    clearBonus();
    score += bonusPoints;
    scoreElement.textContent = score;
    updateBestScore();
    preserveScoreMessage = true;
    messageElement.textContent = `Бонусная мандаринка собрана! +${bonusPoints} очков. Текущий счёт: ${score}.`;
  } else if (activeBonus.x > playfield.clientWidth) {
    clearBonus();
  }
}

function updateObstacles(deltaTime) {
  for (const obstacle of activeObstacles) {
    obstacle.x += deltaTime / millisecondsPerSecond * obstacle.speed;
  }
  if (activeBonus) activeBonus.x += deltaTime / millisecondsPerSecond * activeBonus.speed;

  timeUntilNextObstacle -= deltaTime;
  if (timeUntilNextObstacle <= 0) {
    const extraTime = -timeUntilNextObstacle;
    const levelIndex = Math.floor(Math.random() * obstacleLevels.length);
    const obstacle = createObstacle(obstacleLevels[levelIndex]);
    obstacle.x += extraTime / millisecondsPerSecond * obstacle.speed;
    if (obstaclesSpawned % bonusEveryObstacles === 0) createBonus(obstacle);
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
    collectOrRemoveBonus();
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
  stopJumpSound();
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  previousFrameTime = null;
}

function resetJump() {
  stopJumpSound();
  isJumping = false;
  verticalVelocity = 0;
  characterPosition.y = groundLevel;
  updateCharacterMotion();
}

function updateCharacterMotion() {
  character.dataset.motion = isJumping
    ? "jumping"
    : gameState === "playing" ? "running" : gameState;
}

function resetScene() {
  resetJump();
  clearBonus();
  obstacles.replaceChildren();
  activeObstacles.length = 0;
  obstaclesSpawned = 0;
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

  updateCharacterMotion();
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

function stopJumpSound() {
  // Отменяем также звук, который ещё ждёт разрешения браузера на запуск.
  jumpSoundRequestId += 1;
  if (activeJumpSound) {
    activeJumpSound.stop();
    activeJumpSound = null;
  }
}

async function playJumpSound() {
  const requestId = ++jumpSoundRequestId;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    // Один контекст на игру; создаём его только после клика или нажатия клавиши.
    if (!jumpAudioContext || jumpAudioContext.state === "closed") {
      jumpAudioContext = new AudioContext();
    }
    if (jumpAudioContext.state !== "running") await jumpAudioContext.resume();
    if (requestId !== jumpSoundRequestId || gameState !== "playing" || !isJumping) return;
    if (jumpAudioContext.state !== "running") return;

    const oscillator = jumpAudioContext.createOscillator();
    const volume = jumpAudioContext.createGain();
    const startTime = jumpAudioContext.currentTime;
    const endTime = startTime + jumpSoundDuration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(jumpSoundFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(jumpSoundFrequency * 2, endTime);
    volume.gain.setValueAtTime(0, startTime);
    volume.gain.linearRampToValueAtTime(jumpSoundVolume, startTime + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.001, endTime);
    oscillator.connect(volume);
    volume.connect(jumpAudioContext.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
      if (activeJumpSound === oscillator) activeJumpSound = null;
    };
    oscillator.start(startTime);
    oscillator.stop(endTime);
    activeJumpSound = oscillator;
  } catch {
    // Если звук недоступен или заблокирован, прыжок и игра продолжаются без него.
  }
}

function registerTrainingJump() {
  if (gameState !== "playing" || isJumping) return;

  preserveScoreMessage = false;
  isJumping = true;
  verticalVelocity = jumpSpeed;
  updateCharacterMotion();
  messageElement.textContent =
    "Прыжок! Дождись приземления перед следующим прыжком.";
  playJumpSound();
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
