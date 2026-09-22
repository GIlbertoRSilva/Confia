/**
 * charSprite.js — porta simplificada de CharacterSprite.tsx: cria um
 * elemento <div class="char-sprite"> com crossfade suave entre expressões,
 * usado em HUD, MessageCard e no menu (personagens flutuantes).
 */
(function (global) {
  const EXPR = global.CONFIA_EXPRESSIONS;

  /** Cria o elemento inicial. Retorna { el, setExpression(expr) }. */
  function create({ characterId, expression, size, color, fallback, name }) {
    const el = document.createElement("div");
    el.className = "char-sprite";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.background = color || "oklch(0.4 0.05 260)";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${name || characterId} - ${expression}`);

    let current = expression;
    const baseImg = document.createElement("img");
    baseImg.alt = "";
    baseImg.draggable = false;
    el.appendChild(baseImg);

    function paint(expr) {
      const url = EXPR.spriteUrl(characterId, expr);
      const cached = EXPR.getCachedImage(url);
      if (cached) {
        baseImg.src = url;
        el.querySelector(".fallback")?.remove();
        return;
      }
      const img = EXPR.loadSprite(url);
      img.addEventListener(
        "load",
        () => {
          baseImg.style.transition = "opacity 150ms linear";
          baseImg.style.opacity = "0";
          setTimeout(() => {
            baseImg.src = url;
            baseImg.style.opacity = "1";
          }, 90);
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        () => {
          let fb = el.querySelector(".fallback");
          if (!fb) {
            fb = document.createElement("span");
            fb.className = "fallback";
            fb.style.color = "oklch(0.18 0.05 260)";
            fb.style.fontSize = Math.round(size * 0.5) + "px";
            fb.textContent = fallback || "?";
            el.appendChild(fb);
          }
        },
        { once: true }
      );
    }

    paint(current);

    function setExpression(expr) {
      if (expr === current) return;
      current = expr;
      paint(expr);
      el.setAttribute("aria-label", `${name || characterId} - ${expr}`);
    }

    return { el, setExpression };
  }

  global.CONFIA_CHAR_SPRITE = { create };
})(window);
