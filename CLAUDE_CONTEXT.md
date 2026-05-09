# 🤖 Contexto para Desenvolvimento com Claude

Este ficheiro serve para dar contexto ao Claude AI quando precisares de iterar ou criar novos módulos no sistema de pontuação. Lê-o no início de cada sessão.

---

## 📁 Estrutura do Projeto

```
score/
├── master.html              # App do organizador — Contador Genérico (sistema modular)
├── client.html              # App dos participantes — Contador Genérico (sistema modular)
├── master-diamant.html      # App standalone — Diamant / Incan Gold (master)
├── client-diamant.html      # App standalone — Diamant / Incan Gold (cliente)
├── master-hitster.html      # App standalone — Mega Hitster (master)
├── client-hitster.html      # App standalone — Mega Hitster (cliente)
├── games/
│   ├── game-interface.js    # Interface que os módulos do sistema modular devem seguir
│   ├── game-system.js       # Core do sistema modular (NÃO MODIFICAR)
│   ├── generic.js           # Módulo: Contador Genérico (usa game-system.js)
│   ├── diamant.js           # Referência de regras Diamant (não é usado pelas apps standalone)
│   └── hitster.js           # Módulo Hitster — lógica, categorias, getLastPlace (carregado pelas apps standalone)
├── shared/
│   └── firebase-config.js   # FirebaseConfig + AppConfig (URLs públicas das 4 apps)
├── logo1.png … logo4.png    # Logotipos de patrocinadores/organização (4 no total)
├── README.md
├── CHANGELOG.md
├── DEVELOPMENT_LOG.md       # Log detalhado de desenvolvimento por módulo
└── CLAUDE_CONTEXT.md        # Este ficheiro
```

---

## 🏗️ Duas Arquitecturas

### 1. Sistema Modular (Contador Genérico)
Usa `game-system.js` + módulos em `games/*.js`. As apps `master.html` e `client.html` carregam o módulo activo em runtime. Cada módulo implementa a interface definida em `game-interface.js`.

### 2. Apps Standalone (Diamant, Mega Hitster)
Cada jogo tem o seu próprio par de ficheiros HTML (`master-xxxx.html` + `client-xxxx.html`). Toda a lógica de estado, Firebase e UI está dentro do HTML. O ficheiro `games/hitster.js` é carregado como script auxiliar (categorias, `getLastPlace`, constantes) mas não é um módulo do sistema modular. **Não** usam `game-system.js`.

Ao criar um novo jogo standalone, o padrão é:
- Criar `master-novojogo.html` e `client-novojogo.html`
- Opcionalmente criar `games/novojogo.js` para lógica partilhada
- Adicionar URLs em `shared/firebase-config.js` (`AppConfig`)

---

## 🔥 Firebase — Estrutura de Dados

### Sessão activa
```
sessions/{sessionId}/
  gameState/           — estado completo do jogo (escrito pelo master, lido pelos clientes)
    gameType           — 'hitster' | 'diamant' | 'generic'
    active             — true | false
    timestamp          — Date.now()
    phase              — fase atual ('waiting', 'joker_window', 'answering', 'reviewing', …)
    … campos específicos do jogo
  clients/{tableId}/   — um nó por equipa conectada
    tableNumber        — número da mesa (int)
    teamName           — nome da equipa
    emails             — array de emails
    connectedAt        — timestamp
    lastSeen           — timestamp (heartbeat do cliente, atualizado a cada ~15s)
    clientId           — UUID persistente no localStorage (previne colisões de mesa)
  textResponses/{tableId}/   — resposta de texto submetida (Hitster)
    text               — string
    timestamp          — Date.now()
    clientId           — UUID do cliente que enviou
  histerJokers/{tableId}/    — joker ativado (Hitster)
    activated          — true
    timestamp          — Date.now()
    clientId           — UUID

sessionHistory/{histId}/     — sessões arquivadas
```

### Caminhos especiais
- `.info/connected` — estado de conexão WebSocket (usado pelos clientes para detetar offline)

---

## 🎯 Padrões do Cliente (Hitster / Standalone)

