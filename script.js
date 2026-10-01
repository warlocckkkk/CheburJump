const playfield = document.querySelector("#playfield");
const scoreElement = document.querySelector("#score");
const messageElement = document.querySelector("#message");

let trainingClicks = 0;

function registerTrainingClick() {
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
