/**
 * game.js — porta fiel de game.ts.
 */
(function (global) {
  const { NPCS, PLAYER_ID } = global.CONFIA_CHARACTERS;
  const { NETWORK_EDGES, neighborsOf, availableEmittersForRound } = global.CONFIA_NETWORK;
  const { propagate } = global.CONFIA_STRATEGIES;
  const { polarizationOf } = global.CONFIA_QLEARNING;
  const { MESSAGES, shuffle } = global.CONFIA_MESSAGES;
  const cfg = global.CONFIA_CONFIG.runtimeConfig;

  const ALL_IDS = NPCS.map((n) => n.id).concat([PLAYER_ID]);

  const ENDING_INFO = {
    colapso: {
      title: "Colapso",
      message: "A confiança da rede caiu abaixo de 30% ou a reputação média despencou. Quando ninguém acredita em ninguém, nenhuma mensagem tem valor.",
      why: "Fakes viralizaram sem verificação e derrubaram a reputação de quem espalhou. Vizinhos que copiam ou retribuem reproduzem essa queda, e o efeito vira dominó.",
      lesson: "Sem verificação suficiente, o pior equilíbrio se instala: todo mundo desconfia de todo mundo e ninguém tem incentivo para cooperar.",
    },
    isolamento: {
      title: "Isolamento",
      message: "Você ignorou muito e a rede quase não engajou. Nada colapsou, mas nada circulou também.",
      why: "Ignorar não empurra confiança para cima nem para baixo, mas zera engajamento e sinaliza omissão para seus vizinhos. Quem retribui na mesma moeda passa a te ignorar de volta, e sua reputação encolhe.",
      lesson: "Sair da jogada também é uma jogada. Ficar em silêncio não protege a rede, só esvazia ela.",
    },
    saudavel: {
      title: "Rede saudável",
      message: "Confiança final acima de 70%, reputação média alta e quase nenhuma fake compartilhada. A cooperação venceu.",
      why: "Você verificou o que era duvidoso e confiou no que era honesto. Verificar verdade recompensa quem foi honesto (+8 de reputação) e sua própria reputação subiu junto — a rede reconheceu o padrão.",
      lesson: "Quando várias pessoas cooperam de boa fé ao mesmo tempo, todo mundo ganha. Verdade e mentira têm efeitos simétricos: um puxa pra cima, outro puxa pra baixo.",
    },
    adaptacao: {
      title: "Adaptação",
      message: "Você usou as três ações de forma equilibrada. A rede sobreviveu porque você respondeu ao contexto.",
      why: "Nem sempre confiar, nem sempre verificar, nem sempre ignorar. Você olhou para a reputação de quem estava mandando e ajustou. Sua própria reputação refletiu isso.",
      lesson: "Em jogos que se repetem, misturar estratégias funciona melhor do que teimar em uma só.",
    },
    fragil: {
      title: "Equilíbrio frágil",
      message: "A rede terminou entre 40% e 70% de confiança, com algumas fakes espalhadas. Sobreviveu, mas por pouco.",
      why: "Faltou verificação nas horas certas, ou sobrou confiança em quem não devia. A reputação média ficou na zona cinza e o boca a boca não foi forte o bastante para separar honestos de repassadores.",
      lesson: "Não colapsar não é o mesmo que estar bem. A rede está perto do limite.",
    },
  };

  const INITIAL_TRUST = () => cfg.initialTrust;

  function moderateByReputation(delta, targetRep) {
    if (delta >= 0) return delta;
    if (targetRep <= 50) return delta;
    const attenuation = Math.min(0.3, ((targetRep - 50) / 50) * 0.3);
    return delta * (1 - attenuation);
  }

  function trustEffects() {
    const c = cfg;
    return {
      confiar: {
        true: { rep: 0, eng: 5, trustAE: c.trustAE_confiar_true, trustEA: c.trustEA_confiar_true },
        false: { rep: -4, eng: 15, trustAE: c.trustAE_confiar_false, trustEA: c.trustEA_confiar_false },
        half: { rep: -3, eng: 8, trustAE: -3, trustEA: -2 },
      },
      verificar: {
        true: { rep: 10, eng: 2, trustAE: c.trustAE_verificar_true, trustEA: c.trustEA_verificar_true },
        false: { rep: -5, eng: 2, trustAE: c.trustAE_verificar_false, trustEA: c.trustEA_verificar_false },
        half: { rep: -2, eng: 2, trustAE: 0, trustEA: -2 },
      },
      ignorar: {
        true: { rep: 0, eng: -3, trustAE: 0, trustEA: 0 },
        false: { rep: 0, eng: -3, trustAE: 0, trustEA: 0 },
        half: { rep: 0, eng: -3, trustAE: 0, trustEA: 0 },
      },
    };
  }

  function makeEmptyMatrix() {
    const m = {};
    for (const a of ALL_IDS) { m[a] = {}; for (const b of ALL_IDS) m[a][b] = 0; }
    const init = INITIAL_TRUST();
    for (const [a, b] of NETWORK_EDGES) { m[a][b] = init; m[b][a] = init; }
    return m;
  }

  function recomputeIndividualTrust(matrix) {
    const PLAYER_WEIGHT = cfg.playerWeight;
    const MIN_TRUST = cfg.minTrust;
    const out = {};
    for (const id of ALL_IDS) {
      const nbrs = neighborsOf(id);
      if (nbrs.length === 0) { out[id] = 50; continue; }
      let sum = 0, weightSum = 0;
      for (const nb of nbrs) {
        const base = nb === PLAYER_ID ? PLAYER_WEIGHT : 1;
        const ab = matrix[id]?.[nb] ?? 50;
        const ba = matrix[nb]?.[id] ?? 50;
        const mutual = (ab + ba) / 2;
        const w = base * (mutual / 100);
        if (w <= 0) continue;
        sum += (matrix[nb]?.[id] ?? 50) * w;
        weightSum += w;
      }
      out[id] = Math.max(MIN_TRUST, weightSum > 0 ? sum / weightSum : 50);
    }
    return out;
  }

  function applyTrustDecay(matrix, networkTrust, lastEdgeUpdate, currentRound) {
    const rate = networkTrust >= cfg.decayHealthThreshold ? cfg.decayRateHealthy : cfg.decayRateCrisis;
    let sum = 0, count = 0;
    for (const [a, b] of NETWORK_EDGES) {
      const ab = matrix[a]?.[b] ?? 0;
      const ba = matrix[b]?.[a] ?? 0;
      sum += ab + ba; count += 2;
    }
    const mean = count > 0 ? sum / count : 50;
    const idleSince = currentRound - 2;
    const isIdle = (a, b) => (lastEdgeUpdate[`${a}->${b}`] ?? 0) <= idleSince;
    for (const [a, b] of NETWORK_EDGES) {
      if (matrix[a]?.[b] !== undefined && isIdle(a, b)) matrix[a][b] = matrix[a][b] + (mean - matrix[a][b]) * rate;
      if (matrix[b]?.[a] !== undefined && isIdle(b, a)) matrix[b][a] = matrix[b][a] + (mean - matrix[b][a]) * rate;
    }
  }

  function applyNetworkPreset(m, preset) {
    const setBoth = (a, b, v) => { if (m[a]?.[b] !== undefined) m[a][b] = v; if (m[b]?.[a] !== undefined) m[b][a] = v; };
    if (preset === "echo") {
      setBoth("thiago", "bot", 90);
      setBoth("thiago", "kevin", 85);
      setBoth("bot", "kevin", 90);
      setBoth("eco", "thiago", 30);
      setBoth("eco", "kevin", 30);
    } else if (preset === "polarized") {
      setBoth("lia", "celia", 85);
      setBoth("thiago", "bot", 85);
      setBoth("thiago", "kevin", 85);
      setBoth("bot", "kevin", 85);
      setBoth("eco", "thiago", 25);
      setBoth("eco", "kevin", 25);
      setBoth("lia", "eco", 30);
      setBoth("fantasma", "lia", 25);
    }
  }

  function createInitialState(opts = {}) {
    const trustMatrix = makeEmptyMatrix();
    if (opts.networkPreset && opts.networkPreset !== "neutral") applyNetworkPreset(trustMatrix, opts.networkPreset);
    const trust = recomputeIndividualTrust(trustMatrix);
    const reputation = Object.fromEntries(ALL_IDS.map((id) => [id, 50]));
    const engagementByNpc = Object.fromEntries(ALL_IDS.map((id) => [id, 0]));
    return {
      round: 1,
      trust, reputation, engagementByNpc, trustMatrix,
      lastEdgeUpdate: {},
      deck: shuffle(MESSAGES),
      history: {},
      records: [],
      totalShares: 0,
      engagement: 0,
      fakeShared: 0,
      actionsCount: { confiar: 0, verificar: 0, ignorar: 0 },
      ended: false,
      isTutorial: !!opts.tutorial,
      tutorialStep: opts.tutorial ? 0 : -1,
    };
  }

  function tutorialDeck() {
    const truth = MESSAGES.find((m) => m.id === 1);
    const fake = MESSAGES.find((m) => m.id === 17);
    const half = MESSAGES.find((m) => m.id === 30);
    const rest = shuffle(MESSAGES.filter((m) => ![1, 17, 30].includes(m.id)));
    return [truth, fake, half, ...rest];
  }

  function pickEmitter(state) {
    if (state.isTutorial) {
      const forced = ["lia", "thiago"];
      if (state.round <= forced.length) return forced[state.round - 1];
    }
    const pool = availableEmittersForRound(state.round);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function beginRound(state) {
    if (state.ended) return state;
    let deck = state.deck;
    if (state.round === 1 && state.isTutorial) deck = tutorialDeck();
    const message = deck[0];
    const emitter = pickEmitter(Object.assign({}, state, { deck }));
    return Object.assign({}, state, { deck, currentMessage: message, currentEmitter: emitter });
  }

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  function requireConcept(round) {
    const map = {
      1: "Dilema do Prisioneiro", 2: "Dilema do Prisioneiro",
      3: "Jogos de Coordenação", 4: "Jogos de Coordenação",
      5: "Jogos de Sinalização", 6: "Jogos de Sinalização",
      7: "Bens Públicos", 8: "Bens Públicos",
    };
    return map[round] || "";
  }

  function playAction(state, action) {
    if (!state.currentMessage || !state.currentEmitter) throw new Error("beginRound must be called first");
    const msg = state.currentMessage;
    const emitterId = state.currentEmitter;
    const isTruth = msg.klass === "true";
    const isFake = msg.klass === "false";

    const preNpcTrust = Object.entries(state.trust).filter(([id]) => id !== PLAYER_ID).map(([, v]) => v);
    const preNetworkTrust = preNpcTrust.length ? preNpcTrust.reduce((a, b) => a + b, 0) / preNpcTrust.length : 50;
    const prop = propagate(msg, emitterId, action, state.trust, state.history, preNetworkTrust);

    const trustMatrix = {};
    for (const id of ALL_IDS) trustMatrix[id] = Object.assign({}, state.trustMatrix[id]);
    const reputation = Object.assign({}, state.reputation);
    const engagementByNpc = Object.assign({}, state.engagementByNpc);
    const lastEdgeUpdate = Object.assign({}, state.lastEdgeUpdate);
    const touchEdge = (a, b) => { lastEdgeUpdate[`${a}->${b}`] = state.round; };

    const bumpM = (a, b, d) => {
      if (!trustMatrix[a]) trustMatrix[a] = {};
      const moderated = moderateByReputation(d, reputation[b] ?? 50);
      trustMatrix[a][b] = clamp((trustMatrix[a][b] ?? 0) + moderated);
      touchEdge(a, b);
    };
    const bumpRep = (id, d) => {
      const moderated = moderateByReputation(d, reputation[id] ?? 50);
      reputation[id] = clamp((reputation[id] ?? 50) + moderated);
    };

    const TRUST_EFFECTS = trustEffects();
    const eff = TRUST_EFFECTS[action][msg.klass];

    const neighborDelta = isTruth ? 1 : isFake ? -1 : 0;
    const playerRepFromConfiar = isTruth ? 2 : isFake ? -5 : -2;
    const playerRepFromVerify = isTruth ? 3 : isFake ? -2 : -1;

    const playerNeighbors = neighborsOf(PLAYER_ID).slice(0, 3);

    if (action === "confiar") {
      engagementByNpc[emitterId] = (engagementByNpc[emitterId] ?? 0) + eff.eng;
      bumpRep(emitterId, eff.rep);
      bumpM(PLAYER_ID, emitterId, eff.trustAE);
      bumpM(emitterId, PLAYER_ID, eff.trustEA);
      const emitterNbrsC = neighborsOf(emitterId);
      for (const nb of playerNeighbors) {
        if (nb === emitterId) continue;
        if (!emitterNbrsC.includes(nb)) continue;
        bumpM(nb, PLAYER_ID, playerRepFromConfiar);
      }
    } else if (action === "verificar") {
      engagementByNpc[emitterId] = (engagementByNpc[emitterId] ?? 0) + eff.eng;
      bumpRep(emitterId, eff.rep);
      bumpM(PLAYER_ID, emitterId, eff.trustAE);
      bumpM(emitterId, PLAYER_ID, eff.trustEA);
      const emitterNbrsV = neighborsOf(emitterId);
      for (const nb of playerNeighbors) {
        if (nb === emitterId) continue;
        if (!emitterNbrsV.includes(nb)) { bumpM(nb, PLAYER_ID, playerRepFromVerify); continue; }
        bumpM(nb, emitterId, neighborDelta);
        bumpM(nb, PLAYER_ID, playerRepFromVerify);
      }
    } else {
      engagementByNpc[emitterId] = Math.max(0, (engagementByNpc[emitterId] ?? 0) + eff.eng);
      if (!isTruth) {
        const emitterNbrsI = neighborsOf(emitterId);
        for (const nb of playerNeighbors) {
          if (nb === emitterId) continue;
          if (!emitterNbrsI.includes(nb)) continue;
          bumpM(nb, PLAYER_ID, -1);
        }
      }
    }

    const NPC_COMPENSATION = cfg.npcCompensation;
    for (const [nodeId, senderId] of Object.entries(prop.senderOf)) {
      if (nodeId === PLAYER_ID) continue;
      const act = prop.actions[nodeId];
      if (!act) continue;
      const e = TRUST_EFFECTS[act][msg.klass];
      if (act === "confiar" || act === "verificar") {
        engagementByNpc[senderId] = (engagementByNpc[senderId] ?? 0) + e.eng;
        bumpRep(senderId, e.rep * NPC_COMPENSATION);
        bumpM(nodeId, senderId, e.trustAE * NPC_COMPENSATION);
        bumpM(senderId, nodeId, e.trustEA * NPC_COMPENSATION);
      }
    }

    const publicDelta = (isTruth ? cfg.publicDelta_true : isFake ? cfg.publicDelta_false : cfg.publicDelta_half) * NPC_COMPENSATION;
    for (const nb of neighborsOf(emitterId)) {
      if (nb === PLAYER_ID) continue;
      if (nb === emitterId) continue;
      bumpM(nb, emitterId, publicDelta);
    }

    applyTrustDecay(trustMatrix, preNetworkTrust, lastEdgeUpdate, state.round);

    const trust = recomputeIndividualTrust(trustMatrix);

    const npcVerifiers = Object.entries(prop.actions).filter(
      ([id, act]) => id !== PLAYER_ID && id !== emitterId && act === "verificar"
    ).length;
    if (npcVerifiers >= cfg.collectiveMinVerifiers) {
      for (const id of ALL_IDS) {
        if (id === PLAYER_ID) continue;
        trust[id] = Math.min(100, trust[id] + cfg.collectiveBonus);
      }
    }

    const trustValues = Object.entries(trust).filter(([id]) => id !== PLAYER_ID).map(([, v]) => v);
    const npcsForTrust = NPCS.filter((n) => n.id !== PLAYER_ID);
    const totalDegree = npcsForTrust.reduce((s, n) => s + neighborsOf(n.id).length, 0);
    let weightedSum = 0;
    if (totalDegree > 0) {
      for (const npc of npcsForTrust) {
        const degree = neighborsOf(npc.id).length;
        weightedSum += (trust[npc.id] ?? 50) * (degree / totalDegree);
      }
    }
    const networkTrust = totalDegree > 0 ? weightedSum : 50;
    const polar = polarizationOf(trustValues);

    const engagementDelta = action === "confiar" ? cfg.engagementDelta_confiar
      : action === "verificar" ? cfg.engagementDelta_verificar
      : cfg.engagementDelta_ignorar;
    const engagement = state.engagement + engagementDelta;
    const fakeShared = state.fakeShared + (action === "confiar" && msg.klass === "false" ? 1 : 0);

    const actionsCount = Object.assign({}, state.actionsCount);
    actionsCount[action] += 1;

    const record = {
      round: state.round, emitterId, message: msg, playerAction: action,
      propagation: prop, trustAfter: trust, engagement, polarization: polar,
      networkTrust, concept: state.isTutorial ? "Tutorial" : requireConcept(state.round),
    };

    const nextDeck = state.deck.slice(1);
    const nextRound = state.round + 1;

    let ended = false, ending;
    const npcReps = NPCS.map((n) => reputation[n.id] ?? 50);
    const avgReputation = npcReps.reduce((a, b) => a + b, 0) / npcReps.length;
    const totalEngagement = NPCS.reduce((s, n) => s + (engagementByNpc[n.id] ?? 0), 0);
    if (networkTrust < cfg.colapsoThreshold || avgReputation < cfg.colapsoRepThreshold) {
      ended = true; ending = "colapso";
    } else if (nextRound > cfg.numRodadas) {
      ended = true;
      ending = decideEnding({ networkTrust, avgReputation, totalEngagement, fakeShared, actionsCount, totalActions: state.records.length + 1 });
    }

    const nextState = Object.assign({}, state, {
      trust, reputation, engagementByNpc, trustMatrix, lastEdgeUpdate,
      deck: nextDeck, records: state.records.concat([record]),
      totalShares: state.totalShares + prop.shares,
      engagement, fakeShared, actionsCount,
      round: ended ? state.round : nextRound,
      currentMessage: undefined, currentEmitter: undefined,
      ended, ending,
    });

    return { state: nextState, record };
  }

  function decideEnding(args) {
    const { networkTrust, avgReputation, fakeShared, actionsCount, totalActions } = args;
    const ignoreRatio = actionsCount.ignorar / Math.max(1, totalActions);
    const allUsed = actionsCount.confiar >= 2 && actionsCount.verificar >= 2 && actionsCount.ignorar >= 1;
    const c = cfg;
    if (ignoreRatio > c.isolamento_ignoreRatio) return "isolamento";
    if (fakeShared === 0 && networkTrust >= c.saudavel_trustMin && avgReputation >= c.saudavel_repMin) return "saudavel";
    if (allUsed && networkTrust >= c.adaptacao_trustMin) return "adaptacao";
    if (networkTrust >= c.fragil_trustMin) return "fragil";
    return "colapso";
  }

  function expectedPlayerDeltas(action, klass) {
    const isTruth = klass === "true";
    const isFake = klass === "false";
    const eff = trustEffects()[action][klass];
    if (action === "confiar") {
      return {
        emitterReputation: eff.rep, trustPlayerToEmitter: eff.trustAE, trustEmitterToPlayer: eff.trustEA,
        engagementEmitter: eff.eng, neighborTrustInEmitter: 0, neighborTrustInPlayer: isTruth ? 2 : isFake ? -5 : -2,
      };
    }
    if (action === "verificar") {
      return {
        emitterReputation: eff.rep, trustPlayerToEmitter: eff.trustAE, trustEmitterToPlayer: eff.trustEA,
        engagementEmitter: eff.eng, neighborTrustInEmitter: isTruth ? 1 : isFake ? -1 : 0,
        neighborTrustInPlayer: isTruth ? 3 : isFake ? -2 : -1,
      };
    }
    return {
      emitterReputation: eff.rep, trustPlayerToEmitter: eff.trustAE, trustEmitterToPlayer: eff.trustEA,
      engagementEmitter: eff.eng, neighborTrustInEmitter: 0, neighborTrustInPlayer: isTruth ? 0 : -1,
    };
  }

  const ACHIEVEMENTS = {
    primeiro_passo: { name: "Primeiro Passo", desc: "Completar a primeira partida." },
    detetive: { name: "Detetive", desc: "Verificar 10 mensagens (acumulado)." },
    inocente: { name: "Inocente", desc: "Compartilhar 0 fakes em uma partida." },
    sobrevivente: { name: "Sobrevivente", desc: "Manter Trust > 50% por todas as rodadas." },
    adaptativo: { name: "Adaptativo", desc: "Usar as 3 ações ≥ 2 vezes em uma partida." },
  };

  function evaluateAchievements(state, cumulativeVerify) {
    const unlocked = [];
    const N = cfg.numRodadas;
    if (state.ended) unlocked.push("primeiro_passo");
    if (cumulativeVerify >= 10) unlocked.push("detetive");
    if (state.fakeShared === 0 && state.records.length === N) unlocked.push("inocente");
    if (state.records.length === N && state.records.every((r) => r.networkTrust > 50)) unlocked.push("sobrevivente");
    if (state.actionsCount.confiar >= 2 && state.actionsCount.verificar >= 2 && state.actionsCount.ignorar >= 2) unlocked.push("adaptativo");
    return unlocked;
  }

  global.CONFIA_GAME = {
    ENDING_INFO, ACHIEVEMENTS,
    createInitialState, beginRound, playAction, expectedPlayerDeltas, evaluateAchievements,
    tutorialDeck, pickEmitter,
  };
})(window);
