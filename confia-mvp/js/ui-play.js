/**
 * ui-play.js — porta fiel da tela de jogo compartilhada por "tutorial" e
 * "play" em index.tsx (HUD, ConceptCard, TutorialBanner/Hint, ConfiaGraph,
 * PhenomenaPanel, InspectionPanel, MessageCard, reveal panel, PropagationTree).
 */
(function (global) {
  const { NPCS, PLAYER_ID, getCharacter } = global.CONFIA_CHARACTERS;
  const { klassLabel } = global.CONFIA_MESSAGES;
  const { CONCEPT_BY_ROUND } = global.CONFIA_NETWORK;
  const cfg = global.CONFIA_CONFIG.runtimeConfig;

  const CONCEPT_INFO = {
    "Dilema do Prisioneiro": {
      short: "Cooperar dá o melhor coletivo, trair dá o melhor individual. Se todo mundo trai, todo mundo perde.",
      long: "Você e o emissor têm o mesmo dilema: confiar (cooperar) rende mais quando o outro é honesto, mas quem confia em quem espalha fake sai no prejuízo. Verificar é a saída racional quando você não conhece a intenção do outro.",
      example: "Lia sempre coopera; Thiago quase sempre trai. Perceba como a escolha muda quem manda a mensagem.",
    },
    "Jogos de Coordenação": {
      short: "O resultado depende de várias pessoas escolherem o mesmo lado ao mesmo tempo.",
      long: "Se muita gente verifica junto, mentira morre cedo e a rede se estabiliza no alto. Se a maioria confia sem checar, fake vira normal. Não é sobre uma jogada isolada: é sobre convergir para o mesmo comportamento.",
      example: "Célia sempre verifica e o Bot sempre repassa. São dois pontos de convergência opostos disputando a rede.",
    },
    "Jogos de Sinalização": {
      short: "Suas ações mandam um sinal para os outros sobre quem você é.",
      long: "Cada escolha é lida pelos vizinhos como um sinal: quem confia em fake sinaliza descuido; quem verifica sinaliza cautela. Kevin retribui na mesma moeda e Eco copia. Ou seja, o que você faz volta pra você via reputação.",
      example: "Eco copia quem falou com ela. Kevin devolve o que você fez por último. Você está sendo lido.",
    },
    "Bens Públicos": {
      short: "Verificar dá trabalho pra você, mas o benefício é de todo mundo.",
      long: "Uma rede honesta é um bem público: só existe se um número suficiente de pessoas pagar o custo de verificar. Se todos esperarem que 'os outros verifiquem por mim', vira tragédia dos comuns: ninguém verifica, tudo colapsa.",
      example: "Fantasma entra em cena e prefere ficar de fora. Free-rider clássico: se aproveita da rede sem contribuir.",
    },
  };

  const TUTORIAL_TIPS = {
    1: "Rodada 1. Lia coopera. Se você verificar e for verdade, a reputação dela sobe (+8) e a sua também sobe perante seus vizinhos.",
    2: "Rodada 2. Thiago quase sempre repassa fake. Verificar aqui puxa a reputação dele pra baixo (−13) e mostra pros seus vizinhos que você checa.",
    3: "Entram Célia (verifica) e Bot (repassa). Verdade e mentira são simétricas: verificar recompensa quem é honesto e pune quem espalha fake.",
    4: "A partir daqui suas ações também mudam sua própria reputação. Confiar em fake te derruba, verificar te fortalece.",
    5: "Entram Eco (copia) e Kevin (retribui). O que você fez em rodadas passadas volta pra você agora.",
    7: "Fantasma ignora. Ignorar fake tem custo pequeno de omissão: seus vizinhos percebem seu silêncio.",
  };

  function nameOf(id) { return id === PLAYER_ID ? "Você" : getCharacter(id).name; }

  function trustBarColor(v) {
    if (v > 65) return "var(--trust-high)";
    if (v >= 35) return "var(--trust-mid)";
    return "var(--trust-low)";
  }

  function bar(v) {
    const c = v > 65 ? "var(--trust-high)" : v >= 35 ? "var(--half)" : "var(--fake)";
    return `<div class="mini-bar"><div style="width:${Math.max(0, Math.min(100, v))}%;background:${c}"></div></div>`;
  }

  function playerImpactNote(record) {
    const emitter = getCharacter(record.emitterId);
    const npcActs = Object.entries(record.propagation.actions).filter(([id]) => id !== PLAYER_ID && id !== record.emitterId);
    const npcShared = npcActs.filter(([, a]) => a === "confiar").length;
    const reached = npcActs.length;
    const cls = record.message.klass;
    let headline = "", detail = "", theory = "";
    if (record.playerAction === "ignorar") {
      headline = "Você ignorou. A cascata não passa por você.";
      detail = `A mensagem ainda corre por outros vizinhos de ${emitter.name} (${reached} pessoa${reached === 1 ? "" : "s"} alcançada${reached === 1 ? "" : "s"}, ${npcShared} repasse${npcShared === 1 ? "" : "s"}), mas o seu ramo para aqui.`;
      theory = "Em teoria dos jogos, não jogar também é uma jogada: você deixa de cooperar e de trair.";
    } else if (record.playerAction === "verificar") {
      headline = "Você verificou antes de decidir.";
      detail = cls === "false" ? "A mensagem era falsa. Verificar evitou que ela seguisse por você."
        : cls === "true" ? "A mensagem era verdadeira. Verificar custa tempo, mas confirma antes de amplificar."
        : "A mensagem era meia verdade. Verificar te protege de espalhar uma versão distorcida.";
      theory = "Verificar é a estratégia cautelosa: aceita um custo pequeno para evitar um prejuízo grande no coletivo.";
    } else {
      headline = "Você confiou. Sua escolha passou adiante.";
      detail = cls === "false" ? "Como era falsa, quem confiou perdeu confiança em quem mandou. O prejuízo se espalha em cadeia."
        : cls === "true" ? "Como era verdadeira, quem confiou ganha confiança em quem mandou. Cooperação recompensada."
        : "Meia verdade: o dano é menor, mas ainda corrói a confiança de quem aceitou.";
      theory = "Confiar é cooperar: bom quando o outro também coopera de boa fé, arriscado quando não.";
    }
    return `<div class="impact-note"><div class="headline">${headline}</div><div class="detail">${detail}</div><div class="theory">${theory}</div></div>`;
  }

  function tutorialHint(record) {
    const emitter = getCharacter(record.emitterId);
    const klass = record.message.klass;
    const act = record.playerAction;
    let line = "";
    if (act === "confiar") {
      line = `Você confiou em ${emitter.name}. +10 de engajamento pra ele, +5 de confiança mútua. A reputação pública não muda porque ninguém verificou ainda.`;
    } else if (act === "verificar") {
      if (klass === "true") line = `Você verificou e era verdade. +8 na reputação de ${emitter.name} (base 5 + boca a boca 3) e seus vizinhos passam a confiar mais nele.`;
      else if (klass === "false") line = `Você verificou e era fake. −13 na reputação de ${emitter.name} (base −10, boca a boca −3). A cascata parou em você e seus vizinhos ficaram alerta.`;
      else line = `Você verificou e era meia-verdade. −6 na reputação de ${emitter.name} (base −3, boca a boca −3).`;
    } else {
      line = klass === "true"
        ? `Você ignorou uma verdade. Nada muda no seu ramo, mas você perdeu a chance de engajar ou ganhar reputação verificando.`
        : `Você ignorou uma ${klass === "false" ? "fake" : "meia-verdade"}. A mensagem ainda roda pelos outros vizinhos de ${emitter.name}, e seus vizinhos percebem seu silêncio.`;
    }
    return `<div class="tutorial-hint"><span class="tag">Como funcionou</span>${line}</div>`;
  }

  function mount(container, cb) {
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-header">
          <button id="btnMenu" class="back-link">← Menu</button>
          <div class="spacer">
            <button id="btnSound" class="sound-toggle">♪ Som</button>
            <span class="mode-label" id="modeLabel">Partida</span>
          </div>
        </div>

        <div class="panel hud" id="hud"></div>
        <div id="conceptCardWrap"></div>
        <div id="tutorialBannerWrap"></div>

        <div class="panel graph-panel">
          <canvas id="playGraphCanvas"></canvas>
          <div class="graph-caption">Rede · você é o ponto azul</div>
        </div>

        <div id="phenomenaWrap"></div>
        <div id="inspectionWrap"></div>
        <div id="messageCardWrap"></div>
        <div id="revealWrap"></div>
      </div>
    `;

    container.querySelector("#btnMenu").addEventListener("click", cb.onBackToMenu);
    const soundBtn = container.querySelector("#btnSound");
    function syncSound() {
      const on = global.CONFIA_AUDIO.isSoundEnabled();
      soundBtn.textContent = on ? "♪ Som" : "✕ Som";
    }
    syncSound();
    soundBtn.addEventListener("click", () => {
      global.CONFIA_AUDIO.setSoundEnabled(!global.CONFIA_AUDIO.isSoundEnabled());
      syncSound();
    });

    const graph = global.CONFIA_GRAPH.create(container.querySelector("#playGraphCanvas"), {});
    let conceptOpen = false;

    function update(state, reveal, lastRecord) {
      container.querySelector("#modeLabel").textContent = state.isTutorial ? "Partida tutorial" : "Partida";

      const npcTrust = NPCS.map((n) => state.trust[n.id]);
      const networkTrust = npcTrust.reduce((a, b) => a + b, 0) / npcTrust.length;
      const engagement = state.totalShares;
      const concept = CONCEPT_BY_ROUND[state.round] || (state.isTutorial ? "Tutorial" : "");
      const showAlgoHint = state.round >= 4;
      const algoLevel = state.round >= 6 ? "revealed" : "hint";

      // HUD
      const playerExpr = global.CONFIA_EXPRESSIONS.selectPlayerExpression(reveal ? reveal.playerAction : null);
      const hud = container.querySelector("#hud");
      hud.innerHTML = "";
      const sprite = global.CONFIA_CHAR_SPRITE.create({ characterId: PLAYER_ID, expression: playerExpr, size: 32, color: "#4169E1", fallback: "?", name: "Você" });
      hud.appendChild(sprite.el);
      const hudBody = document.createElement("div");
      hudBody.className = "hud-body";
      hudBody.innerHTML = `
        <div class="hud-top"><span>Rodada <span class="round-num">${Math.min(state.round, cfg.numRodadas)}/${cfg.numRodadas}</span></span><span class="concept">${concept}</span></div>
        <div>
          <div class="hud-bar-label"><span>Confiança da rede</span><span class="font-mono">${Math.round(networkTrust)}%</span></div>
          <div class="hud-bar"><div style="width:${Math.max(2, networkTrust)}%;background:${trustBarColor(networkTrust)}"></div></div>
        </div>
        <div>
          <div class="hud-bar-label"><span>Engajamento${showAlgoHint ? '<span class="q-badge" title="Algo está medindo seu comportamento">?</span>' : ""}</span><span class="font-mono">${engagement}</span></div>
          <div class="hud-bar"><div style="width:${Math.min(100, engagement * 10)}%;background:var(--primary)"></div></div>
        </div>
        ${algoLevel === "revealed" ? `<div class="hud-algo-hint">O sistema recompensa quem compartilha mais.</div>` : ""}
      `;
      hud.appendChild(hudBody);

      // ConceptCard
      const info = CONCEPT_INFO[concept];
      const conceptWrap = container.querySelector("#conceptCardWrap");
      if (info) {
        const isFirstRoundOfConcept = state.round % 2 === 1;
        conceptWrap.innerHTML = `
          <div class="panel concept-card">
            <button class="head" id="conceptToggle">
              <span style="display:flex;flex-direction:column;">
                <span class="eyebrow">Conceito da rodada${isFirstRoundOfConcept ? ' <span class="new-tag">· novo</span>' : ""}</span>
                <span class="title">${concept}</span>
              </span>
              <span class="toggle">${conceptOpen ? "−" : "+"}</span>
            </button>
            ${!conceptOpen ? `<p class="short">${info.short}</p>` : `
              <div class="long-body">
                <p>${info.long}</p>
                <p class="example">Nesta partida: ${info.example}</p>
              </div>`}
          </div>
        `;
        conceptWrap.querySelector("#conceptToggle").addEventListener("click", () => { conceptOpen = !conceptOpen; update(state, reveal, lastRecord); });
      } else {
        conceptWrap.innerHTML = "";
      }

      // TutorialBanner
      const tutWrap = container.querySelector("#tutorialBannerWrap");
      if (state.isTutorial) {
        const tip = TUTORIAL_TIPS[state.round];
        tutWrap.innerHTML = tip ? `<div class="panel tutorial-banner float-in"><div class="eyebrow">Tutorial · rodada ${state.round}</div><p>${tip}</p></div>` : "";
      } else {
        tutWrap.innerHTML = "";
      }

      // Graph
      const activeCascade = lastRecord ? [lastRecord.emitterId, ...Object.keys(lastRecord.propagation.actions).filter((id) => lastRecord.propagation.actions[id] === "confiar")] : [];
      let propagationEdges;
      if (lastRecord && reveal) {
        propagationEdges = [];
        for (const [nodeId, senderId] of Object.entries(lastRecord.propagation.senderOf)) {
          const action = lastRecord.propagation.actions[nodeId];
          if (!action) continue;
          propagationEdges.push({ from: senderId, to: nodeId, action });
        }
      }
      graph.update({
        trust: state.trust, trustMatrix: state.trustMatrix, reputation: state.reputation,
        engagementByNpc: state.engagementByNpc, highlightNode: state.currentEmitter,
        activeCascade, propagationEdges, collapsed: networkTrust < 30,
        playerAction: reveal ? reveal.playerAction : null, emitterId: state.currentEmitter,
      });

      function renderPhenomena(phenomena) {
        const { chambers, polarization, silentFailure } = phenomena;
        const hasAny = chambers.length > 0 || !!polarization || !!silentFailure;
        const wrap = container.querySelector("#phenomenaWrap");
        if (!hasAny) { wrap.innerHTML = ""; return; }
        let html = `<div class="panel phenomena-panel float-in"><div class="head">Fenômenos detectados na rede</div>`;
        chambers.forEach((c, i) => {
          html += `<div class="phenomena-item"><div class="title">🔵 Câmara de eco ${chambers.length > 1 ? "#" + (i + 1) : ""}</div>
            <div class="names">${c.ids.map(nameOf).join(" · ")}</div>
            <div class="criteria">confiança interna ≈ ${Math.round(c.avgIn)} · saída ≈ ${Math.round(c.avgOut)} (critério: interna &gt; ${cfg.chamberAvgInMin}, saída &lt; ${cfg.chamberAvgOutMax})</div></div>`;
        });
        if (polarization) {
          html += `<div class="phenomena-item"><div class="title">⚡ Polarização entre grupos</div>
            <div class="names">${polarization.a.map(nameOf).join(", ")} <span class="text-accent">⇔</span> ${polarization.b.map(nameOf).join(", ")}</div>
            <div class="criteria">confiança cruzada ≈ ${Math.round(polarization.cross)} (critério: &lt; ${cfg.polarizationCrossMax})</div></div>`;
        }
        if (silentFailure && !polarization && chambers.length === 0) {
          html += `<div class="phenomena-item"><div class="title">🌀 Falha silenciosa</div>
            <div class="names">${nameOf(silentFailure[0])} e ${nameOf(silentFailure[1])} confiam muito entre si sem formar grupo maior.</div>
            <div class="criteria">par com confiança mútua &gt; ${cfg.silentFailureMin} sem cluster fechado</div></div>`;
        }
        html += `</div>`;
        wrap.innerHTML = html;
      }
      // immediate one-shot phenomena render from current data (don't wait for rAF)
      renderPhenomena(global.CONFIA_PHENOMENA.detectPhenomena(state.trust, state.trustMatrix));

      // InspectionPanel
      const inspWrap = container.querySelector("#inspectionWrap");
      if (state.currentEmitter) {
        const emitter = getCharacter(state.currentEmitter);
        const emitterRep = Math.round(state.reputation[state.currentEmitter] ?? 50);
        const nbrs = Object.keys(state.trustMatrix).filter((k) => (state.trustMatrix[k]?.[PLAYER_ID] ?? 0) > 0);
        const playerRep = Math.round(nbrs.length ? nbrs.reduce((s, n) => s + state.trustMatrix[n][PLAYER_ID], 0) / nbrs.length : 50);
        const mutualWithEmitter = Math.round(((state.trustMatrix[PLAYER_ID]?.[state.currentEmitter] ?? 50) + (state.trustMatrix[state.currentEmitter]?.[PLAYER_ID] ?? 50)) / 2);
        inspWrap.innerHTML = `
          <details class="panel inspection-panel">
            <summary aria-label="Inspecionar reputação de ${emitter.name} e sua reputação na rede">
              <span class="label">Inspecionar</span>
              <span class="closed-summary">${emitter.symbol} ${emitterRep}% · você ${playerRep}%</span>
            </summary>
            <div class="inspection-body">
              <div class="inspection-row"><div class="row-head"><span>Reputação de ${emitter.name}</span><span>${emitterRep}%</span></div>${bar(emitterRep)}</div>
              <div class="inspection-row"><div class="row-head"><span>Sua reputação na rede</span><span>${playerRep}%</span></div>${bar(playerRep)}</div>
              <div class="inspection-row"><div class="row-head"><span>Confiança mútua com ${emitter.name}</span><span>${mutualWithEmitter}%</span></div>${bar(mutualWithEmitter)}</div>
            </div>
          </details>
        `;
      } else {
        inspWrap.innerHTML = "";
      }

      // MessageCard
      const msgWrap = container.querySelector("#messageCardWrap");
      if (state.currentMessage) {
        const msg = state.currentMessage;
        const emitter = getCharacter(state.currentEmitter);
        const expr = global.CONFIA_EXPRESSIONS.selectNpcExpression(reveal ? reveal.playerAction : null, state.trust[state.currentEmitter] ?? 50, state.reputation[state.currentEmitter] ?? 50);
        msgWrap.innerHTML = "";
        const card = document.createElement("div");
        card.className = "panel message-card float-in";
        const head = document.createElement("div");
        head.className = "head";
        const msprite = global.CONFIA_CHAR_SPRITE.create({ characterId: state.currentEmitter, expression: expr, size: 56, color: emitter.color, fallback: emitter.symbol, name: emitter.name });
        head.appendChild(msprite.el);
        const headText = document.createElement("div");
        headText.innerHTML = `<div class="from-label">Mensagem de</div><div class="from-name">${emitter.name}</div>`;
        head.appendChild(headText);
        const topic = document.createElement("div");
        topic.className = "topic";
        topic.textContent = msg.topic;
        head.appendChild(topic);
        card.appendChild(head);

        const p = document.createElement("p");
        p.className = "msg-text";
        p.textContent = `"${msg.text}"`;
        card.appendChild(p);

        if (reveal) {
          const rb = document.createElement("div");
          rb.className = "reveal-box";
          const color = reveal.klass === "true" ? "var(--truth)" : reveal.klass === "false" ? "var(--fake)" : "var(--half)";
          rb.innerHTML = `<span class="text-muted">Classificação: </span><span style="font-weight:600;color:${color}">${klassLabel(reveal.klass)}</span><span class="text-muted"> · Sua ação: </span><span style="font-weight:600">${reveal.playerAction}</span>`;
          card.appendChild(rb);
        }

        const grid = document.createElement("div");
        grid.className = "actions-grid";
        for (const [action, label] of [["confiar", "Confiar"], ["verificar", "Verificar"], ["ignorar", "Ignorar"]]) {
          const btn = document.createElement("button");
          btn.className = `action-btn ${action}`;
          btn.textContent = label;
          btn.disabled = !!reveal;
          btn.addEventListener("click", () => cb.onAction(action));
          grid.appendChild(btn);
        }
        card.appendChild(grid);
        msgWrap.appendChild(card);
      } else {
        msgWrap.innerHTML = "";
      }

      // Reveal panel
      const revealWrap = container.querySelector("#revealWrap");
      if (reveal && lastRecord) {
        revealWrap.innerHTML = "";
        const panel = document.createElement("div");
        panel.className = "panel reveal-panel float-in";
        let inner = `<div class="head">Feed de atividades</div>`;
        if (state.isTutorial && lastRecord.round <= 3) inner += tutorialHint(lastRecord);
        inner += playerImpactNote(lastRecord);
        const feed = lastRecord.propagation.activityFeed;
        inner += `<ul class="activity-list">${feed.length === 0 ? '<li class="empty">Ninguém repassou a mensagem.</li>' : feed.map((l) => `<li>• ${l}</li>`).join("")}</ul>`;
        inner += `<div class="reveal-actions"><button id="btnTree" class="btn-tree">Ver árvore de propagação</button><button id="btnNext" class="btn-next">${state.ended ? "Ver resultado" : "Próxima rodada →"}</button></div>`;
        panel.innerHTML = inner;
        revealWrap.appendChild(panel);
        panel.querySelector("#btnTree").addEventListener("click", () => {
          const modal = global.CONFIA_MODAL.open({
            title: "Árvore de propagação",
            bodyHtml: `<p class="text-muted" style="font-size:12px;margin-bottom:12px;">Como a mensagem se espalhou a partir de <b>${getCharacter(lastRecord.emitterId).name}</b>. Linha verde: alguém confiou e passou adiante. Linha azul: alguém verificou. Linha pontilhada: alguém ignorou.</p><div class="tree-canvas-wrap"><canvas id="treeCanvas"></canvas></div>`,
          });
          const canvas = modal.bodyEl.querySelector("#treeCanvas");
          requestAnimationFrame(() => global.CONFIA_PROPAGATION_TREE.render(canvas, lastRecord.propagation.tree));
        });
        panel.querySelector("#btnNext").addEventListener("click", cb.onNextRound);
      } else {
        revealWrap.innerHTML = "";
      }
    }

    return { update, destroy() { graph.destroy(); } };
  }

  global.CONFIA_UI_PLAY = { mount };
})(window);
