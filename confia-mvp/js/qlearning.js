/**
 * qlearning.js — porta fiel de qlearning.ts.
 * Modelo de recompensa simplificado (não é uma Q-table tabular real no
 * projeto original): os pesos controlam o que o "algoritmo" valoriza.
 */
(function (global) {
  const DEFAULT_WEIGHTS = { w1: 0.5, w2: 0.1, w3: -0.5 };

  function polarizationOf(trustValues) {
    if (trustValues.length === 0) return 0;
    const mean = trustValues.reduce((a, b) => a + b, 0) / trustValues.length;
    const variance = trustValues.reduce((s, v) => s + (v - mean) ** 2, 0) / trustValues.length;
    return Math.min(1, Math.sqrt(variance) / 50);
  }

  function reward(deltaEngagement, survived, polarization, w = DEFAULT_WEIGHTS) {
    return w.w1 * deltaEngagement + w.w2 * (survived ? 1 : 0) + w.w3 * polarization;
  }

  global.CONFIA_QLEARNING = { DEFAULT_WEIGHTS, polarizationOf, reward };
})(window);
