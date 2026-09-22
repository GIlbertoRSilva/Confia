/**
 * expressions.js
 * Usa os retratos reais dos personagens (assets/images/*.png) com 4
 * expressões cada: neutro / feliz / triste / surpreso (NPCs) e
 * neutro / confiante / desconfiado / surpreso (jogador).
 *
 * A expressão de um NPC reflete a reação dele à ação do jogador quando ele
 * é o emissor da rodada; caso contrário, reflete sua média de confiança e
 * reputação. A expressão do jogador reflete a última ação escolhida.
 */
(function (global) {
  const PLAYER_ID = global.CONFIA_CHARACTERS.PLAYER_ID;

  function spriteUrl(id, expr) {
    return `assets/images/${id}_${expr}.png`;
  }

  function selectNpcExpression(reaction, trust, reputation) {
    if (reaction === "confiar") return "feliz";
    if (reaction === "verificar") return "surpreso";
    if (reaction === "ignorar") return "triste";
    const avg = (trust + reputation) / 2;
    if (avg > 65) return "feliz";
    if (avg < 35) return "triste";
    return "neutro";
  }

  function selectPlayerExpression(action) {
    if (action === "confiar") return "confiante";
    if (action === "verificar") return "surpreso";
    if (action === "ignorar") return "desconfiado";
    return "neutro";
  }

  function expressionFor(id, ctx) {
    if (id === PLAYER_ID) return selectPlayerExpression(ctx.playerAction || null);
    const isEmitter = ctx.emitterId === id;
    return selectNpcExpression(isEmitter ? ctx.playerAction || null : null, ctx.trust ?? 50, ctx.reputation ?? 50);
  }

  const imageCache = new Map();
  const loadStatus = new Map();

  function loadSprite(url) {
    let img = imageCache.get(url);
    if (img) return img;
    img = new Image();
    img.decoding = "async";
    img.onload = () => loadStatus.set(url, "ok");
    img.onerror = () => loadStatus.set(url, "err");
    img.src = url;
    imageCache.set(url, img);
    return img;
  }

  function getCachedImage(url) {
    const img = imageCache.get(url);
    if (img && loadStatus.get(url) === "ok") return img;
    return null;
  }

  function preloadAllSprites() {
    const NPC_IDS = ["lia", "celia", "eco", "thiago", "fantasma", "bot", "kevin"];
    const NPC_EXPR = ["neutro", "feliz", "triste", "surpreso"];
    const PLAYER_EXPR = ["neutro", "confiante", "desconfiado", "surpreso"];
    for (const id of NPC_IDS) for (const e of NPC_EXPR) loadSprite(spriteUrl(id, e));
    for (const e of PLAYER_EXPR) loadSprite(spriteUrl(PLAYER_ID, e));
  }

  global.CONFIA_EXPRESSIONS = {
    spriteUrl, selectNpcExpression, selectPlayerExpression, expressionFor,
    loadSprite, getCachedImage, preloadAllSprites,
  };
})(window);
