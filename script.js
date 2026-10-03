const playfield = document.querySelector("#playfield");
const character = document.querySelector("#character");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
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

  if (!isPlaying) resetJump();

  playfield.setAttribute("aria-disabled", String(!isPlaying));
  playfield.tabIndex = isPlaying ? 0 : -1;
  startButton.disabled = gameState !== "ready";
  finishButton.disabled = !isPlaying;
  statusElement.parentElement.dataset.state = gameState;

  if (gameState === "ready") {
    statusElement.textContent = "Готов";
    messageElement.textContent = "Нажми «Старт», чтобы начать тренировку.";
  } else if (isPlaying) {
    statusElement.textContent = "Игра идёт";
    messageElement.textContent = "Кликни по площадке — Чебурашка подпрыгнет.";
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

finishButton.addEventListener("click", () => {
  if (gameState !== "playing") return;
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
