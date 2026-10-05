const playfield = document.querySelector("#playfield");
const character = document.querySelector("#character");
const obstacles = document.querySelector("#obstacles");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const finishButton = document.querySelector("#finish-button");

let trainingJumps = 0;
let gameState = "ready";
let isJumping = false;

function resetJump() {
  isJumping = false;
  character.classList.remove("character--jumping");
}

function setGameState(state) {
  gameState = state;
  const isPlaying = gameState === "playing";
  const isPaused = gameState === "paused";

  if (!isPlaying && !isPaused) resetJump();
  character.classList.toggle("character--paused", isPaused);
  obstacles.classList.toggle("obstacles--moving", isPlaying || isPaused);
  obstacles.classList.toggle("obstacles--paused", isPaused);

  playfield.setAttribute("aria-disabled", String(!isPlaying));
  playfield.tabIndex = isPlaying ? 0 : -1;
  startButton.disabled = gameState !== "ready";
  pauseButton.disabled = !isPlaying && !isPaused;
  pauseButton.textContent = isPaused ? "Продолжить" : "Пауза";
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  finishButton.disabled = !isPlaying && !isPaused;
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
    messageElement.textContent = "Тренировка завершена.";
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

function registerTrainingJump() {
  if (gameState !== "playing" || isJumping) return;

  isJumping = true;
  character.classList.add("character--jumping");
  trainingJumps += 1;
  scoreElement.textContent = trainingJumps;
  messageElement.textContent =
    "Прыжок! Дождись приземления и кликни снова.";
}

character.addEventListener("animationend", (event) => {
  if (event.target !== character || event.animationName !== "character-jump") return;
  resetJump();
  if (gameState === "playing") {
    messageElement.textContent = "Чебурашка приземлился. Можно прыгнуть ещё раз.";
  }
});

playfield.addEventListener("click", registerTrainingJump);

playfield.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat) registerTrainingJump();
  }
});

setGameState("ready");
