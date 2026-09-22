(function (global) {
  const { NPCS, getCharacter } = global.CONFIA_CHARACTERS;
  const G = global.CONFIA_GAME;

  const ENDING_ACCENT = {
    saudavel: "var(--trust-high)", fragil: "var(--half)", colapso: "var(--fake)",
    isolamento: "var(--muted-foreground)", adaptacao: "var(--primary)",
  };
  const classLabel = (k) => (k === "true" ? "verdade" : k === "false" ? "fake" : "meia-verdade");
  const actionIcon = (a) => (a === "confiar" ? "🤝" : a === "verificar" ? "🔍" : "🚫");

  function replayPanel(records) {
    if (!records.length) return "";
    const rows = records.map((r, i) => {
      const emitter = getCharacter(r.emitterId);
      const d = G.expectedPlayerDeltas(r.playerAction, r.message.klass);
      const prevTrust = i === 0 ? 50 : Math.round(records[i - 1].networkTrust);
      const curTrust = Math.round(r.networkTrust);
      const dTrust = curTrust - prevTrust;
      const repClass = d.emitterReputation > 0 ? "pos" : d.emitterReputation < 0 ? "neg" : "";
      const trustClass = d.trustPlayerToEmitter > 0 ? "pos" : d.trustPlayerToEmitter < 0 ? "neg" : "";
      return `<li class="replay-item">
        <div class="line1"><span class="r">R${r.round}</span><span>${actionIcon(r.playerAction)} ${r.playerAction}</span><span class="text-muted">em</span><span class="who">${emitter.name}</span><span class="text-muted">(${classLabel(r.message.klass)})</span></div>
        <div class="line2">
          <span>reputação ${emitter.name}: <span class="${repClass}">${d.emitterReputation > 0 ? "+" : ""}${d.emitterReputation}</span></span>
          <span>trust mútuo: <span class="${trustClass}">${d.trustPlayerToEmitter > 0 ? "+" : ""}${d.trustPlayerToEmitter}/${d.trustEmitterToPlayer > 0 ? "+" : ""}${d.trustEmitterToPlayer}</span></span>
          <span>rede: ${curTrust}% (${dTrust > 0 ? "+" : ""}${dTrust})</span>
        </div>
      </li>`;
    }).join("");
    return `
      <details class="panel replay-panel">
        <summary aria-label="Abrir replay passo a passo das ${records.length} rodadas"><span>Replay passo a passo</span><span>${records.length} rodadas</span></summary>
        <ol class="replay-list">${rows}</ol>
        <div class="replay-footnote">🤝 confiar · 🔍 verificar · 🚫 ignorar. Trust mútuo mostra o delta que você aplicou no emissor (→) e o que ele aplicou em você (←).</div>
      </details>
    `;
  }

  function render(container, { state, stats, onMenu, onAgain }) {
    const ending = state.ending;
    const info = G.ENDING_INFO[ending];
    const trustFinal = Math.round(NPCS.map((n) => state.trust[n.id]).reduce((a, b) => a + b, 0) / NPCS.length);
    const newUnlocks = stats.unlocked;

    const trail = state.records.map((r) => ({ round: r.round, action: r.playerAction, klass: r.message.klass, trust: Math.round(r.networkTrust) }));
    const trailHtml = trail.map((t) => {
      const bg = t.action === "confiar" ? "var(--trust-high)" : t.action === "verificar" ? "var(--primary)" : "var(--muted)";
      const kl = t.klass === "true" ? "V" : t.klass === "false" ? "F" : "½";
      return `<div class="trail-item" title="Rodada ${t.round} · ${t.action} · trust ${t.trust}%">
        <div class="box" style="background:${bg}">${t.action[0].toUpperCase()}</div>
        <span class="sub">${kl}·${t.trust}%</span>
      </div>`;
    }).join("");

    const achList = Object.keys(G.ACHIEVEMENTS).map((k) => {
      const unlocked = newUnlocks.includes(k);
      return `<li class="ach-item ${unlocked ? "" : "locked"}"><span class="dot"></span><span class="name">${G.ACHIEVEMENTS[k].name}</span><span class="desc">${G.ACHIEVEMENTS[k].desc}</span></li>`;
    }).join("");

    container.innerHTML = `
      <div class="screen screen-padded" style="display:flex;flex-direction:column;gap:16px;">
        <div class="result-title-block float-in">
          <div class="eyebrow">Final da partida</div>
          <h2 style="color:${ENDING_ACCENT[ending]}">${info.title}</h2>
          <p class="msg">${info.message}</p>
        </div>

        <div class="panel stat-grid">
          <div><div class="stat-value">${trustFinal}%</div><div class="stat-label">Trust final</div></div>
          <div><div class="stat-value">${state.fakeShared}</div><div class="stat-label">Fakes compart.</div></div>
          <div><div class="stat-value">${state.records.length}</div><div class="stat-label">Rodadas</div></div>
          <div><div class="stat-value">${state.actionsCount.confiar}</div><div class="stat-label">Confiar</div></div>
          <div><div class="stat-value">${state.actionsCount.verificar}</div><div class="stat-label">Verificar</div></div>
          <div><div class="stat-value">${state.actionsCount.ignorar}</div><div class="stat-label">Ignorar</div></div>
        </div>

        <div class="panel why-panel">
          <div class="head">Por que este final</div>
          <p class="why-text">${info.why}</p>
          <div class="lesson-box"><div class="head">Lição</div><p>${info.lesson}</p></div>
          <div class="trail-wrap">
            <div class="head">Trilha das suas decisões</div>
            <div class="trail-row">${trailHtml}</div>
            <div class="trail-legend">C = confiar · V = verificar · I = ignorar · letra abaixo indica a classe da mensagem (V/F/½) e trust da rede após a rodada.</div>
          </div>
        </div>

        ${replayPanel(state.records)}

        <div class="panel achievements-panel">
          <div class="head">Conquistas</div>
          <ul class="ach-list">${achList}</ul>
        </div>

        <div class="panel final-graph-panel">
          <div class="head">Estado final da rede</div>
          <div class="canvas-wrap"><canvas id="finalGraphCanvas"></canvas></div>
        </div>

        <div class="result-actions">
          <button id="btnMenu" class="btn-menu">Menu</button>
          <button id="btnAgain" class="btn-again">Jogar novamente</button>
        </div>
      </div>
    `;

    const gcanvas = container.querySelector("#finalGraphCanvas");
    const graph = global.CONFIA_GRAPH.create(gcanvas, { compact: true });
    graph.update({ trust: state.trust, trustMatrix: state.trustMatrix, collapsed: ending === "colapso" });

    container.querySelector("#btnMenu").addEventListener("click", () => { graph.destroy(); onMenu(); });
    container.querySelector("#btnAgain").addEventListener("click", () => { graph.destroy(); onAgain(); });
  }

  global.CONFIA_UI_RESULT = { render };
})(window);
