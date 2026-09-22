/**
 * ui-menu.js — porta fiel de MenuScreen/FloatingCharacters em index.tsx.
 */
(function (global) {
  const { getCharacter } = global.CONFIA_CHARACTERS;

  const SPOTS = [
    { id: "lia", x: "8%", y: "-6%", size: 56, delay: "0s" },
    { id: "thiago", x: "78%", y: "-10%", size: 56, delay: "0.4s" },
    { id: "celia", x: "82%", y: "62%", size: 52, delay: "0.8s" },
    { id: "kevin", x: "2%", y: "58%", size: 52, delay: "1.2s" },
    { id: "eco", x: "-4%", y: "24%", size: 44, delay: "1.6s" },
    { id: "fantasma", x: "88%", y: "30%", size: 44, delay: "2s" },
  ];

  function render(container, { stats, onPlay, onTutorial, onHow, onSandbox, onSimulate }) {
    container.innerHTML = `
      <div class="screen screen-centered">
        <div class="menu-logo-wrap float-in">
          <div class="floating-characters" id="floatingChars" aria-hidden="true"></div>
          <img class="logo" src="assets/confia-logo.png" alt="Confia" draggable="false" />
          <p class="menu-tagline">Dez rodadas, sete pessoas, uma rede. Cada escolha sua muda o que os outros vão fazer depois.</p>
        </div>

        <div class="menu-actions">
          <button id="btnPlay" class="btn btn-primary glow-primary">${stats.firstDone ? "Jogar" : "Começar (tutorial)"}</button>
          ${stats.firstDone ? `<button id="btnTutorial" class="btn btn-outline">Refazer tutorial</button>` : ""}
          <button id="btnHow" class="btn btn-outline">Como funciona</button>
          <button id="btnSandbox" class="btn btn-outline" ${stats.firstDone ? "" : "disabled"}>${stats.firstDone ? "" : "🔒 "}Laboratório do algoritmo</button>
          <button id="btnSimulate" class="btn btn-outline">🧪 Simular estratégias</button>
        </div>

        ${stats.unlocked.length > 0 ? `<div class="menu-unlocked">Conquistas desbloqueadas: ${stats.unlocked.length}/5</div>` : ""}

        <div class="menu-footer">
          <div class="uppercase-tracking">um jogo do nós studio</div>
          <div class="social-row">
            <a class="social-link" href="https://www.instagram.com/nosstudiobr" target="_blank" rel="noopener noreferrer" aria-label="Instagram do nós Studio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Instagram
            </a>
            <a class="social-link" href="https://www.tiktok.com/@nosstudiobr" target="_blank" rel="noopener noreferrer" aria-label="TikTok do nós Studio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.87a8.16 8.16 0 0 0 4.77 1.52V6.94a4.85 4.85 0 0 1-1.84-.25z"/></svg>
              TikTok
            </a>
          </div>
        </div>
      </div>
    `;

    const fc = container.querySelector("#floatingChars");
    for (const s of SPOTS) {
      const c = getCharacter(s.id);
      const wrap = document.createElement("div");
      wrap.className = "fc-item animate-float";
      wrap.style.left = s.x;
      wrap.style.top = s.y;
      wrap.style.width = s.size + "px";
      wrap.style.height = s.size + "px";
      wrap.style.animationDelay = s.delay;
      const sprite = global.CONFIA_CHAR_SPRITE.create({
        characterId: s.id, expression: "neutro", size: s.size, color: c.color, fallback: c.symbol, name: c.name,
      });
      sprite.el.style.width = "100%";
      sprite.el.style.height = "100%";
      wrap.appendChild(sprite.el);
      fc.appendChild(wrap);
    }

    container.querySelector("#btnPlay").addEventListener("click", onPlay);
    const tb = container.querySelector("#btnTutorial");
    if (tb) tb.addEventListener("click", onTutorial);
    container.querySelector("#btnHow").addEventListener("click", onHow);
    const sb = container.querySelector("#btnSandbox");
    sb.addEventListener("click", () => { if (stats.firstDone) onSandbox(); });
    container.querySelector("#btnSimulate").addEventListener("click", onSimulate);
  }

  global.CONFIA_UI_MENU = { render };
})(window);
