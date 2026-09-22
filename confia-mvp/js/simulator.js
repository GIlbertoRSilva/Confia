/**
 * simulator.js — porta fiel de simulator.ts.
 */
(function (global) {
  const { beginRound, createInitialState, playAction } = global.CONFIA_GAME;
  const { NPCS } = global.CONFIA_CHARACTERS;
  const { setRuntimeConfig, snapshotRuntimeConfig } = global.CONFIA_CONFIG;

  const PLAYER_STRATEGIES = [
    { id: "always_trust", label: "Always Trust", desc: "Confia em tudo." },
    { id: "always_verify", label: "Always Verify", desc: "Sempre verifica antes." },
    { id: "always_ignore", label: "Always Ignore", desc: "Ignora tudo." },
    { id: "mixed", label: "Mixed", desc: "Ciclo fixo: confiar → verificar → ignorar." },
    { id: "random", label: "Random", desc: "Escolha aleatória uniforme." },
    { id: "tit_for_tat", label: "Tit for Tat", desc: "Coopera 1ª rodada; depois copia o emissor. 5% de perdão." },
  ];

  const CYCLE = ["confiar", "verificar", "ignorar"];

  function decidePlayerAction(strategy, state) {
    switch (strategy) {
      case "always_trust": return "confiar";
      case "always_verify": return "verificar";
      case "always_ignore": return "ignorar";
      case "mixed": return CYCLE[(state.round - 1) % 3];
      case "random": return CYCLE[Math.floor(Math.random() * 3)];
      case "tit_for_tat": {
        if (state.round === 1) return "confiar";
        if (Math.random() < 0.05) return "confiar";
        const emitter = state.currentEmitter;
        const h = emitter ? state.history[emitter] : undefined;
        const last = h && h.lastAction;
        const lastKlass = h && h.lastMessageKlass;
        if (!last) return "confiar";
        const npc = emitter ? NPCS.find((n) => n.id === emitter) : undefined;
        if (npc && npc.strategy === "always_defect" && last === "confiar") return "verificar";
        if (last === "confiar") {
          if (lastKlass === "false") return "verificar";
          if (lastKlass === "true") return "confiar";
          return "verificar";
        }
        if (last === "verificar") return "verificar";
        return "ignorar";
      }
      default: return "ignorar";
    }
  }

  function runSingleGame(strategy) {
    let s = beginRound(createInitialState());
    let guard = 0;
    while (!s.ended && guard++ < 32) {
      const action = decidePlayerAction(strategy, s);
      const { state: next } = playAction(s, action);
      s = next.ended ? next : beginRound(next);
    }
    const last = s.records[s.records.length - 1];
    return {
      ending: s.ending || "fragil",
      networkTrustFinal: last ? Math.round(last.networkTrust) : 50,
      fakeShared: s.fakeShared,
      rounds: s.records.length,
    };
  }

  const ALL_ENDINGS = ["saudavel", "adaptacao", "fragil", "isolamento", "colapso"];

  function runBatch(gamesPerStrategyOrConfig, gamesPerStrategyArg) {
    let gamesPerStrategy = 100;
    let cfgPartial;
    if (typeof gamesPerStrategyOrConfig === "number") {
      gamesPerStrategy = gamesPerStrategyOrConfig;
    } else if (gamesPerStrategyOrConfig) {
      cfgPartial = gamesPerStrategyOrConfig;
      if (typeof gamesPerStrategyArg === "number") gamesPerStrategy = gamesPerStrategyArg;
    }

    const prev = snapshotRuntimeConfig();
    if (cfgPartial) setRuntimeConfig(cfgPartial);

    const out = [];
    try {
      for (const strat of PLAYER_STRATEGIES) {
        const endings = { saudavel: 0, adaptacao: 0, fragil: 0, isolamento: 0, colapso: 0 };
        let sumTrust = 0, sumFakes = 0, sumRounds = 0;
        for (let i = 0; i < gamesPerStrategy; i++) {
          const r = runSingleGame(strat.id);
          endings[r.ending]++;
          sumTrust += r.networkTrustFinal;
          sumFakes += r.fakeShared;
          sumRounds += r.rounds;
        }
        const endingsPct = Object.fromEntries(ALL_ENDINGS.map((e) => [e, (endings[e] / gamesPerStrategy) * 100]));
        out.push({
          strategy: strat.id, label: strat.label, games: gamesPerStrategy,
          endings, endingsPct,
          avgTrust: sumTrust / gamesPerStrategy, avgFakes: sumFakes / gamesPerStrategy, avgRounds: sumRounds / gamesPerStrategy,
        });
      }
    } finally {
      if (cfgPartial) setRuntimeConfig(prev);
    }
    return out;
  }

  global.CONFIA_SIMULATOR = { PLAYER_STRATEGIES, ALL_ENDINGS, decidePlayerAction, runSingleGame, runBatch };
})(window);
