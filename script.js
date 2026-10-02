const playfield = document.querySelector("#playfield");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#message");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const finishButton = document.querySelector("#finish-button");

let trainingClicks = 0;
let gameState = "ready";

function setGameState(state) {
  gameState = state;
  const isPlaying = gameState === "playing";

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
    messageElement.textContent = "Кликни по площадке — тренируем реакцию.";
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

function registerTrainingClick() {
  if (gameState !== "playing") return;

  trainingClicks += 1;
  scoreElement.textContent = trainingClicks;
  messageElement.textContent =
    trainingClicks === 1
      ? "Отлично! Чебурашка заметил мандарин."
      : "Реакция становится лучше — прыжок добавим позже.";
}

playfield.addEventListener("click", registerTrainingClick);

playfield.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    registerTrainingClick();
  }
});

setGameState("ready");
