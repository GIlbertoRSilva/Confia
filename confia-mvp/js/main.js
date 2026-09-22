/**
 * main.js — porta fiel de ConfiaApp em index.tsx: controla a máquina de
 * estados de telas (splash → menu → how/tutorial/play/result/sandbox/simulate),
 * o estado da partida corrente, e a persistência de stats.
 */
(function (global) {
  const { createInitialState, beginRound, playAction, evaluateAchievements } = global.CONFIA_GAME;
  const { loadStats, saveStats } = global.CONFIA_PERSISTENCE;
  const AUDIO = global.CONFIA_AUDIO;

  const app = document.getElementById("app");

  let screen = "menu";
  let gameState = createInitialState();
  let reveal = null;
  let lastRecord = null;
  let stats = { firstDone: false, cumulativeVerify: 0, unlocked: [] };
  let playMount = null;

  function setScreen(next) {
    if (playMount) { playMount.destroy(); playMount = null; }
    screen = next;
    renderScreen();
  }

  function startGame(tutorial) {
    let s = createInitialState({ tutorial });
    s = beginRound(s);
    gameState = s;
    reveal = null;
    lastRecord = null;
    setScreen(tutorial ? "tutorial" : "play");
  }

  function handleAction(action) {
    if (gameState.ended || !gameState.currentMessage) return;
    const msg = gameState.currentMessage;
    AUDIO.playActionSfx(action);
    AUDIO.playOutcomeSfx(msg.klass, action);
    const { state: nextState, record } = playAction(gameState, action);
    reveal = { klass: msg.klass, playerAction: action };
    lastRecord = record;
    gameState = nextState;
    if (nextState.ended && nextState.ending) {
      setTimeout(() => AUDIO.playEndingSfx(nextState.ending), 500);
    }
    if (playMount) playMount.update(gameState, reveal, lastRecord);
  }

  function nextRound() {
    if (gameState.ended) {
      const newVerify = stats.cumulativeVerify + gameState.actionsCount.verificar;
      const unlocked = evaluateAchievements(gameState, newVerify);
      const merged = Array.from(new Set(stats.unlocked.concat(unlocked)));
      stats = { firstDone: true, cumulativeVerify: newVerify, unlocked: merged };
      saveStats(stats);
      setScreen("result");
      return;
    }
    reveal = null;
    lastRecord = null;
    gameState = beginRound(gameState);
    if (playMount) playMount.update(gameState, reveal, lastRecord);
  }

  function renderScreen() {
    if (screen === "menu") {
      global.CONFIA_UI_MENU.render(app, {
        stats,
        onPlay: () => startGame(!stats.firstDone),
        onTutorial: () => startGame(true),
        onHow: () => setScreen("how"),
        onSandbox: () => setScreen("sandbox"),
        onSimulate: () => setScreen("simulate"),
      });
    } else if (screen === "how") {
      global.CONFIA_UI_HOW.render(app, { onBack: () => setScreen("menu") });
    } else if (screen === "sandbox") {
      global.CONFIA_UI_SANDBOX.render(app, { onBack: () => setScreen("menu") });
    } else if (screen === "simulate") {
      global.CONFIA_UI_SIMULATE.render(app, { onBack: () => setScreen("menu") });
    } else if (screen === "result") {
      global.CONFIA_UI_RESULT.render(app, { state: gameState, stats, onMenu: () => setScreen("menu"), onAgain: () => startGame(false) });
    } else if (screen === "tutorial" || screen === "play") {
      playMount = global.CONFIA_UI_PLAY.mount(app, {
        onBackToMenu: () => setScreen("menu"),
        onAction: handleAction,
        onNextRound: nextRound,
      });
      if (!gameState.currentMessage && !gameState.ended) gameState = beginRound(gameState);
      playMount.update(gameState, reveal, lastRecord);
    }
  }

  function showSplash() {
    const splash = document.createElement("div");
    splash.className = "splash-screen";
    splash.setAttribute("role", "dialog");
    splash.setAttribute("aria-label", "Nós Studio");
    splash.innerHTML = `<div class="animate-scale-in"><img src="assets/nos-studio-logo.png" alt="Nós Studio" draggable="false" /></div>`;
    document.body.appendChild(splash);
    setTimeout(() => splash.classList.add("leaving"), 2500);
    setTimeout(() => splash.remove(), 3000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    stats = loadStats();
    global.CONFIA_EXPRESSIONS.preloadAllSprites();
    showSplash();
    renderScreen();
  });
})(window);
