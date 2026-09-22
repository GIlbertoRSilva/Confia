/**
 * propagationTree.js — porta fiel de PropagationTree.tsx.
 */
(function (global) {
  const { getCharacter, PLAYER_ID } = global.CONFIA_CHARACTERS;
  const EXPR = global.CONFIA_EXPRESSIONS;

  function layoutTree(root, width, topPad, levelH) {
    topPad = topPad ?? 40;
    levelH = levelH ?? 78;
    let cursor = 0;
    const leafSpacing = 1;

    function walk(n, depth) {
      const kids = n.children.map((c) => walk(c, depth + 1));
      let x;
      if (kids.length === 0) { x = cursor; cursor += leafSpacing; }
      else { x = (kids[0]._x + kids[kids.length - 1]._x) / 2; }
      return Object.assign({}, n, { children: kids, _x: x, _y: depth * levelH + topPad });
    }

    const laid = walk(root, 0);
    const maxX = Math.max(cursor - leafSpacing, 1);
    const pad = 40;
    const scale = (width - pad * 2) / maxX;

    function scaleTree(p) {
      return Object.assign({}, p, { _x: pad + p._x * scale, children: p.children.map(scaleTree) });
    }
    return scaleTree(laid);
  }

  function render(canvas, root) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const laid = layoutTree(root, rect.width);

    const walkAll = (n, cb) => { cb(n); n.children.forEach((c) => walkAll(c, cb)); };
    const spriteFor = (n) => EXPR.spriteUrl(n.id, EXPR.expressionFor(n.id, { playerAction: n.action }));

    let cancelled = false, scheduled = false;
    const requestRedraw = () => {
      if (scheduled || cancelled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; if (!cancelled) draw(); });
    };
    walkAll(laid, (n) => {
      const url = spriteFor(n);
      if (!EXPR.getCachedImage(url)) {
        const img = EXPR.loadSprite(url);
        img.addEventListener("load", requestRedraw, { once: true });
        img.addEventListener("error", requestRedraw, { once: true });
      }
    });

    function draw() {
      ctx.clearRect(0, 0, rect.width, rect.height);

      function drawEdges(n) {
        for (const c of n.children) {
          const cls = c.action === "confiar" ? "rgba(61,220,151,0.9)"
            : c.action === "verificar" ? "rgba(114,176,255,0.9)"
            : "rgba(184,188,199,0.6)";
          ctx.beginPath();
          ctx.moveTo(n._x, n._y);
          const midY = (n._y + c._y) / 2;
          ctx.bezierCurveTo(n._x, midY, c._x, midY, c._x, c._y);
          ctx.strokeStyle = cls;
          ctx.lineWidth = c.action === "confiar" ? 3 : 1.5;
          if (c.action === "ignorar") ctx.setLineDash([3, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          drawEdges(c);
        }
      }
      drawEdges(laid);

      function drawNodes(n) {
        const char = getCharacter(n.id);
        const isPlayer = n.id === PLAYER_ID;
        const r = isPlayer ? 24 : 18;

        if (isPlayer) {
          ctx.beginPath();
          ctx.arc(n._x, n._y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(114,176,255,0.6)";
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(n._x, n._y, r, 0, Math.PI * 2);
        ctx.fillStyle = char.color;
        ctx.fill();

        const img = EXPR.getCachedImage(spriteFor(n));
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(n._x, n._y, r - 1, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, n._x - r, n._y - r, r * 2, r * 2);
          ctx.restore();
        } else {
          ctx.fillStyle = "#171a21";
          ctx.font = `bold ${isPlayer ? 16 : 14}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(char.symbol, n._x, n._y + 1);
        }

        ctx.beginPath();
        ctx.arc(n._x, n._y, r, 0, Math.PI * 2);
        ctx.lineWidth = isPlayer ? 3 : 2;
        ctx.strokeStyle = n.action === "confiar" ? "#3ddc97" : n.action === "verificar" ? "#72b0ff" : "#b8bcc7";
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isPlayer ? "#9fc4ff" : "#f2f3f7";
        ctx.font = `${isPlayer ? "700" : "600"} 11px sans-serif`;
        ctx.fillText(isPlayer ? "VOCÊ" : char.name, n._x, n._y + r + 12);
        ctx.fillStyle = "#b8bcc7";
        ctx.font = "9px monospace";
        ctx.fillText(n.action, n._x, n._y + r + 24);

        n.children.forEach(drawNodes);
      }
      drawNodes(laid);
    }

    draw();
    return () => { cancelled = true; };
  }

  global.CONFIA_PROPAGATION_TREE = { render };
})(window);