O cliente standalone tem vários mecanismos de resiliência que devem ser mantidos em novas apps:

| Mecanismo | Como funciona |
|---|---|
| `clientId` | UUID em localStorage; enviado em `clients/<n>` e em todas as escritas. Impede que dois dispositivos partilhem a mesma mesa. |
| `resubKey` | Estado inteiro incrementado em `visibilitychange`/`focus`/`online`; força re-subscribe dos listeners Firebase. |
| `forceRefreshGameState()` | Chama `get()` explícito em `gameState` — garante dados frescos mesmo que `onValue` não dispare após reconnect. |
| Heartbeat | `update(clients/<n>, {lastSeen})` a cada 15 s. |
| `.info/connected` | Banner vermelho quando offline; trigger de `forceRefreshGameState` ao reconectar. |
| `withTimeout(promise, ms)` | Wrapper com `Promise.race` para evitar writes pendurados se o WebSocket estiver morto. |
| Submit com retry | 3 tentativas com timeout 6 s + verify-after-write (`get()` após `set()`). |
| `localAnswerEndRef` | Ref que persiste `answerTimerEndAt` durante `reviewing` para o timer do cliente não desaparecer prematuramente. |

---

## 🎵 Mega Hitster — Resumo Técnico

Ficheiros: `master-hitster.html`, `client-hitster.html`, `games/hitster.js`

### Fases do jogo
```
waiting → joker_window → answering → reviewing → waiting …
```

### Estado Firebase (`gameState`)
| Campo | Tipo | Descrição |
|---|---|---|
| `phase` | string | Fase atual |
| `currentCategory` | object | `{ id, name, description, points, isTimeline? }` |
| `jokerTimerEndAt` | timestamp | Fim da janela do joker |
| `answerTimerEndAt` | timestamp | Fim do tempo de resposta |
| `jokerOrder` | int[] | IDs por ordem de uso de joker (todo o jogo; serve para desempate) |
| `roundJokers` | int[] | IDs que usaram joker nesta ronda |
| `singingTeamId` | int\|null | Mesa cantora |
| `allJokersUsed` | bool | True se todas as mesas já usaram o joker |
| `tables` | object[] | `[{ id, name, score, jokerUsed }]` |
| `showScores` | bool | Visibilidade dos pontos (só oculta no master) |
| `tablesLocked` | bool | Impede novas entradas manuais |
| `roundNumber` | int | Número da ronda atual |
| `selectedLogos` | string[] | Caminhos dos logos activos |

### Regras de pontuação
- Resposta certa: `pts × (joker ? 2 : 1)`
- Cantora: `min(respostas_certas_das_outras, 3) × pts`
- Desempate em último lugar: quem usou joker mais cedo (`jokerOrder[0]` tem prioridade)

### Sincronização master→cliente
O master usa um `useEffect` com debounce de 200 ms para escrever `gameState`. O cliente usa `onValue` sobre `gameState` + `forceRefreshGameState()` nas transições de visibilidade.

### `ReviewModal` (master)
**Importante:** chamado como `ReviewModal()` (função pura), não `h(ReviewModal, null)`. Isto preserva o DOM e o `scrollTop` quando `setCheckedAnswers` causa re-render. Se for convertido para componente React próprio, usar `useRef` para restaurar scroll.

---

## 🎲 Módulos Existentes

### Contador Genérico (`master.html` / `client.html`)
- Pontuação manual (+1, -1, +5)
- Buzzers com bloqueio
- Respostas de texto com temporizador
- Categorias sorteáveis

### Diamant / Incan Gold (`master-diamant.html` / `client-diamant.html`)
- Distribuição automática de rubis
- Votação secreta "Continuar/Sair"
- Gestão de reserva e sobras
- Pontos provisórios vs definitivos
- Timeout de votação com auto-saída

