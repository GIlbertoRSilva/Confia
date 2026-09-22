/**
 * persistence.js — porta fiel de loadStats/saveStats (definidos em index.tsx).
 */
(function (global) {
  function loadStats() {
    if (typeof window === "undefined") return { firstDone: false, cumulativeVerify: 0, unlocked: [] };
    try {
      const s = JSON.parse(localStorage.getItem("confia-stats") || "{}");
      return { firstDone: !!s.firstDone, cumulativeVerify: s.cumulativeVerify ?? 0, unlocked: s.unlocked ?? [] };
    } catch (e) {
      return { firstDone: false, cumulativeVerify: 0, unlocked: [] };
    }
  }
  function saveStats(s) {
    if (typeof window !== "undefined") localStorage.setItem("confia-stats", JSON.stringify(s));
  }
  global.CONFIA_PERSISTENCE = { loadStats, saveStats };
})(window);
