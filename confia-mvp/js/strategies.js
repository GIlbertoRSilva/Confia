/**
 * strategies.js — porta fiel de strategies.ts.
 */
(function (global) {
  const { NPCS, PLAYER_ID } = global.CONFIA_CHARACTERS;
  const { neighborsOf } = global.CONFIA_NETWORK;
  const cfg = global.CONFIA_CONFIG.runtimeConfig;

  function chance(p) {
    return Math.random() < p;
  }

  /** Decide a ação de um NPC ao receber `msg` de `senderId`. */
  function decideAction(npc, msg, senderId, senderAction, trust, history, networkTrust) {
    const CRISIS_THRESHOLD = cfg.crisisThreshold;
    const HEALTHY_THRESHOLD = cfg.healthyThreshold;

    if (chance(npc.noise)) {
      const opts = ["confiar", "verificar", "ignorar"];
      return opts[Math.floor(Math.random() * opts.length)];
    }

    switch (npc.strategy) {
      case "always_cooperate": {
        if (networkTrust < CRISIS_THRESHOLD && chance(0.3)) return "verificar";
        if (trust[npc.id] < 40 && chance(0.1)) return "verificar";
        return "confiar";
      }
      case "always_verify": {
        if (trust[npc.id] < 30 && chance(0.15)) return "ignorar";
        return "verificar";
      }
      case "always_defect": {
        let p = npc.shareProb ?? 0.8;
        if (networkTrust < CRISIS_THRESHOLD) p = Math.min(1, p + 0.2);
        if (networkTrust > HEALTHY_THRESHOLD) p = Math.max(0, p - 0.3);
        return chance(p) ? "confiar" : "ignorar";
      }
      case "always_ignore": {
        const baseChance = networkTrust > HEALTHY_THRESHOLD ? 0.2 : 0.1;
        if (trust[npc.id] > 60 && chance(baseChance)) return "confiar";
        return "ignorar";
      }
      case "copycat": {
        const errorChance = networkTrust < CRISIS_THRESHOLD ? 0.2 : 0.15;
        if (chance(errorChance)) {
          const opts = ["confiar", "verificar", "ignorar"];
          return opts[Math.floor(Math.random() * opts.length)];
        }
        return senderAction;
      }
      case "tit_for_tat": {
        if (chance(0.05)) return "confiar";
        const senderState = history[senderId];
        const last = senderState && senderState.lastAction;
        const lastKlass = senderState && senderState.lastMessageKlass;
        if (!last) return "confiar";
        if (last === "confiar") {
          if (lastKlass === "false") {
            if (networkTrust < CRISIS_THRESHOLD && chance(0.7)) return "verificar";
            return "verificar";
          }
          if (lastKlass === "true") return "confiar";
          return "verificar";
        }
        if (last === "verificar") return "verificar";
        return "ignorar";
      }
      default:
        return "ignorar";
    }
  }

  function getMaxDepth(msg) {
    if (msg.klass === "false") return cfg.spreadDepth_false;
    if (msg.klass === "true") return cfg.spreadDepth_true;
    return cfg.spreadDepth_half;
  }
  function shouldShare(msg) {
    if (msg.klass === "false") return Math.random() < cfg.shareChance_false;
    if (msg.klass === "true") return Math.random() < cfg.shareChance_true;
    return Math.random() < cfg.shareChance_half;
  }

  function applyTrustFromAction(id, action, msg, delta) {
    if (action === "ignorar") return;
    const isTruth = msg.klass === "true";
    const isFake = msg.klass === "false";
    const v = isTruth ? 10 : isFake ? -10 : 0;
    delta[id] = (delta[id] || 0) + v;
  }

  function feedLine(name, action, msg) {
    const cls = msg.klass === "true" ? "verdade" : msg.klass === "false" ? "fake" : "meia-verdade";
    if (action === "confiar") return `${name} confiou e compartilhou (${cls}).`;
    if (action === "verificar") return `${name} verificou antes de repassar.`;
    return `${name} ignorou.`;
  }

  /** Simula a propagação de `msg` a partir de `emitterId` (BFS). */
  function propagate(msg, emitterId, playerAction, trust, history, networkTrust) {
    const maxDepth = getMaxDepth(msg);

    const actions = {};
    const trustDelta = Object.fromEntries(NPCS.map((n) => [n.id, 0]));
    trustDelta[PLAYER_ID] = 0;
    const feed = [];
    const senderOf = {};
    let shares = 0;

    const seen = new Set([emitterId]);
    const root = { id: emitterId, action: "confiar", children: [], depth: 0 };
    actions[emitterId] = "confiar";
    history[emitterId] = history[emitterId] || { lastActionByMe: {} };
    history[emitterId].lastAction = "confiar";
    history[emitterId].lastMessageKlass = msg.klass;
    shares++;

    seen.add(PLAYER_ID);
    actions[PLAYER_ID] = playerAction;
    senderOf[PLAYER_ID] = emitterId;
    history[PLAYER_ID] = history[PLAYER_ID] || { lastActionByMe: {} };
    history[PLAYER_ID].lastAction = playerAction;
    history[PLAYER_ID].lastMessageKlass = msg.klass;
    applyTrustFromAction(PLAYER_ID, playerAction, msg, trustDelta);
    if (playerAction === "confiar") shares++;
    const playerNode = { id: PLAYER_ID, action: playerAction, children: [], depth: 1 };
    root.children.push(playerNode);
    feed.push(feedLine("Você", playerAction, msg));

    const queue = [{ node: root }, { node: playerNode }];

    while (queue.length) {
      const { node } = queue.shift();
      if (node.depth >= maxDepth) continue;
      if (node.action !== "confiar") continue;
      if (node.id !== emitterId && node.id !== PLAYER_ID && !shouldShare(msg)) continue;

      const nbrs = neighborsOf(node.id).filter((id) => !seen.has(id));
      for (const nid of nbrs) {
        seen.add(nid);
        let act;
        if (nid === PLAYER_ID) {
          act = playerAction;
        } else {
          const npc = NPCS.find((n) => n.id === nid);
          if (!npc) continue;
          act = decideAction(npc, msg, node.id, node.action, trust, history, networkTrust);
          history[node.id] = history[node.id] || { lastActionByMe: {} };
          history[node.id].lastActionByMe[nid] = act;
        }
        actions[nid] = act;
        senderOf[nid] = node.id;
        history[nid] = history[nid] || { lastActionByMe: {} };
        history[nid].lastAction = act;
        history[nid].lastMessageKlass = msg.klass;
        applyTrustFromAction(nid, act, msg, trustDelta);
        if (act === "confiar") shares++;

        const nameForFeed = nid === PLAYER_ID ? "Você" : NPCS.find((n) => n.id === nid).name;
        feed.push(feedLine(nameForFeed, act, msg));

        const child = { id: nid, action: act, children: [], depth: node.depth + 1 };
        node.children.push(child);
        queue.push({ node: child });
      }
    }

    return { tree: root, actions, trustDelta, shares, activityFeed: feed, senderOf };
  }

  global.CONFIA_STRATEGIES = { decideAction, propagate };
})(window);
