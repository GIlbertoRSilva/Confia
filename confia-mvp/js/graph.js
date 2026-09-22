/**
 * graph.js — grafo do CONFIA em Canvas, inspirado em ConfiaGraph.tsx:
 * simulação de força contínua (rAF), crossfade de expressões, arestas de
 * confiança, arestas de propagação coloridas por ação, destaque de
 * câmaras de eco/polarização, e estado "colapsado".
 */
(function (global) {
  const { NPCS, PLAYER_ID, getCharacter } = global.CONFIA_CHARACTERS;
  const { NETWORK_EDGES } = global.CONFIA_NETWORK;
  const { detectPhenomena } = global.CONFIA_PHENOMENA;
  const EXPR = global.CONFIA_EXPRESSIONS;

  const ALL_IDS = NPCS.map((n) => n.id).concat([PLAYER_ID]);

  function trustColor(v) {
    if (v > 65) return "#3ddc97";
    if (v >= 35) return "#e8c547";
    return "#ef4444";
  }

  function create(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const compact = !!opts.compact;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const nodes = {};
    const w0 = canvas.clientWidth || canvas.width;
    const h0 = canvas.clientHeight || canvas.height;
    ALL_IDS.forEach((id, i) => {
      const angle = (i / ALL_IDS.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(w0, h0) / 2 - (compact ? 28 : 56);
      nodes[id] = {
        id,
        x: w0 / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 4,
        y: h0 / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 4,
        vx: 0, vy: 0,
        sprite: { curr: "neutro", prev: null, startedAt: 0 },
      };
    });

    let props = {
      trust: Object.fromEntries(ALL_IDS.map((id) => [id, 50])),
      trustMatrix: undefined,
      reputation: undefined,
      engagementByNpc: undefined,
      highlightNode: undefined,
      activeCascade: [],
      propagationEdges: undefined,
      collapsed: false,
      playerAction: null,
      emitterId: null,
    };
    let onPhenomena = opts.onPhenomena || null;
    let running = true;
    let raf = null;
    let t = 0;

    function resize() {
      const cssW = canvas.clientWidth || canvas.width;
      const cssH = canvas.clientHeight || canvas.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function update(nextProps) {
      props = Object.assign({}, props, nextProps);
    }

    function step() {
      const cssW = canvas.clientWidth || canvas.width;
      const cssH = canvas.clientHeight || canvas.height;
      const cx = cssW / 2, cy = cssH / 2;

      const forces = {};
      for (const id of ALL_IDS) forces[id] = { x: 0, y: 0 };
      for (let i = 0; i < ALL_IDS.length; i++) {
        for (let j = i + 1; j < ALL_IDS.length; j++) {
          const a = ALL_IDS[i], b = ALL_IDS[j];
          const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const repel = 1600 / (dist * dist);
          forces[a].x += (dx / dist) * repel; forces[a].y += (dy / dist) * repel;
          forces[b].x -= (dx / dist) * repel; forces[b].y -= (dy / dist) * repel;
        }
      }
      for (const [a, b] of NETWORK_EDGES) {
        const dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const target = compact ? 70 : 120;
        const pull = (dist - target) * 0.02;
        forces[a].x += (dx / dist) * pull; forces[a].y += (dy / dist) * pull;
        forces[b].x -= (dx / dist) * pull; forces[b].y -= (dy / dist) * pull;
      }
      for (const id of ALL_IDS) {
        forces[id].x += (cx - nodes[id].x) * 0.002;
        forces[id].y += (cy - nodes[id].y) * 0.002;
      }
      for (const id of ALL_IDS) {
        const n = nodes[id];
        n.vx = (n.vx + forces[id].x) * 0.82;
        n.vy = (n.vy + forces[id].y) * 0.82;
        n.x += n.vx; n.y += n.vy;
        const margin = compact ? 18 : 34;
        n.x = Math.max(margin, Math.min(cssW - margin, n.x));
        n.y = Math.max(margin, Math.min(cssH - margin, n.y));
      }

      draw(cssW, cssH);
      t += 1;
      if (running) raf = requestAnimationFrame(step);
    }

    function draw(cssW, cssH) {
      ctx.clearRect(0, 0, cssW, cssH);

      const trust = props.trust || Object.fromEntries(ALL_IDS.map((id) => [id, 50]));
      const reputation = props.reputation || Object.fromEntries(ALL_IDS.map((id) => [id, 50]));
      const engagementByNpc = props.engagementByNpc || Object.fromEntries(ALL_IDS.map((id) => [id, 0]));

      const phenomena = detectPhenomena(trust, props.trustMatrix);
      if (onPhenomena) onPhenomena(phenomena);

      let shakeX = 0, shakeY = 0;
      if (props.collapsed) {
        shakeX = Math.sin(t * 0.6) * 1.4;
        shakeY = Math.cos(t * 0.5) * 1.4;
        const grad = ctx.createRadialGradient(cssW / 2, cssH / 2, cssH * 0.2, cssW / 2, cssH / 2, cssH * 0.75);
        grad.addColorStop(0, "rgba(239,68,68,0)");
        grad.addColorStop(1, "rgba(239,68,68,0.18)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      phenomena.chambers.forEach((chamber, idx) => {
        const pts = chamber.ids.map((id) => nodes[id]);
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const rad = Math.max(...pts.map((p) => Math.hypot(p.x - cx2, p.y - cy2))) + (compact ? 20 : 34);
        ctx.beginPath();
        ctx.arc(cx2, cy2, rad, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? "rgba(239,68,68,0.08)" : "rgba(232,197,71,0.08)";
        ctx.strokeStyle = idx === 0 ? "rgba(239,68,68,0.35)" : "rgba(232,197,71,0.35)";
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
      });

      for (const [a, b] of NETWORK_EDGES) {
        const m = global.CONFIA_PHENOMENA.mutualOf(a, b, trust, props.trustMatrix);
        const pa = nodes[a], pb = nodes[b];
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        const alpha = Math.max(0.08, Math.min(0.8, m / 100));
        ctx.strokeStyle = `rgba(114, 176, 255, ${alpha})`;
        ctx.lineWidth = compact ? 1 : 1 + (m / 100) * 2.2;
        ctx.stroke();
      }

      if (props.propagationEdges) {
        for (const e of props.propagationEdges) {
          const pa = nodes[e.from], pb = nodes[e.to];
          if (!pa || !pb) continue;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          if (e.action === "confiar") { ctx.strokeStyle = "#3ddc97"; ctx.setLineDash([]); }
          else if (e.action === "verificar") { ctx.strokeStyle = "#72b0ff"; ctx.setLineDash([]); }
          else { ctx.strokeStyle = "rgba(180,180,190,0.6)"; ctx.setLineDash([4, 4]); }
          ctx.lineWidth = 2.4;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (phenomena.silentFailure) {
        const [a, b] = phenomena.silentFailure;
        const pa = nodes[a], pb = nodes[b];
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = "rgba(232,197,71,0.85)";
        ctx.lineWidth = 2.4;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const activeCascade = new Set(props.activeCascade || []);
      for (const id of ALL_IDS) {
        const n = nodes[id];
        const char = getCharacter(id);
        const eng = engagementByNpc[id] ?? 0;
        const rep = reputation[id] ?? 50;
        const tv = trust[id] ?? 50;
        const radius = (compact ? 12 : 22) + Math.max(0, Math.min(compact ? 8 : 18, eng / 4));

        const trustFromPlayer = id === PLAYER_ID ? 50 : (props.trustMatrix ? props.trustMatrix[PLAYER_ID]?.[id] : trust[id]) ?? 50;
        const wantExpr = EXPR.expressionFor(id, {
          playerAction: props.playerAction, emitterId: props.emitterId,
          trust: trustFromPlayer, reputation: rep,
        });
        const sp = n.sprite;
        if (wantExpr !== sp.curr) { sp.prev = sp.curr; sp.curr = wantExpr; sp.startedAt = t; }
        const fadeFrames = 14;
        const fadeP = Math.min(1, (t - sp.startedAt) / fadeFrames);

        const isHighlight = props.highlightNode === id;
        const isCascade = activeCascade.has(id);

        if (isHighlight || isCascade) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isHighlight ? "rgba(114,176,255,0.9)" : "rgba(61,220,151,0.6)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const prevImg = sp.prev ? EXPR.getCachedImage(EXPR.spriteUrl(id, sp.prev)) : null;
        const currImg = EXPR.getCachedImage(EXPR.spriteUrl(id, sp.curr));
        if (prevImg) ctx.drawImage(prevImg, n.x - radius, n.y - radius, radius * 2, radius * 2);
        else { ctx.fillStyle = id === PLAYER_ID ? "#4169E1" : char.color; ctx.fillRect(n.x - radius, n.y - radius, radius * 2, radius * 2); }
        if (currImg) {
          ctx.globalAlpha = prevImg ? fadeP : 1;
          ctx.drawImage(currImg, n.x - radius, n.y - radius, radius * 2, radius * 2);
          ctx.globalAlpha = 1;
        } else if (!prevImg) {
          ctx.fillStyle = "#fff";
          ctx.font = `${radius}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(char.symbol || char.name[0], n.x, n.y + radius * 0.35);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.lineWidth = compact ? 1.5 : 2 + (rep / 100) * 3;
        ctx.strokeStyle = trustColor(tv);
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (!compact) {
          ctx.fillStyle = "#a8adba";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(char.name, n.x, n.y + radius + 13);
        }
      }
      ctx.restore();
    }

    raf = requestAnimationFrame(step);

    return {
      update,
      destroy() { running = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
    };
  }

  global.CONFIA_GRAPH = { create };
})(window);
