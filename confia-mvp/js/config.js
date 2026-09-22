/**
 * config.js — porta fiel de config.ts.
 * runtimeConfig é um singleton mutável lido por game.js, strategies.js e
 * phenomena.js. O ConfigPanel (tela Simular) e o simulador o modificam via
 * setRuntimeConfig(...) para re-executar simulações sem recarregar a página.
 */
(function (global) {
  const DEFAULT_CONFIG = {
    initialTrust: 50,
    minTrust: 20,
    colapsoThreshold: 35,
    colapsoRepThreshold: 20,

    playerWeight: 2.5,
    npcCompensation: 0.45,

    decayRateHealthy: 0.15,
    decayRateCrisis: 0.002,
    decayRateNeutral: 0.03,
    decayHealthThreshold: 50,

    trustAE_confiar_true: 12,
    trustEA_confiar_true: 8,
    trustAE_confiar_false: -55,
    trustEA_confiar_false: -40,
    trustAE_verificar_true: 90,
    trustEA_verificar_true: 60,
    trustAE_verificar_false: 0,
    trustEA_verificar_false: -6,

    shareChance_false: 0.98,
    shareChance_true: 0.70,
    shareChance_half: 0.65,
    spreadDepth_false: 5,
    spreadDepth_true: 4,
    spreadDepth_half: 3,

    crisisThreshold: 50,
    healthyThreshold: 60,

    collectiveBonus: 5,
    collectiveMinVerifiers: 2,

    engagementDelta_confiar: 5,
    engagementDelta_verificar: -3,
    engagementDelta_ignorar: 0,
    neighborDelta_false: -1,
    neighborDelta_true: 1,
    neighborDelta_half: 0,
    publicDelta_false: -10,
    publicDelta_true: 12,
    publicDelta_half: -2,

    saudavel_trustMin: 55,
    saudavel_repMin: 45,
    adaptacao_trustMin: 50,
    fragil_trustMin: 40,
    isolamento_ignoreRatio: 0.4,

    numRodadas: 10,

    chamberThreshold: 50,
    chamberAvgInMin: 50,
    chamberAvgOutMax: 55,
    polarizationCrossMax: 55,
    silentFailureMin: 75,
  };

  const runtimeConfig = Object.assign({}, DEFAULT_CONFIG);

  function setRuntimeConfig(partial) {
    Object.assign(runtimeConfig, partial);
  }
  function resetRuntimeConfig() {
    Object.assign(runtimeConfig, DEFAULT_CONFIG);
  }
  function snapshotRuntimeConfig() {
    return Object.assign({}, runtimeConfig);
  }

  global.CONFIA_CONFIG = {
    DEFAULT_CONFIG, runtimeConfig,
    setRuntimeConfig, resetRuntimeConfig, snapshotRuntimeConfig,
  };
})(window);
