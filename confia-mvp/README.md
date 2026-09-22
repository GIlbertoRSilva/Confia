# CONFIA

Porte completo do app original (React + TypeScript) para **HTML5 + CSS3 +
JavaScript puro + Canvas API** — mesma tecnologia trocada, mesma aparência,
mesma funcionalidade. Sem build step, sem framework, sem backend.

## Como abrir

```bash
cd confia-mvp
python3 -m http.server 8080
# abra http://localhost:8080
```

(Também funciona abrindo `index.html` direto com `file://`.)

## Estrutura

```
confia-mvp/
├── index.html          → shell da SPA (#app) + Google Fonts + ordem dos scripts
├── css/style.css        → design system completo (tokens oklch, .panel, animações)
├── assets/
│   ├── confia-logo.png       → logo do jogo (tela de menu)
│   ├── nos-studio-logo.png   → logo do estúdio (splash inicial)
│   └── images/                → 32 retratos (7 NPCs + jogador × 4 expressões)
└── js/
    ├── config.js         → parâmetros ajustáveis (DEFAULT_CONFIG + runtimeConfig)
    ├── characters.js     → 7 NPCs + jogador, cores, estratégias, ruído
    ├── network.js        → 12 conexões, revelação progressiva, conceitos por rodada
    ├── messages.js        → banco de 40 mensagens (10 verdadeiras/18 falsas/12 meias)
    ├── strategies.js      → decisão de cada NPC + propagação BFS pela rede
    ├── phenomena.js       → detecção de câmara de eco / polarização / falha silenciosa
    ├── qlearning.js        → modelo de recompensa (pesos w1/w2/w3) usado no sandbox
    ├── game.js             → motor completo: decay, moderação, presets de rede, finais
    ├── simulator.js        → 6 estratégias de jogador-bot + runBatch
    ├── expressions.js      → mapeamento de expressão → sprite
    ├── audio.js             → sons sintéticos via Web Audio API (sem libs externas)
    ├── persistence.js      → localStorage (progresso, conquistas)
    ├── charSprite.js       → componente de retrato com crossfade (DOM)
    ├── graph.js             → grafo em Canvas com física contínua e crossfade
    ├── modal.js              → diálogo genérico reutilizável
    ├── propagationTree.js   → árvore de propagação (Canvas, dentro do modal)
    ├── ui-menu.js            → tela de menu (logo + personagens flutuando)
    ├── ui-how.js              → tela "Como funciona"
    ├── ui-play.js             → tela de jogo (HUD, conceito, grafo, mensagem, feed)
    ├── ui-result.js           → tela de resultado (stats, replay, conquistas)
    ├── ui-sandbox.js          → laboratório do algoritmo (presets, pesos, loop)
    ├── ui-simulate.js         → simulador de estratégias + painel de configuração
    └── main.js                → orquestrador (splash → menu → ... telas)
```

## Fluxo de telas

`splash → menu → { how | tutorial → play → result | sandbox | simulate }`

- **Splash**: logo do nós studio, 3s, some com fade.
- **Menu**: logo do Confia com os 6 NPCs flutuando ao redor; "Começar (tutorial)"
  na primeira vez, "Jogar" depois; Sandbox só libera após a 1ª partida.
- **Tutorial/Jogo**: HUD (confiança/engajamento), card do conceito de teoria dos
  jogos da rodada, grafo animado, painel de fenômenos, inspeção de reputação,
  mensagem com 3 ações (contorno colorido, sem preenchimento), feed de atividade,
  nota de impacto da jogada, árvore de propagação num modal.
- **Resultado**: título colorido por tipo de final, grid de stats, "por que
  esse final" + lição, trilha de decisões, replay rodada-a-rodada, conquistas,
  grafo final compacto.
- **Sandbox**: presets de rede inicial (neutra/câmara de eco/polarizada),
  presets de estratégia, sliders w1/w2/w3, passo único / loop / simulação
  completa, gráfico de recompensa, grafo ao vivo.
- **Simular**: painel de configuração avançada + roda N partidas para as 6
  estratégias (Always Trust/Verify/Ignore, Mixed, Random, Tit for Tat) e
  mostra distribuição de finais em tabela e barras empilhadas.

## Persistência

`localStorage["confia-stats"]` guarda se já jogou (`firstDone`), total
acumulado de verificações e conquistas desbloqueadas — decide se o menu
mostra "tutorial" ou "jogar" e se libera o Sandbox. `localStorage["confia:sound"]`
guarda a preferência de som.

## Fidelidade ao original

Todo o motor (efeitos de confiança, decaimento, moderação por reputação,
bônus de verificação coletiva, presets de rede, condições de final,
conquistas) e todas as 7 telas foram portados 1:1 da versão React/TypeScript
— a diferença é só a camada de implementação.
