const descriptions = {
  blue: "선명한 파랑과 순백. 굵고 간결한 제목, 또렷한 여행 정보.",
  ink: "짙은 잉크색과 라임 포인트. 묵직한 표지와 흰색 본문의 대비.",
  violet: "흰색과 선명한 보라. 가벼운 제목과 빛이 비치는 유리 탐색 막대.",
};
document.querySelectorAll("[data-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.dataset.theme = button.dataset.choice;
    document
      .querySelectorAll("[data-choice]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    document.getElementById("theme-note").textContent =
      descriptions[button.dataset.choice];
  });
});
