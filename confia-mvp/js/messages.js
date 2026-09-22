/**
 * messages.js
 * Banco oficial de 40 mensagens: 10 verdadeiras, 18 falsas, 12 meias-verdades.
 *
 * DECISÃO INTERPRETATIVA (spec §5 do MVP / §28 princípio de interpretação):
 * cada mensagem tem id/texto/tipo, mas o "emissor" não está fixado no banco —
 * ele é atribuído dinamicamente a cada rodada, a partir do conjunto de NPCs
 * já revelados pela progressão (network.js § revelação progressiva). Isso
 * evita fabricar uma atribuição emissor↔mensagem que a fonte não especifica,
 * mantendo o campo "emissor" presente em cada mensagem em jogo (preenchido
 * em tempo de execução por game.js) conforme exigido pela especificação.
 */
(function (global) {
  const MESSAGES = [
    // VERDADEIRAS (10)
    { id: 1, text: "43% dos brasileiros associam fake news à política, segundo pesquisa do Aláfia Lab.", klass: "true", topic: "Política" },
    { id: 2, text: "Mais de 70% das pessoas acreditam em pelo menos uma afirmação falsa sobre saúde, aponta estudo da Nature.", klass: "true", topic: "Saúde" },
    { id: 3, text: "Brasil reforça liderança internacional no combate à desinformação climática durante evento da ONU.", klass: "true", topic: "Meio Ambiente" },
    { id: 4, text: "STF foi o principal alvo de desinformação no Brasil em 2026, com 25% das fake news usando IA.", klass: "true", topic: "Política" },
    { id: 5, text: "Receita Federal desmente fake news sobre fiscalização de Pix; sistemas Harpia e T-Rex não existem.", klass: "true", topic: "Economia" },
    { id: 6, text: "Ministério da Saúde e OMS afirmam que Brasil não tem caso de vírus Nipah confirmado.", klass: "true", topic: "Saúde" },
    { id: 7, text: "Deepfakes aumentaram de 39 casos em 2024 para 159 em 2025, segundo Observatório Lupa.", klass: "true", topic: "Tecnologia" },
    { id: 8, text: "Vídeos fraudulentos com IA cresceram 308% entre 2024 e 2025, aponta relatório da Lupa.", klass: "true", topic: "Tecnologia" },
    { id: 9, text: "Polícia Civil deflagrou operação no Maranhão contra suspeitos de espalhar fake news geradas por IA.", klass: "true", topic: "Segurança" },
    { id: 10, text: "7 em cada 10 brasileiros já viram alguma notícia falsa, segundo DataSenado.", klass: "true", topic: "Sociedade" },

    // FALSAS (18)
    { id: 11, text: "Cristo Redentor teve show de drones em homenagem a Neymar após eliminação na Copa.", klass: "false", topic: "Entretenimento" },
    { id: 12, text: "Governo federal está perdendo oportunidades de investimentos para o Brasil, diz autoridade fictícia.", klass: "false", topic: "Economia" },
    { id: 13, text: "Médico clonado por IA recomenda que banho quente causa problemas cardíacos fatais.", klass: "false", topic: "Saúde" },
    { id: 14, text: "Queijos podem destruir sua saúde após os 60 anos, segundo vídeos virais com IA.", klass: "false", topic: "Saúde" },
    { id: 15, text: "Governo está escondendo dados sobre a economia para não prejudicar sua imagem.", klass: "false", topic: "Política" },
    { id: 16, text: "Pix será taxado pelo governo federal em 2026, afirma corrente de WhatsApp.", klass: "false", topic: "Economia" },
    { id: 17, text: "Vacinas contra COVID-19 causam autismo, diz estudo falsificado.", klass: "false", topic: "Saúde" },
    { id: 18, text: "Cloroquina é eficaz no tratamento da COVID-19, afirmam grupos antivacina.", klass: "false", topic: "Saúde" },
    { id: 19, text: "Bolsa Família paga R$ 15 mil para mulher com 22 filhos.", klass: "false", topic: "Economia" },
    { id: 20, text: "FGTS será confiscado pelo governo para pagar dívidas.", klass: "false", topic: "Economia" },
    { id: 21, text: "Brasil quebrou financeiramente em 2026, dizem perfis nas redes.", klass: "false", topic: "Economia" },
    { id: 22, text: "Indígenas protestaram a favor da soltura de um preso político com faixas.", klass: "false", topic: "Política" },
    { id: 23, text: "Ministério anunciou aumento de impostos para os mais pobres na reforma tributária.", klass: "false", topic: "Economia" },
    { id: 24, text: "TSE está proibindo checagem de fatos nas eleições de 2026.", klass: "false", topic: "Política" },
    { id: 25, text: "Rede social removeu totalmente a checagem de fake news no Brasil, diz post viral.", klass: "false", topic: "Tecnologia" },
    { id: 26, text: "Personagem criada por IA é divulgada como eleitora real que critica o governo.", klass: "false", topic: "Política" },
    { id: 33, text: "Ministério da Saúde reduziu número de vacinas contra gripe em 2025.", klass: "false", topic: "Saúde" },
    { id: 38, text: "INSS vai acabar em 2030, segundo posts virais.", klass: "false", topic: "Previdência" },

    // MEIAS-VERDADES (12)
    { id: 27, text: "25% das fake news no Brasil já utilizam inteligência artificial.", klass: "half", topic: "Tecnologia" },
    { id: 28, text: "Órgão eleitoral enfraqueceu combate à desinformação para eleições 2026, dizem entidades.", klass: "half", topic: "Política" },
    { id: 29, text: "IA e big techs dificultam monitoramento de desinformação nas eleições.", klass: "half", topic: "Tecnologia" },
    { id: 30, text: "Big techs usam projeto de lei das Fake News como argumento contra regulação do mercado digital.", klass: "half", topic: "Economia" },
    { id: 31, text: "47% dos brasileiros admitem ignorar conteúdo suspeito em vez de verificar.", klass: "half", topic: "Sociedade" },
    { id: 32, text: "Apenas 24% de um grupo de eleitores recorrem a agências de checagem.", klass: "half", topic: "Política" },
    { id: 34, text: "Desmatamento na Amazônia aumentou em 2025 (mas omite queda recorde no ano anterior).", klass: "half", topic: "Meio Ambiente" },
    { id: 35, text: "Brasil registrou alto número de queimadas em 2025 (número alto, mas não o maior da série histórica).", klass: "half", topic: "Meio Ambiente" },
    { id: 36, text: "Preço dos combustíveis subiu em 2025 (contexto internacional omitido).", klass: "half", topic: "Economia" },
    { id: 37, text: "Governo cortou verbas para segurança pública em 2025 (cortes em algumas áreas, aumento em outras).", klass: "half", topic: "Segurança" },
    { id: 39, text: "58% das pessoas dizem conseguir reconhecer fake news 'com dúvidas em alguns casos'.", klass: "half", topic: "Sociedade" },
    { id: 40, text: "Eleições de 2026 serão as mais difíceis de monitorar devido à IA.", klass: "half", topic: "Política" },
  ];

  function klassLabel(k) {
    return k === "true" ? "Verdadeira" : k === "false" ? "Falsa" : "Meia-verdade";
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  global.CONFIA_MESSAGES = { MESSAGES, klassLabel, shuffle };
})(window);
