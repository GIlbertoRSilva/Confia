(function (global) {
  const { NPCS, PLAYER_ID } = global.CONFIA_CHARACTERS;
  const { createInitialState, beginRound, playAction, ENDING_INFO } = global.CONFIA_GAME;
  const { DEFAULT_WEIGHTS, polarizationOf, reward } = global.CONFIA_QLEARNING;
  const cfg = global.CONFIA_CONFIG.runtimeConfig;

  const PRESETS = [
    { id: "engaja", name: "Só cliques importam", desc: "Recompensa engajamento a qualquer custo. A rede polariza rápido.", w: { w1: 1.0, w2: 0.0, w3: 0.0 } },
    { id: "saude", name: "Cuidar da rede", desc: "Penaliza polarização, valoriza estabilidade. Menos cliques, mais equilíbrio.", w: { w1: 0.3, w2: 0.4, w3: -0.9 } },
    { id: "cauto", name: "Sobreviver acima de tudo", desc: "Verifica muito, compartilha pouco. Cauteloso ao extremo.", w: { w1: 0.1, w2: 0.8, w3: -0.4 } },
    { id: "default", name: "Padrão da partida", desc: "A mesma configuração do jogo principal.", w: DEFAULT_WEIGHTS },
  ];
  const NETWORK_PRESETS = [
    { id: "neutral", name: "Rede neutra", desc: "Todo mundo começa com confiança 50. Estado padrão do jogo." },
    { id: "echo", name: "Câmara de eco", desc: "Thiago, Bot e Kevin já começam trancados num cluster de alta confiança interna." },
    { id: "polarized", name: "Polarização", desc: "Dois blocos opostos: Lia/Célia versus Thiago/Bot/Kevin, com pontes fracas." },
  ];

  function policyForWeights(w) {
    const shareBias = 0.4 + w.w1 * 0.4;
    const verifyBias = 0.4 - w.w3 * 0.3;
    const r = Math.random();
    if (r < shareBias) return "confiar";
    if (r < shareBias + verifyBias) return "verificar";
    return "ignorar";
  }

  function render(container, { onBack }) {
    let w = Object.assign({}, DEFAULT_WEIGHTS);
    let network = "neutral";
    let speed = 450;
    let simState = null;
    let rewards = [];
    let running = false;
    let timer = null;
    let prevEng = 0;
    let lastAction = null;
    let graph = null;

    container.innerHTML = `
      <div class="screen screen-padded-lg" style="display:flex;flex-direction:column;gap:12px;">
        <button id="btnBack" class="back-link">← Menu</button>
        <div class="lab-header">
          <h2 style="font-size:30px;font-weight:700;">Laboratório do algoritmo</h2>
          <p>Um algoritmo joga no seu lugar. Escolha a rede inicial, ajuste os pesos e clique SIMULAR para ver como a dinâmica evolui.</p>
        </div>

        <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div class="uppercase-tracking">Rede inicial</div>
          <div class="preset-grid" id="networkPresets"></div>
        </div>

        <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div class="uppercase-tracking">Estratégias prontas</div>
          <div class="preset-grid two-col" id="strategyPresets"></div>
          <div style="border-top:1px solid color-mix(in oklab, var(--border) 60%, transparent);padding-top:12px;display:flex;flex-direction:column;gap:8px;">
            <label class="slider-block"><div class="sl-label"><span>w1 · cliques (engajamento)</span><span class="v" id="w1v">${w.w1.toFixed(1)}</span></div><input type="range" id="w1" min="-1" max="1" step="0.1" value="${w.w1}"></label>
            <label class="slider-block"><div class="sl-label"><span>w2 · sobrevivência</span><span class="v" id="w2v">${w.w2.toFixed(1)}</span></div><input type="range" id="w2" min="-1" max="1" step="0.1" value="${w.w2}"></label>
            <label class="slider-block"><div class="sl-label"><span>w3 · anti-polarização</span><span class="v" id="w3v">${w.w3.toFixed(1)}</span></div><input type="range" id="w3" min="-1" max="1" step="0.1" value="${w.w3}"></label>
          </div>
          <div class="sandbox-grid-buttons">
            <button id="btnSimulate" class="btn-lab-primary glow-primary">▶ SIMULAR partida</button>
            <button id="btnReset" class="btn-lab-outline">↺ RESET</button>
          </div>
          <div class="sandbox-grid-buttons">
            <button id="btnStep" class="btn-lab-small">Passo a passo</button>
            <button id="btnLoop" class="btn-lab-small outline">Rodar em loop</button>
          </div>
          <label style="display:block;padding-top:4px;">
            <div class="sl-label" style="display:flex;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted-foreground);margin-bottom:4px;"><span>Velocidade do loop</span><span class="v" id="speedv">${speed}ms</span></div>
            <input type="range" id="speed" min="120" max="1200" step="40" value="${speed}" style="width:100%;accent-color:var(--primary);">
          </label>
        </div>

        <div id="simStatsWrap"></div>

        <div class="panel" style="height:240px;"><canvas id="sandboxGraphCanvas"></canvas></div>

        <div id="simEndedWrap"></div>
      </div>
    `;

    container.querySelector("#btnBack").addEventListener("click", () => { stop(); if (graph) graph.destroy(); onBack(); });

    const npWrap = container.querySelector("#networkPresets");
    NETWORK_PRESETS.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "preset-btn" + (p.id === network ? " active" : "");
      btn.innerHTML = `<div class="p-name">${p.name}</div><div class="p-desc">${p.desc}</div>`;
      btn.addEventListener("click", () => { network = p.id; resetAll(); redrawPresets(); });
      npWrap.appendChild(btn);
    });
    const spWrap = container.querySelector("#strategyPresets");
    function isActivePreset(p) { return p.w.w1 === w.w1 && p.w.w2 === w.w2 && p.w.w3 === w.w3; }
    PRESETS.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "preset-btn primary-active" + (isActivePreset(p) ? " active" : "");
      btn.innerHTML = `<div class="p-name">${p.name}</div><div class="p-desc">${p.desc}</div>`;
      btn.addEventListener("click", () => { w = Object.assign({}, p.w); resetAll(); syncSliders(); redrawPresets(); });
      spWrap.appendChild(btn);
    });
    function redrawPresets() {
      [...npWrap.children].forEach((el, i) => el.classList.toggle("active", NETWORK_PRESETS[i].id === network));
      [...spWrap.children].forEach((el, i) => el.classList.toggle("active", isActivePreset(PRESETS[i])));
    }

    const w1i = container.querySelector("#w1"), w2i = container.querySelector("#w2"), w3i = container.querySelector("#w3");
    function syncSliders() {
      w1i.value = w.w1; w2i.value = w.w2; w3i.value = w.w3;
      container.querySelector("#w1v").textContent = w.w1.toFixed(1);
      container.querySelector("#w2v").textContent = w.w2.toFixed(1);
      container.querySelector("#w3v").textContent = w.w3.toFixed(1);
    }
    w1i.addEventListener("input", () => { w.w1 = parseFloat(w1i.value); container.querySelector("#w1v").textContent = w.w1.toFixed(1); redrawPresets(); });
    w2i.addEventListener("input", () => { w.w2 = parseFloat(w2i.value); container.querySelector("#w2v").textContent = w.w2.toFixed(1); redrawPresets(); });
    w3i.addEventListener("input", () => { w.w3 = parseFloat(w3i.value); container.querySelector("#w3v").textContent = w.w3.toFixed(1); redrawPresets(); });

    const speedInput = container.querySelector("#speed");
    speedInput.addEventListener("input", () => { speed = parseInt(speedInput.value, 10); container.querySelector("#speedv").textContent = speed + "ms"; if (running) stop(); });

    graph = global.CONFIA_GRAPH.create(container.querySelector("#sandboxGraphCanvas"), {});

    function stop() { if (timer) clearInterval(timer); timer = null; running = false; syncLoopBtn(); }
    function resetAll() { stop(); simState = null; rewards = []; lastAction = null; prevEng = 0; refresh(); }
    function ensureStarted() { if (simState) return simState; simState = beginRound(createInitialState({ networkPreset: network })); return simState; }

    function tick(prev) {
      if (prev.ended) { stop(); return prev; }
      const action = policyForWeights(w);
      lastAction = action;
      const { state: next } = playAction(prev, action);
      const trustValues = NPCS.map((n) => next.trust[n.id]);
      const polar = polarizationOf(trustValues);
      const engagement = next.totalShares;
      const survived = !next.ended || next.ending !== "colapso";
      const rw = reward(engagement - prevEng, survived, polar, w);
      prevEng = engagement;
      rewards = rewards.slice(-19).concat([rw]);
      return next.ended ? next : beginRound(next);
    }

    function stepOnce() { stop(); const base = ensureStarted(); simState = tick(base); refresh(); }
    function runLoop() {
      stop();
      if (!simState) ensureStarted();
      running = true; syncLoopBtn();
      timer = setInterval(() => { simState = tick(simState); refresh(); }, speed);
    }
    function simulateFull() {
      stop();
      let s = beginRound(createInitialState({ networkPreset: network }));
      let pe = 0; const rws = []; let la = "confiar"; let guard = 0;
      while (!s.ended && guard++ < 32) {
        const action = policyForWeights(w);
        la = action;
        const { state: next } = playAction(s, action);
        const trustValues = NPCS.map((n) => next.trust[n.id]);
        const polar = polarizationOf(trustValues);
        const engagement = next.totalShares;
        const survived = !next.ended || next.ending !== "colapso";
        const rw = reward(engagement - pe, survived, polar, w);
        pe = engagement;
        rws.push(rw);
        s = next.ended ? next : beginRound(next);
      }
      prevEng = pe; rewards = rws.slice(-20); lastAction = la; simState = s;
      refresh();
    }

    function syncLoopBtn() { container.querySelector("#btnLoop").textContent = running ? "Pausar loop" : "Rodar em loop"; }

    container.querySelector("#btnSimulate").addEventListener("click", simulateFull);
    container.querySelector("#btnReset").addEventListener("click", resetAll);
    container.querySelector("#btnStep").addEventListener("click", stepOnce);
    container.querySelector("#btnLoop").addEventListener("click", () => { running ? stop() : runLoop(); });

    function rewardBars() {
      if (!rewards.length) return `<div class="text-muted" style="font-size:12px;font-style:italic;">Rode um passo para começar.</div>`;
      const max = Math.max(1, ...rewards.map(Math.abs));
      return `<div class="reward-bars">${rewards.map((r, i) => {
        const h = Math.max(2, (Math.abs(r) / max) * 60);
        const positive = r >= 0;
        const op = 0.4 + (i / rewards.length) * 0.6;
        return `<div class="bar-col"><div class="bar" style="height:${h}px;background:${positive ? "var(--trust-high)" : "var(--fake)"};opacity:${op}" title="${r.toFixed(2)}"></div></div>`;
      }).join("")}</div>`;
    }

    function refresh() {
      const trust = simState ? simState.trust : Object.fromEntries(NPCS.map((n) => [n.id, 50]).concat([[PLAYER_ID, 50]]));
      const meanTrust = Math.round(NPCS.map((n) => trust[n.id]).reduce((a, b) => a + b, 0) / NPCS.length);
      const polar = polarizationOf(NPCS.map((n) => trust[n.id]));
      const lastReward = rewards.length ? rewards[rewards.length - 1] : null;
      const avgReward = rewards.length ? rewards.reduce((a, b) => a + b, 0) / rewards.length : null;

      const statsWrap = container.querySelector("#simStatsWrap");
      if (simState) {
        statsWrap.innerHTML = `
          <div class="panel" style="padding:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
            <div><div class="stat-value" style="font-family:var(--font-display);font-size:20px;font-weight:700;">${Math.min(cfg.numRodadas, simState.records.length + (simState.ended ? 0 : 1))}/${cfg.numRodadas}</div><div class="stat-label" style="font-size:10px;text-transform:uppercase;color:var(--muted-foreground);">Rodada</div></div>
            <div><div class="stat-value" style="font-family:var(--font-display);font-size:20px;font-weight:700;">${meanTrust}%</div><div class="stat-label" style="font-size:10px;text-transform:uppercase;color:var(--muted-foreground);">Trust</div></div>
            <div><div class="stat-value" style="font-family:var(--font-display);font-size:20px;font-weight:700;">${polar.toFixed(2)}</div><div class="stat-label" style="font-size:10px;text-transform:uppercase;color:var(--muted-foreground);">Polariz.</div></div>
            <div><div class="stat-value" style="font-family:var(--font-display);font-size:20px;font-weight:700;">${lastReward === null ? "-" : lastReward.toFixed(2)}</div><div class="stat-label" style="font-size:10px;text-transform:uppercase;color:var(--muted-foreground);">Recomp.</div></div>
          </div>
          <div class="panel" style="padding:12px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted-foreground);margin-bottom:8px;"><span>Recompensa por rodada</span><span>Média: ${avgReward === null ? "-" : avgReward.toFixed(2)}</span></div>
            ${rewardBars()}
            ${lastAction ? `<div style="font-size:11px;color:var(--muted-foreground);margin-top:8px;">Última ação do agente: <span class="font-mono" style="color:var(--foreground);">${lastAction}</span></div>` : ""}
          </div>
        `;
      } else {
        statsWrap.innerHTML = "";
      }

      graph.update({ trust, trustMatrix: simState ? simState.trustMatrix : undefined, reputation: simState ? simState.reputation : undefined, engagementByNpc: simState ? simState.engagementByNpc : undefined, collapsed: simState ? simState.ending === "colapso" : false });

      const endedWrap = container.querySelector("#simEndedWrap");
      if (simState && simState.ended) {
        const info = ENDING_INFO[simState.ending];
        endedWrap.innerHTML = `<div class="panel" style="padding:12px;font-size:14px;border-color:color-mix(in oklab, var(--accent) 40%, var(--border));"><div class="uppercase-tracking">Final atingido</div><div class="font-display" style="font-weight:700;">${info.title}</div><p class="text-muted" style="font-size:12px;margin-top:4px;">${info.why}</p></div>`;
      } else {
        endedWrap.innerHTML = "";
      }
    }

    refresh();
  }

  global.CONFIA_UI_SANDBOX = { render };
})(window);
