(function () {
  const STORAGE_KEY = "juliaVisitCount.v1";

  const readCount = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const value = raw ? Number(raw) : 0;
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      console.warn("Visitas: não foi possível ler o contador.", error);
      return 0;
    }
  };

  const writeCount = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      console.warn("Visitas: não foi possível atualizar o contador.", error);
    }
  };

  const updateDisplay = () => {
    const display = document.getElementById("visitCountDisplay");
    if (!display) {
      return;
    }
    const newTotal = readCount() + 1;
    writeCount(newTotal);
    display.textContent = newTotal.toLocaleString("pt-BR");
  };

  document.addEventListener("DOMContentLoaded", updateDisplay);
})();
