/**
 * network.js — porta fiel de network.ts.
 */
(function (global) {
  const PLAYER_ID = global.CONFIA_CHARACTERS.PLAYER_ID;

  const NETWORK_EDGES = [
    ["lia", "celia"],
    ["lia", "eco"],
    ["lia", PLAYER_ID],
    ["celia", PLAYER_ID],
    ["eco", "thiago"],
    ["eco", "kevin"],
    ["thiago", "bot"],
    ["thiago", "kevin"],
    ["fantasma", "lia"],
    ["fantasma", PLAYER_ID],
    ["bot", "kevin"],
    ["kevin", PLAYER_ID],
  ];

  function neighborsOf(id) {
    const out = new Set();
    for (const [a, b] of NETWORK_EDGES) {
      if (a === id) out.add(b);
      if (b === id) out.add(a);
    }
    return [...out];
  }

  const PROGRESSION = {
    1: ["lia", "thiago"],
    2: ["lia", "thiago"],
    3: ["lia", "thiago", "celia", "bot"],
    4: ["lia", "thiago", "celia", "bot"],
    5: ["lia", "thiago", "celia", "bot", "eco", "kevin"],
    6: ["lia", "thiago", "celia", "bot", "eco", "kevin"],
    7: ["lia", "thiago", "celia", "bot", "eco", "kevin", "fantasma"],
    8: ["lia", "thiago", "celia", "bot", "eco", "kevin", "fantasma"],
  };

  const CONCEPT_BY_ROUND = {
    1: "Dilema do Prisioneiro",
    2: "Dilema do Prisioneiro",
    3: "Jogos de Coordenação",
    4: "Jogos de Coordenação",
    5: "Jogos de Sinalização",
    6: "Jogos de Sinalização",
    7: "Jogos de Bens Públicos",
    8: "Jogos de Bens Públicos",
  };

  function availableEmittersForRound(round) {
    const r = Math.min(8, Math.max(1, round));
    return PROGRESSION[r] || [];
  }

  global.CONFIA_NETWORK = { NETWORK_EDGES, neighborsOf, PROGRESSION, CONCEPT_BY_ROUND, availableEmittersForRound };
})(window);
