(function (global) {
  function render(container, { onBack }) {
    container.innerHTML = `
      <div class="screen screen-padded">
        <button id="btnBack" class="back-link" style="margin-bottom:16px;">← Voltar</button>
        <h2 style="font-size:30px;font-weight:700;margin-bottom:16px;">Como funciona</h2>
        <div>
          <div class="panel info-card">
            <h3>1. Chega uma mensagem</h3>
            <p>A cada rodada alguém da sua rede te manda algo. Pode ser verdade, mentira ou meia verdade. Você não sabe de antemão.</p>
          </div>
          <div class="panel info-card">
            <h3>2. Você joga: confiar, verificar ou ignorar</h3>
            <p><b>Confiar</b> é cooperar: passa adiante. <b>Verificar</b> é o cauteloso: tem custo, mas evita erro. <b>Ignorar</b> é sair da jogada. Cada escolha muda a confiança de quem te mandou.</p>
          </div>
          <div class="panel info-card">
            <h3>3. Os outros também jogam</h3>
            <p>Cada pessoa segue uma estratégia diferente: sempre coopera, sempre trai, copia o vizinho, retribui na mesma moeda. Isso é a base da teoria dos jogos: cada um decide olhando o que os outros fazem.</p>
          </div>
          <div class="panel info-card">
            <h3>4. Um algoritmo aprende com você</h3>
            <p>A partir da metade da partida, um sistema começa a te observar. Ele recompensa o que gera mais cliques. Se o incentivo for só engajamento, a rede polariza.</p>
          </div>
        </div>
      </div>
    `;
    container.querySelector("#btnBack").addEventListener("click", onBack);
  }
  global.CONFIA_UI_HOW = { render };
})(window);