### Mega Hitster (`master-hitster.html` / `client-hitster.html`)
- Categorias musicais configuráveis (Ano Exato, Ano ±3, Título, Artista, Década, Timeline Duel)
- Janela do Joker (duplica pontos, 1 por jogo por equipa)
- Modo Cantora (equipa em último lugar canta; ganha pontos por acertos das outras)
- Timers absolutos (timestamps) — clientes derivam countdown localmente
- Resiliência: clientId, heartbeat, retry, verify-after-write, force-refresh
- Indicadores de presença no master (online/ausente/offline) baseados em `lastSeen`
- Comprovativo de resposta visível após timer expirar (no cliente)
- Modal de ajuda "?" com regras e categorias (no cliente)

---

## 🎨 Princípios de Design

### Cores por contexto
| Contexto | Cores principais |
|---|---|
| Genérico / Diamant | purple-600, indigo-600, green-500, red-500 |
| Mega Hitster | violet-900, purple-900, indigo-900 (fundo); yellow-500 (joker/categoria); violet-400/600 (pontos) |

### Padrões de UI comuns
- **Botões**: `rounded-lg`, `font-bold`, `active:scale-95 transition-all`
- **Cards**: `bg-white rounded-2xl shadow-2xl p-4` (modais claros) ou `bg-slate-800 rounded-xl border` (listas escuras)
- **Modais**: fundo `bg-black bg-opacity-70 fixed inset-0`, fechar ao clicar fora
- **Header do cliente (Hitster)**: `[nome+mesa | logo | ? (bola glow) | código | ✕ (quadrado vermelho)]`

### React sem JSX
Todas as apps usam `React.createElement` (aliasado como `h`). Sem transpilação, sem JSX.

```javascript
// Padrão correto
var h = React.createElement;
h('div', { className: 'flex gap-2' },
    h('span', null, 'Texto')
)
```

---

## 🔧 Interface de Módulo Modular (para generic/game-system)

```javascript
const MeuModulo = {
    id: 'meujogo',
    name: 'Nome do Jogo',
    description: '...',
    icon: '🎮',

    getDefaultConfig: function() { return {...}; },
    getConfigUI: function(config, setConfig, h) { return ...; },

    onSessionStart: function(config) { return estadoInicial; },
    onSessionEnd:   function(state, tables, config) { return dadosHistorico; },

    processAction:    function(action, state, tables) { return { gameState, tables }; },
    getFirebaseState: function(state, config, tables, extra) { return estadoFirebase; },

    getGameControlsUI: function({ gameState, config, tables, actions, h }) { return ...; },
    getTableUI:        function({ table, gameState, connectedClients, textResponses, h }) { return ...; },
    getClientUI:       function({ gameData, myTable, tableNumber, actions, h }) { return ...; }
};
window.MeuModulo = MeuModulo;
```

---

## 📝 Template de Prompt para Claude

```
## Projeto
Sistema de Pontuação — https://github.com/alpces/score (GitHub Pages: alpces.github.io/score)

## Módulo / Ficheiros
[ex: Mega Hitster — master-hitster.html, client-hitster.html, games/hitster.js]

## Estado atual
[ex: v1.2 — ver DEVELOPMENT_LOG.md para histórico]

## O que quero fazer
[Descrever a funcionalidade ou bug]

## Código relevante (se existir)
[Colar trecho do código afetado]

## Comportamento esperado
[Detalhar]
```

---

## ⚠️ Regras e Notas

1. **Sistema modular**: não modificar `game-system.js` — é o core partilhado
2. **Apps standalone**: `master-hitster.html` e similares são auto-contidas; ignorar regras do sistema modular
3. **Firebase**: sempre incluir `gameType`, `timestamp`, `active` no `gameState`
4. **Logos**: existem `logo1.png` a `logo4.png` (4 no total); o código carrega até 5 com fallback silencioso (`onerror`)
5. **Retrocompatibilidade**: sessões antigas devem continuar a funcionar; não remover campos do Firebase sem migração
6. **`ReviewModal` no Hitster**: chamar como `ReviewModal()` para preservar scroll — ver secção acima
7. **Testes**: não há suite de testes automatizados; testar manualmente no browser e em GitHub Pages após push

---

## 👥 Contribuidores

- **ALPCeS - Ludonautas** — Desenvolvimento e design
- **Claude AI** — Assistência de código
- https://ludonautas.pt
