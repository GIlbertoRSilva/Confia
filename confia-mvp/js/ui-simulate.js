(function (global) {
  const { PLAYER_STRATEGIES, ALL_ENDINGS, runBatch } = global.CONFIA_SIMULATOR;
  const { DEFAULT_CONFIG } = global.CONFIA_CONFIG;

  const ENDING_LABEL = { saudavel: "Saudável", adaptacao: "Adaptação", fragil: "Frágil", isolamento: "Isolamento", colapso: "Colapso" };
  const ENDING_COLOR = { saudavel: "var(--trust-high)", adaptacao: "var(--primary)", fragil: "var(--half)", isolamento: "var(--muted-foreground)", colapso: "var(--fake)" };

  const CONFIG_FIELDS = Object.keys(DEFAULT_CONFIG);

  function renderConfigPanel(container, config, onChange, onReset) {
    let open = false;
    function paint() {
      container.innerHTML = `
        <details class="panel config-panel" style="padding:12px 16px;" ${open ? "open" : ""}>
          <summary><span>Configuração avançada</span><span>${open ? "−" : "+"}</span></summary>
          <div class="config-grid">
            ${CONFIG_FIELDS.map((k) => `<div class="config-field"><label>${k}</label><input type="number" step="any" data-key="${k}" value="${config[k]}"></div>`).join("")}
          </div>
          <button class="btn-lab-small outline config-reset" id="btnConfigReset">↺ Restaurar padrão</button>
        </details>
      `;
      container.querySelector("details").addEventListener("toggle", (e) => { open = e.target.open; });
      container.querySelectorAll("input[data-key]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const k = inp.dataset.key;
          const v = parseFloat(inp.value);
          if (!Number.isNaN(v)) { config[k] = v; onChange(config); }
        });
      });
      container.querySelector("#btnConfigReset").addEventListener("click", () => {
        Object.assign(config, DEFAULT_CONFIG);
        onReset();
        open = true;
        paint();
      });
    }
    paint();
  }

  function render(container, { onBack }) {
    let gamesPer = 100;
    let running = false;
    let results = null;
    let elapsedMs = null;
    let config = Object.assign({}, DEFAULT_CONFIG);
    const totalGames = () => PLAYER_STRATEGIES.length * gamesPer;

    container.innerHTML = `
      <div class="screen screen-padded-lg" style="display:flex;flex-direction:column;gap:12px;">
        <button id="btnBack" class="back-link">← Menu</button>
        <div id="configPanelWrap"></div>
        <div>
          <h2 style="font-size:30px;font-weight:700;">Simular estratégias</h2>
          <p class="text-muted" style="font-size:14px;margin-top:4px;">Roda <span id="gp1">${gamesPer}</span> partidas para cada uma das ${PLAYER_STRATEGIES.length} estratégias de jogador (<span id="tg1">${totalGames()}</span> partidas no total) e mostra a distribuição de finais.</p>
        </div>

        <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <label style="display:block;">
            <div style="display:flex;justify-content:space-between;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:var(--muted-foreground);margin-bottom:4px;"><span>Partidas por estratégia</span><span class="font-mono" id="gpv">${gamesPer}</span></div>
            <input type="range" id="gamesPer" min="20" max="300" step="10" value="${gamesPer}" style="width:100%;accent-color:var(--primary);">
          </label>
          <button id="btnRun" class="btn-lab-primary glow-primary">▶ Rodar ${totalGames()} partidas</button>
          <div id="elapsedWrap" class="font-mono" style="font-size:11px;color:var(--muted-foreground);"></div>
        </div>

        <div class="panel" style="padding:16px;">
          <div class="uppercase-tracking" style="margin-bottom:4px;">Como cada estratégia decide</div>
          <ul class="strategy-desc-list">${PLAYER_STRATEGIES.map((s) => `<li><span class="name">${s.label}:</span> ${s.desc}</li>`).join("")}</ul>
        </div>

        <div id="resultsWrap"></div>
      </div>
    `;

    container.querySelector("#btnBack").addEventListener("click", onBack);
    renderConfigPanel(container.querySelector("#configPanelWrap"), config, (c) => { config = c; }, () => { config = Object.assign({}, DEFAULT_CONFIG); });

    const gpInput = container.querySelector("#gamesPer");
    gpInput.addEventListener("input", () => {
      gamesPer = parseInt(gpInput.value, 10);
      container.querySelector("#gpv").textContent = gamesPer;
      container.querySelector("#gp1").textContent = gamesPer;
      container.querySelector("#tg1").textContent = totalGames();
      container.querySelector("#btnRun").textContent = `▶ Rodar ${totalGames()} partidas`;
    });

    function renderResults() {
      const wrap = container.querySelector("#resultsWrap");
      if (!results) { wrap.innerHTML = ""; return; }
      const rows = results.map((r) => `
        <tr>
          <td class="label">${r.label}</td>
          <td class="num">${r.endingsPct.saudavel.toFixed(0)}%</td>
          <td class="num">${r.endingsPct.adaptacao.toFixed(0)}%</td>
          <td class="num">${r.endingsPct.fragil.toFixed(0)}%</td>
          <td class="num">${r.endingsPct.isolamento.toFixed(0)}%</td>
          <td class="num">${r.endingsPct.colapso.toFixed(0)}%</td>
          <td class="num">${r.avgTrust.toFixed(0)}</td>
          <td class="num">${r.avgFakes.toFixed(1)}</td>
        </tr>`).join("");
      const bars = results.map((r) => `
        <div>
          <div class="stacked-bar-row"><span style="font-weight:600;">${r.label}</span><span class="text-muted font-mono">${r.games} partidas</span></div>
          <div class="stacked-bar">${ALL_ENDINGS.map((k) => r.endingsPct[k] > 0 ? `<div title="${ENDING_LABEL[k]}: ${r.endingsPct[k].toFixed(0)}%" style="width:${r.endingsPct[k]}%;background:${ENDING_COLOR[k]}"></div>` : "").join("")}</div>
        </div>`).join("");

      wrap.innerHTML = `
        <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
          <div class="uppercase-tracking">Distribuição de finais</div>
          <div class="results-table-wrap">
            <table class="results-table">
              <thead><tr>
                <th>Estratégia</th>
                <th class="num" style="color:${ENDING_COLOR.saudavel}">Saudável</th>
                <th class="num" style="color:${ENDING_COLOR.adaptacao}">Adaptação</th>
                <th class="num" style="color:${ENDING_COLOR.fragil}">Frágil</th>
                <th class="num" style="color:${ENDING_COLOR.isolamento}">Isolam.</th>
                <th class="num" style="color:${ENDING_COLOR.colapso}">Colapso</th>
                <th class="num">Trust</th>
                <th class="num">Fakes</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">${bars}</div>
          <div style="font-size:10px;color:var(--muted-foreground);">Trust = confiança média final da rede (0–100). Fakes = média de fakes compartilhadas pelo jogador-bot por partida.</div>
        </div>
      `;
    }

    container.querySelector("#btnRun").addEventListener("click", () => {
      running = true; results = null; elapsedMs = null;
      const btn = container.querySelector("#btnRun");
      btn.disabled = true; btn.textContent = "Rodando...";
      container.querySelector("#elapsedWrap").textContent = "";
      renderResults();
      setTimeout(() => {
        const t0 = performance.now();
        const r = runBatch(config, gamesPer);
        const t1 = performance.now();
        results = r; elapsedMs = t1 - t0; running = false;
        btn.disabled = false; btn.textContent = `▶ Rodar ${totalGames()} partidas`;
        container.querySelector("#elapsedWrap").textContent = `Concluído em ${(elapsedMs / 1000).toFixed(2)}s (${(elapsedMs / totalGames()).toFixed(1)}ms por partida).`;
        renderResults();
      }, 30);
    });
  }

  global.CONFIA_UI_SIMULATE = { render };
})(window);
