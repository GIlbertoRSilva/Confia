/**
 * phenomena.js — porta fiel de phenomena.ts.
 */
(function (global) {
  const { NPCS, PLAYER_ID } = global.CONFIA_CHARACTERS;
  const { NETWORK_EDGES } = global.CONFIA_NETWORK;
  const cfg = global.CONFIA_CONFIG.runtimeConfig;

  const ALL_IDS = NPCS.map((n) => n.id).concat([PLAYER_ID]);

  function mutualOf(aId, bId, trust, matrix) {
    if (matrix && matrix[aId] && matrix[bId]) {
      return ((matrix[aId][bId] ?? 50) + (matrix[bId][aId] ?? 50)) / 2;
    }
    return ((trust[aId] ?? 50) + (trust[bId] ?? 50)) / 2;
  }

  function highTrustComponents(trust, matrix, threshold) {
    const adj = new Map(ALL_IDS.map((id) => [id, new Set()]));
    for (const [a, b] of NETWORK_EDGES) {
      if (mutualOf(a, b, trust, matrix) >= threshold) {
        adj.get(a).add(b);
        adj.get(b).add(a);
      }
    }
    const seen = new Set();
    const comps = [];
    for (const id of ALL_IDS) {
      if (seen.has(id) || adj.get(id).size === 0) continue;
      const stack = [id];
      const comp = [];
      while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        comp.push(cur);
        for (const nb of adj.get(cur)) if (!seen.has(nb)) stack.push(nb);
      }
      comps.push(comp);
    }
    return comps;
  }

  function detectPhenomena(trust, matrix) {
    const MAX_SIZE = ALL_IDS.length - 2;
    const chambers = highTrustComponents(trust, matrix, cfg.chamberThreshold)
      .filter((c) => c.length >= 3 && c.length <= MAX_SIZE)
      .map((c) => {
        const set = new Set(c);
        let sIn = 0, nIn = 0, sOut = 0, nOut = 0;
        for (const [a, b] of NETWORK_EDGES) {
          const inA = set.has(a), inB = set.has(b);
          const m = mutualOf(a, b, trust, matrix);
          if (inA && inB) { sIn += m; nIn++; }
          else if (inA !== inB) { sOut += m; nOut++; }
        }
        return { ids: c, avgIn: nIn ? sIn / nIn : 0, avgOut: nOut ? sOut / nOut : 100 };
      })
      .filter((c) => c.avgIn > cfg.chamberAvgInMin && c.avgOut < cfg.chamberAvgOutMax)
      .sort((a, b) => b.avgIn - a.avgIn)
      .slice(0, 2);

    let polarization;
    if (chambers.length >= 2) {
      const [A, B] = chambers;
      let sum = 0, count = 0;
      for (const ai of A.ids) {
        for (const bi of B.ids) {
          const hasEdge = NETWORK_EDGES.some(([x, y]) => (x === ai && y === bi) || (x === bi && y === ai));
          if (hasEdge) { sum += mutualOf(ai, bi, trust, matrix); count++; }
        }
      }
      const cross = count > 0 ? sum / count : 0;
      if (count === 0 || cross < cfg.polarizationCrossMax) {
        polarization = { a: A.ids, b: B.ids, cross };
      }
    }

    let silentFailure;
    if (chambers.length === 0) {
      for (const [a, b] of NETWORK_EDGES) {
        if (mutualOf(a, b, trust, matrix) > cfg.silentFailureMin) { silentFailure = [a, b]; break; }
      }
    }

    return { chambers, polarization, silentFailure };
  }

  global.CONFIA_PHENOMENA = { mutualOf, detectPhenomena };
})(window);
