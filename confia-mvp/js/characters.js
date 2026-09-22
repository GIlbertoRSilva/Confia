/**
 * characters.js — porta fiel de characters.ts.
 */
(function (global) {
  const PLAYER_ID = "player";

  const NPCS = [
    { id: "lia", name: "Lia", color: "#FF6B9D", strategy: "always_cooperate", noise: 0.10, symbol: "✦", bio: "Confia primeiro, pergunta depois." },
    { id: "celia", name: "Célia", color: "#4ECDC4", strategy: "always_verify", noise: 0.15, symbol: "🛡", bio: "Sempre confere a fonte." },
    { id: "eco", name: "Eco", color: "#6B2D5C", strategy: "copycat", noise: 0.15, symbol: "◐", bio: "Copia quem falou com ela." },
    { id: "thiago", name: "Thiago", color: "#C1121F", strategy: "always_defect", shareProb: 0.8, noise: 0.00, symbol: "⛓", bio: "Compartilha quase tudo." },
    { id: "fantasma", name: "Fantasma", color: "#B0B0B0", strategy: "always_ignore", noise: 0.10, symbol: "◌", bio: "Prefere ficar de fora." },
    { id: "bot", name: "Bot", color: "#39FF14", strategy: "always_defect", shareProb: 1.0, noise: 0.00, symbol: "▣", bio: "Bot automatizado. Sempre repassa." },
    { id: "kevin", name: "Kevin", color: "#FFD700", strategy: "tit_for_tat", noise: 0.05, symbol: "✧", bio: "Retribui na mesma moeda (com perdão raro)." },
  ];

  const ALL_NODES = NPCS.map((n) => n.id).concat([PLAYER_ID]);

  function getCharacter(id) {
    if (id === PLAYER_ID) return { id: PLAYER_ID, name: "Você", color: "#4169E1", symbol: "?" };
    return NPCS.find((n) => n.id === id) || null;
  }

  global.CONFIA_CHARACTERS = { PLAYER_ID, NPCS, ALL_NODES, getCharacter };
})(window);
