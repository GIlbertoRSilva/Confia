/**
 * modal.js — porta do componente Modal genérico de index.tsx.
 */
(function (global) {
  function open({ title, bodyHtml, onClose }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const panel = document.createElement("div");
    panel.className = "panel modal-panel float-in";
    panel.innerHTML = `
      <div class="modal-header">
        <h3 class="font-display">${title}</h3>
        <button class="modal-close" aria-label="Fechar diálogo">×</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function close() {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      if (onClose) onClose();
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    overlay.addEventListener("click", close);
    panel.addEventListener("click", (e) => e.stopPropagation());
    panel.querySelector(".modal-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    panel.querySelector(".modal-close").focus();

    return { close, bodyEl: panel.querySelector(".modal-body") };
  }

  global.CONFIA_MODAL = { open };
})(window);
