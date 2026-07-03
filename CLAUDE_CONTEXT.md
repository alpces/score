# 🤖 Contexto para Desenvolvimento com IA

Este ficheiro é a referência canónica para qualquer assistente de IA (Claude, GPT, etc.) trabalhar neste repositório. Lê-o no início de cada sessão.

A app é em PT-PT. Ao gerar código novo ou comentários, mantém o tom e a língua dos blocos vizinhos.

---

## 🎯 Visão Geral

Sistema de pontuação multiplayer em tempo real, deployed no GitHub Pages. Cada jogo tem um par de páginas estáticas (`master-<jogo>.html` + `client-<jogo>.html`) que comunicam via **Firebase Realtime Database**. O master é o organizador (anfitrião do quiz/sessão); os clients são as equipas/mesas a competir.

Todas as apps usam **React 18 UMD sem JSX** (`React.createElement` aliasado como `h`) e **Tailwind CDN**. Não há build step.

Há dois cores partilhados em `shared/` que encapsulam a infraestrutura repetível (lifecycle de cliente, lifecycle de sessão). Lógica game-específica fica nos ficheiros do jogo.

---

## 📁 Estrutura do Projeto

```
score/
├── jogar.html                    # Hub público — escolher jogo e entrar como equipa
├── masters.html                  # Hub de anfitrião — não divulgado (ver robots.txt)
├── master.html                   # Organizador — sistema modular (Contador Genérico)
├── client.html                   # Participante — sistema modular
├── master-hitster.html           # Standalone — Mega Hitster (master)
├── client-hitster.html           # Standalone — Mega Hitster (cliente)
├── master-diamant.html           # Standalone — Diamant / Incan Gold (master)
├── client-diamant.html           # Standalone — Diamant / Incan Gold (cliente)
├── master-justone.html           # Standalone — Mega Just One (master, modos Consola/Público)
├── client-justone.html           # Standalone — Mega Just One (cliente)
├── master-deception.html         # Standalone — Deception Murder in Hong Kong (master)
├── client-deception.html         # Standalone — Deception Murder in Hong Kong (cliente)
│
├── shared/
│   ├── firebase-config.js        # FirebaseConfig + AppConfig (URLs públicas)
│   ├── client-core.js            # API de cliente reutilizável (ClientCore)
│   ├── session-core.js           # API de sessão reutilizável (SessionCore)
│   └── home-common.js            # Lógica partilhada de masters.html/jogar.html
│
├── games/
│   ├── game-interface.js         # Interface dos módulos do sistema modular
│   ├── game-system.js            # Core do sistema modular (NÃO MODIFICAR)
│   ├── generic.js                # Módulo: Contador Genérico
│   ├── diamant.js                # Referência de regras Diamant (não usado em runtime)
│   ├── hitster.js                # Constantes/categorias Hitster (carregado em runtime)
│   ├── justone-words-pt.txt      # Pool de palavras PT-PT por dificuldade (Mega Just One)
│   └── justone-words-en.txt      # Pool de palavras EN por dificuldade (Mega Just One)
│
├── logo1.png … logo4.png         # Logos opcionais (4; o código aceita até 5)
├── robots.txt                    # Disallow: /master* (esconde masters dos motores de busca)
├── README.md                     # Visão pública
├── CLAUDE_CONTEXT.md             # Este ficheiro (referência para IA)
├── CHANGELOG.md
├── DEVELOPMENT_LOG.md            # Log de versões por jogo
└── RULES-JUSTONE.md              # Regras PT-PT do Mega Just One
```

> **Acesso anfitrião vs. jogador:** `jogar.html` é o ponto de entrada público (linkado no
> README). `masters.html` e todos os `master-*.html` têm `<meta name="robots" content="noindex,
> nofollow">` e estão cobertos pelo `Disallow: /master*` em `robots.txt` — não são divulgados
> publicamente, só partilhados diretamente com quem organiza a sessão. `jogar.html` não tem
> nenhum link para `masters.html` (intencional). Ao criar um novo jogo, replica este padrão no
> `master-meujogo.html` novo.

---

## 🏗️ Três Arquitecturas

### 1. Sistema Modular (`master.html` + `client.html`)
Originalmente concebido para alojar vários jogos numa única app. Carrega `games/game-system.js` e um módulo (ex: `games/generic.js`) em runtime. Cada módulo implementa a interface em `games/game-interface.js`. **Não usa os shared cores** — antecede-os e tem o seu próprio scaffolding.

### 2. Apps Standalone (Hitster, Diamant)
Cada jogo tem o seu par de HTMLs auto-contidos. Mais simples de raciocinar e fazer deploy independente. **Usam os shared cores.** Este é o padrão recomendado para novos jogos.

### 3. Shared Cores
Dois ficheiros `shared/*-core.js` que expõem APIs `window.ClientCore` e `window.SessionCore`. Encapsulam toda a infraestrutura genérica (Firebase listeners, heartbeat, reconnection, archive flow). Ler estes ficheiros é o ponto de partida para entender o que já existe.

---

## 🧩 ClientCore — API completa

Em `shared/client-core.js`. Disponível em `window.ClientCore`. Não tem dependências de React; pode ser chamado de qualquer sítio.

| Função | Devolve | Para quê |
|---|---|---|
| `getClientId(storageKey?)` | `string` | UUID persistente em localStorage. Detecta colisões de mesa entre dispositivos. Default: `'client_id'`. Cada jogo passa a sua chave (ex: `'hitster_clientId'`). |
| `withTimeout(promise, ms)` | `Promise` | `Promise.race` com rejeição em `ms` ms. Evita ficar pendurado em writes Firebase quando o WebSocket está morto. |
| `createLocalStore(prefix, expiryMs?)` | `{save, load, clear}` | Wrapper de localStorage para sessão de cliente, com expiry (default 12h). Chaves: `<prefix>_session`, `_table`, `_team`, `_emails`, `_ts`. |
| `computeConnState(sinceMs, hasClient, opts?)` | `'online' \| 'idle' \| 'offline' \| 'gone'` | Helper de presença do master a partir de `lastSeen`. Defaults: idle ≥30s, offline ≥60s. |
| `connectClient({rtdb, fm, sessionCode, tableNumber, heartbeatMs?, onGameState, onSessionLost, onFbConnectionChange?, onResume?})` | `{disconnect, forceRefresh}` | **O coração do cliente.** Subscreve `gameState`, `clients/<n>` (deteção de remoção), `.info/connected`. Envia heartbeats (default 15s). Acorda WebSocket e dispara `forceRefresh` em `visibilitychange`/`focus`/`pageshow`/`online`. Dispara `onResume` para o jogo bumpar `resubKey` e re-subscrever os SEUS listeners. |
| `attachWakeLock()` | `{release}` | Adquire screen wake lock e re-adquire em visibility resume. Falha silenciosamente se o browser não suportar. |
| `joinSession({rtdb, fm, sessionCode, tableNumber, teamName, emails, clientId, gameType?, isAuto})` | `Promise<{ok, error?, clearLocal?, code?, table?, teamName?, emails?}>` | Faz join: valida sessão, detecta colisão de clientId, escreve `clients/<n>`. Mensagens em PT. Não modifica estado React — caller decide. |
| `submitWithVerify({rtdb, fm, path, payload, clientId?, verifyKey?, attempts?, writeTimeoutMs?, readTimeoutMs?, backoffMs?})` | `Promise<{ok, error?}>` | Write + read-back para confirmar que o servidor recebeu. Default 3 retries, timeouts 6s/5s, backoff 400ms, `verifyKey: 'text'`. |

### Padrão típico no cliente

```javascript
var localStore = ClientCore.createLocalStore('meujogo');
var clearLocal = localStore.clear;
var CLIENT_ID  = ClientCore.getClientId('meujogo_clientId');

// dentro de App():
useEffect(function() {
    if (!connected || !sessionCode || !tableNumber) return;
    var ctrl = ClientCore.connectClient({
        rtdb: rtdb, fm: fm,
        sessionCode: sessionCode, tableNumber: tableNumber,
        heartbeatMs: 15000,
        onGameState: setGameData,
        onSessionLost: function() {
            setSessionLost(true); setConnected(false); setGameData(null); clearLocal();
        },
        onFbConnectionChange: setFbConnected,
        onResume: function() { setResubKey(function(k) { return k + 1; }); }
    });
    return function() { ctrl.disconnect(); };
}, [connected, sessionCode, tableNumber]);

useEffect(function() {           // Listeners game-específicos
    if (!connected || !sessionCode || !tableNumber) return;
    var unsub = fm.onValue(fm.ref(rtdb, 'sessions/' + sessionCode + '/<path-do-jogo>/' + tableNumber), function(snap) { ... });
    return function() { unsub(); };
}, [connected, sessionCode, tableNumber, resubKey]);
```

---

## 🗂️ SessionCore — API completa

Em `shared/session-core.js`. Disponível em `window.SessionCore`. Para o lado do master.

| Função | Devolve | Para quê |
|---|---|---|
| `subscribeActiveSessions({rtdb, fm, gameType, onChange})` | `unsub` | Lista sessões em `sessions/` filtrada por `gameType` e `active !== false`, ordenada por timestamp desc. |
| `subscribeSessionHistory({rtdb, fm, gameType, onChange})` | `unsub` | Lista `sessionHistory/` filtrada por `gameType`. |
| `subscribeClients({rtdb, fm, sessionId, onLastSeen?, onStructural?})` | `unsub` | **Crítico para evitar re-renders.** `onLastSeen({tableNumber: ts})` dispara em CADA update (heartbeats incluídos) — usar para escrever num ref. `onStructural(data)` dispara só quando muda estrutura (nova mesa, nome, desconexão) — usar para `setState`. |
| `readGameStateOnce({rtdb, fm, sessionId})` | `Promise<gameState\|null>` | Leitura one-shot do `gameState` de uma sessão. |
| `readClientsOnce({rtdb, fm, sessionId})` | `Promise<clients>` | Leitura one-shot do nó `clients`. |
| `archiveSession({rtdb, fm, sessionId, gameType, history, enrich?, waitMs?})` | `Promise<{ok, archiveId?, error?}>` | Fluxo de 6 passos: `update active=false → wait (default 500ms) → readClients → enrich(history, clients) → set sessionHistory/<hid> → remove sessions/<id>`. |
| `enrichers.mergeEmailsIntoTables(history, clients)` | `history` | Padrão Hitster — para cada `t` em `history.tables`, mescla `emails` do cliente correspondente. |
| `enrichers.attachClientsField(history, clients)` | `history` | Padrão Diamant — guarda `clients` inteiro num campo separado. |

### Padrão típico de presença no master (sem flicker)

```javascript
var lastSeenMapRef = useRef({});

useEffect(function() {
    if (!sessionId) return;
    var unsub = SessionCore.subscribeClients({
        rtdb: rtdb, fm: fm, sessionId: sessionId,
        onLastSeen: function(lsMap) { lastSeenMapRef.current = lsMap; },   // sem state — sem re-render
        onStructural: function(data) {
            setConnectedClients(data);
            setTables(/* merge logic game-específico */);
        }
    });
    return function() { unsub(); };
}, [sessionId]);

// Tick a cada 5s para forçar re-avaliação de connState (ler ref a render time)
useEffect(function() {
    var iv = setInterval(function() { setPresenceTick(function(n) { return n + 1; }); }, 5000);
    return function() { clearInterval(iv); };
}, []);

// No render de cada mesa:
var lastSeen = lastSeenMapRef.current[table.id] || 0;
var sinceSeen = lastSeen ? (Date.now() - lastSeen) : Infinity;
var connState = ClientCore.computeConnState(sinceSeen, !!connectedClients[table.id]);
```

---

## 🔥 Estrutura de Dados Firebase (RTDB)

```
sessions/{sessionId}/
  gameState/                      # escrito pelo master, lido pelos clientes
    gameType                      # 'hitster' | 'diamant' | 'generic'
    active                        # bool — false sinaliza fim aos clientes
    timestamp                     # Date.now()
    phase                         # string — semântica game-específica
    tables                        # array { id, name, score, ... }
    selectedLogos                 # string[]
    rulesConfig                   # array (Hitster) — regras editáveis no master
    categories                    # array (Hitster) — sincronizado para o cliente
    … campos game-específicos
  clients/{tableNumber}/          # escrito pelos clientes
    tableNumber, teamName, emails
    connectedAt, lastSeen         # lastSeen = heartbeat (15s) via ClientCore
    clientId                      # UUID persistente em localStorage
  publicState/                    # projeção sanitizada — escrito SÓ pela Consola (Dual-Mode)
    # Just One:  phase, guesserTableId, visibleClues, publicShowScores, scores, timestamp
    # Deception: phase, round, scores, roundResult, timestamp
  textResponses/{tableNumber}/    # game-específico (Hitster)
  histerJokers/{tableNumber}/     # game-específico (Hitster)
  diamantVotes/{tableNumber}/     # game-específico (Diamant)
  diamantBets/{tableNumber}/      # game-específico (Diamant)

sessionHistory/{archiveId}/       # sessões arquivadas
  gameType, sessionId, timestamp, archived: true
  … campos preservados pelo enrich do archiveSession
```

Caminho especial: `.info/connected` — boolean WebSocket. Usado por `connectClient` para mostrar banner offline e disparar `forceRefresh` ao reconectar.

---

## 🧷 Padrões Defensivos (não reinventar)

Estes padrões surgiram após bugs reais em produção. Manter ao adicionar novas funcionalidades.

### `archivingRef` no master
**Porquê**: o `useEffect` de sync escreve `gameState.active=true` sempre que qualquer dep mudar. Durante o archive (`active:false → wait → remove`), se algo mudar (ex: o listener de clientes dispara ao remover sessions/<id>), o sync pode escrever `active:true` em paralelo e sobreviver à remoção, criando uma "sessão fantasma" no histórico.

**Solução**: `var archivingRef = useRef(false);` declarado junto dos outros refs. Sync useEffect: `if (!sessionId || archivingRef.current) return;`. `endSessionArchive` põe a true antes do archive; `resetToSetup` põe a false no início.

### Comparação estrutural em `setConnectedClients`
**Porquê**: heartbeats (cada 15s) atualizam `lastSeen` em `clients/<n>`, disparando o listener. Se `setConnectedClients(data)` corre em cada heartbeat, o React re-renderiza e o sync useEffect re-escreve `gameState`. Com 18 clientes = ~1 re-render/segundo.

**Solução**: já feita por `SessionCore.subscribeClients`. `onLastSeen` actualiza um ref (sem render); `onStructural` só dispara quando há mudança real.

### Modais inline vs `h(Component)`
**Porquê**: chamar `h(NewRoundModal, null)` quando `NewRoundModal` é definido dentro de `App()` faz o React tratar a função como componente. Cada render gera nova referência → React desmonta + remonta → animação `slide-in` reactiva e scroll perde-se.

**Solução**: chamar como função pura: `showNewRound && NewRoundModal()`. Os elementos são inlinados no render do App e React reconcilia-os estavelmente.

### Defensive merge no `onGameState` (Diamant)
**Porquê**: em casos de race ou snapshot truncado, `data.savedScores` pode chegar vazio temporariamente; aceitar isto cega o cliente.

**Solução**: no callback `onGameState`, usar `setGameData(prev => ...)` e fazer fallback aos valores anteriores se vierem vazios inesperadamente.

### Valores `undefined` em `fm.set` (Firebase) — sempre usar fallback
**Porquê**: Firebase RTDB trata `{}` (objeto vazio) como `null` — ao ler de volta, campos inicializados com `{}` (ex: `scores: {}`) aparecem como `undefined` se nunca foram escritos com dados reais. `fm.set` rejeita `undefined` com erro "Database.set failed: First argument contains undefined in property '...'". Este erro é apanhado pelo `try/catch` de `archiveSession`, que devolve `{ok: false}` — se o caller não verificar `res.ok`, o erro é completamente silencioso e a sessão não é arquivada.

**Solução**: ao construir o payload de arquivo, usar sempre fallback nos campos numéricos e de objeto:
```javascript
var history = {
    round:  gameData ? (gameData.round  || 0)  : 0,
    scores: gameData ? (gameData.scores || {}) : {}
};
```
E verificar `res.ok` após `archiveSession` em TODOS os pontos de chamada:
```javascript
var res = await SessionCore.archiveSession({ ... });
if (!res.ok) { alert('Erro ao arquivar: ' + (res.error && res.error.message || res.error)); setClosing(false); return; }
```

### React-sem-JSX
Todas as apps usam `var h = React.createElement;`. Sem build step. Listas de elementos passam-se como rest args ou arrays com `key`:
```javascript
h('div', { className: '...' },
    h('span', null, 'A'),
    cond && h('span', null, 'B'),
    items.map(function(it) { return h('div', { key: it.id }, it.name); })
)
```

---

## 🖥️ Padrão Opcional: Master Dual-Mode (Consola/Público)

Para jogos com um ecrã de projetor/placar partilhado (ex: Mega Just One), o
`master-X.html` pode oferecer dois modos por dispositivo em vez de uma única UI.
Referência completa: `master-justone.html`. Ao adicionar este padrão a um novo jogo:

- **`masterMode`** (`null|'console'|'public'`), persistido em storage com a chave
  `'<jogo>MasterMode'`. `masterMode` é local ao dispositivo — NUNCA sincronizado
  via Firebase. Override via `?mode=console|public`; entrada direta
  `?mode=public&session=CODE` salta o ecrã de setup. Botão "Trocar modo" no header
  de ambos os modos limpa o estado e volta ao ecrã de escolha de modo.
  - **`localStorage`** (Just One): o modo escolhido persiste entre tabs e sessões —
    recomendado quando o mesmo dispositivo é sempre Consola ou sempre Público.
  - **`sessionStorage`** (Deception): o modo NÃO persiste para novos tabs — ao
    abrir um segundo tab (ex: o projetor no PC enquanto a Consola fica no
    telemóvel), esse tab começa do ecrã de escolha sem configuração extra.
    Usar `sessionStorage` quando fizer sentido cada tab escolher o seu próprio modo.
- **`publicState`**: nó Firebase próprio, projeção sanitizada escrita SÓ pela
  Consola (mesmo `useEffect` debounced 200ms que o `gameState`). É o nó principal
  que o modo Público subscreve — nunca subscreve nós com dados sensíveis (no Just
  One: `secret`, `justoneClues`, `justoneDifficultyChoice`, `justoneStats`).
- **`clients` (presença)**: o modo Público pode também subscrever
  `sessions/{id}/clients` para mostrar mesas novas de imediato (só campos não
  sensíveis — `teamName`/`tableNumber`/`connectedAt`/`lastSeen` —, nunca dados de
  jogo).
- **`teamLabel(table)`**: helper local (replicar a função, não está em `shared/` —
  promover para `shared/` só se um 3º jogo precisar) que formata "Nome (Mesa N)" /
  "Mesa N" via `T('table_n', {n: table.id})`; usar sempre que se mostra o nome de
  uma equipa, para o nº de mesa estar sempre visível.
- **Faixa de equipas sempre visível**: no modo Público, mostrar uma faixa/grid com
  `teamLabel(table)` de todas as mesas conectadas, sem pontos — sempre visível,
  independentemente da fase. Destacar (cor/escala) a equipa em destaque na ronda
  atual (ex: quem está a jogar), para quem vê o projetor saber sempre quem está em
  ação.
- **Visibilidade de pontos no Público**: se o jogo tiver razões para esconder
  pontuações do público (ex: suspense), um toggle `publicShowScores` na Consola
  (persistido em `gameState`/`publicState`) controla o placar do modo Público.
  Quando ativo, mostrar o placar como **modal sobreposto** (mesmo padrão visual do
  ranking da Consola — backdrop `bg-black bg-opacity-70` + card central com
  medalhas/`teamLabel`/pontos), não inline; o corpo principal (fase, pistas,
  palavra, etc.) mantém-se sempre visível por trás, com tamanho consistente.
- **Temporizador partilhado**: se o jogo tiver uma contagem visível à Consola (ex:
  prazo para submissões), sincronizar o mesmo valor em `publicState` e mostrar a
  contagem também no modo Público.
- **Rótulos do modo Público vs. ecrã de escolha**: o ecrã de escolha de modo pode
  usar um rótulo descritivo (ex: "📺 Público (projetor)"), mas uma vez dentro do
  modo Público o header pode usar um rótulo mais curto (ex: "Projetor") — quem
  opera já sabe em que modo está.
- **QR code**: só no modo Público (projetor), e só com link para o `client-X.html`
  — a Consola não precisa de QR próprio.
- **Consola — layout responsivo para telemóvel**: header em 2 linhas (`flex-wrap`)
  — 1ª linha com identidade do jogo + código de sessão + "Sair", 2ª linha com
  contagem de mesas online + toggles/ações secundárias. Painéis laterais (ex:
  ranking) ficam `hidden lg:flex` por defeito; acesso em ecrãs pequenos via botão na
  barra inferior que abre o modal equivalente (ex: "🏆 Ranking"). Outras ações
  secundárias (ex: "📊 Estatísticas") também podem viver na barra inferior com
  `flex-wrap`, em vez de competirem por espaço no header.

Este padrão é **opcional** — Hitster e Diamant não o usam (um único `master-X.html`
sem escolha de modo). Usar apenas se o jogo tiver um ecrã de projetor partilhado
distinto do dispositivo do anfitrião.

---

## 🎲 Apps Existentes — Resumo Técnico

### Mega Hitster (`master-hitster.html`, `client-hitster.html`, `games/hitster.js`)
Quiz musical. Fases: `waiting → joker_window → answering → reviewing → waiting`.
- Categorias configuráveis (Ano, ±3, Título, Artista, Década, Timeline Duel)
- Joker (duplica pontos, 1/jogo/equipa)
- Modo Cantora (último lugar canta; ganha pelos acertos das outras)
- Timers absolutos (timestamps), clientes derivam countdown localmente
- Regras editáveis em runtime no master, sincronizadas via `gameState.rulesConfig` (array de blocos)
- Categorias também em `gameState.categories` para o cliente mostrar

`ReviewModal` é chamado como `ReviewModal()` (não `h(ReviewModal, null)`) para preservar scrollTop ao tickar checkboxes.

### Diamant / Incan Gold (`master-diamant.html`, `client-diamant.html`)
Adaptação do jogo de tabuleiro. Fases: `waiting_start → expedition → voting → reveal → ...`.
- Distribuição automática de rubis, gestão de reserva e sobras
- Votação secreta "Continuar/Sair" com timeout
- Apostas em equipas
- Pontos provisórios (`discoveredScores`) vs definitivos (`savedScores`) — diferidos até fim de expedição
- Multiplicador automático quando ≥ N equipas
- `sessionLog` rastreia `joined`/`active`/`left` por mesa

### Mega Just One (`master-justone.html`, `client-justone.html`)
Adaptação competitiva (mesa vs. mesa) do "Just One". Fases:
`waiting → choosing_difficulty → clue_giving → reviewing → guessing → reveal →
choosing_difficulty → ...`
- **Master com dois modos por dispositivo** (`masterMode`, localStorage
  `justoneMasterMode`, override `?mode=console|public`, entrada direta
  `?mode=public&session=CODE`): Consola (anfitrião — vê `secret`, controla tudo) e
  Público (projetor — subscreve só `publicState` + presença, nunca `secret`,
  `justoneClues`, `justoneDifficultyChoice` ou `justoneStats`).
- **Separação de nós Firebase**: `gameState` (canal geral via ClientCore — nunca
  contém a palavra secreta, exceto `revealedWord`/`visibleClues` durante `reveal`),
  `secret` (só a palavra — nunca subscrito pelo modo Público nem pelo cliente
  adivinhador), `publicState` (projeção sanitizada escrita pela Consola, único nó
  de dados que o modo Público subscreve), `justoneClues/{tableId}`,
  `justoneDifficultyChoice`, `justoneStats/{roundNumber}`.
- `buildVisibleClues(phase, justoneClues, clueStatus)` gera a projeção partilhada
  `visibleClues` (em `guessing`: só pistas `valid`, sem `status`; em `reveal`:
  todas, com `status`) usada tanto em `gameState` como em `publicState`.
- **QR code só no modo Público**, com link apenas para `client-justone.html`
  (a Consola não tem QR/modal próprio — quem a usa já está dentro da sessão).
- **`publicShowScores`**: placar oculto por defeito no modo Público; toggle na
  Consola (persistido em `gameState`/`publicState`). Quando ativo, o modo Público
  mostra o placar como modal sobreposto (mesmo estilo do ranking da Consola); o
  corpo principal (fase/pistas/palavra) mantém sempre os mesmos tamanhos de texto,
  visível por trás do modal quando este está aberto.
- **`publicClients`**: o modo Público subscreve também `sessions/{id}/clients`
  (só `teamName`/`tableNumber`/presença, nunca dados de jogo) para mesas novas
  aparecerem de imediato no placar, sem esperar pelo próximo `publicState` escrito
  pela Consola.
- **`teamLabel(table)`**: helper (replicada em `master-justone.html` e
  `client-justone.html`) que formata "Nome (Mesa N)" / "Mesa N" via
  `T('table_n', {n: table.id})`; usada em todo o lado em que se mostra o nome de
  uma equipa, para o nº de mesa estar sempre visível.
- **Faixa de equipas e destaque da adivinhadora**: o modo Público mostra sempre
  `teamLabel(table)` de todas as mesas conectadas (sem pontos), com a mesa
  `guesserTableId` em destaque (cor/escala) fora da fase `waiting`. O header do
  modo Público usa o rótulo curto "Projetor" (`m_j_mode_projector_label`), distinto
  do rótulo descritivo "📺 Público (projetor)" (`m_j_mode_public_label`) usado só no
  ecrã de escolha de modo. Quando `clueDeadline` está definido, a contagem
  decrescente também é mostrada no modo Público.
- Pool de palavras em `games/justone-words-pt.txt` / `-en.txt`, cada um dividido em
  3 níveis (easy/medium/hard via marcadores `# --- Fácil/Médio/Difícil ---` ou
  `Easy/Medium/Hard`); seletor "Idioma da lista de palavras" (`wordPoolLang`)
  independente do idioma da interface; fetch + fallback embutido por idioma/nível
  (`EMBEDDED_FALLBACK_WORDS`) + localStorage editável no setup (uma chave por
  idioma — `justoneWordPool_pt`/`_en`). Sem reciclagem: `drawSecretWord` devolve
  `null` quando um nível esgota (UI desativa esse nível e avisa se todos esgotarem).
- Ronda: 1 mesa "adivinha" (round-robin por `id`); no início da ronda essa mesa
  escolhe a dificuldade (Fácil/Médio/Difícil) — via cliente
  (`justoneDifficultyChoice`) ou fallback do master — antes de a palavra secreta ser
  sorteada desse nível; as outras mesas submetem 1 pista cada
  (`sessions/{id}/justoneClues/{tableId}`), opcionalmente limitado por um timer
  (`timerSeconds`/`clueDeadline` — bloqueia o input, não muda a fase).
- Master valida pistas (`clueStatus`), com pré-deteção de duplicados
  (`detectDuplicateClues` — normaliza acentos/maiúsculas).
- Pontuação configurável por dificuldade (`scoringConfig`, persistido em
  `localStorage['justoneScoringConfig']`; defeitos Fácil +2/Médio +3/Difícil +5 para
  o guesser, +1 por pista válida em todos os níveis, penalização por erro -1 em
  todos os níveis mas configurável por nível, floor 0). "Passar" = ninguém pontua
  (`guessResult: 'passed'`).
- `tables[].timesGuessed` conta quantas vezes cada mesa já foi a equipa
  adivinhadora; `isLapComplete`/`getCompletedLaps` detetam "voltas completas" —
  arquivar/encerrar sessão só fica disponível nesse momento ("Pausar Sessão" não
  tem essa restrição).
- `justoneStats/{roundNumber}` regista cada ronda concluída (dificuldade,
  resultado, pistas válidas/anuladas, nº de mesas); painel "Estatísticas" (só modo
  Consola) agrega por dificuldade ao vivo e exporta CSV/JSON.
- `revealAll` controla visibilidade pós-resolução.
- **Consola responsiva**: header em 2 linhas (`flex-wrap`) — identidade do jogo +
  código de sessão + "Sair" / contagem de mesas online + toggles (`showScores`,
  `publicShowScores`, "Trocar modo"); painel de ranking lateral `hidden lg:flex`
  (acesso completo em telemóvel via botão "🏆 Ranking" na barra inferior, que abre o
  `LeaderboardModal`); "📊 Estatísticas" também passou para a barra inferior — evita
  scroll horizontal em ecrãs pequenos.
- Sem `games/justone*.js` em runtime — tudo inline, como o Diamant standalone
  (`games/diamant.js` pertence ao motor antigo `master.html`/`client.html`, não ao
  standalone).

### Deception Murder in Hong Kong (`master-deception.html`, `client-deception.html`)
Jogo de papéis secretos inspirado no Deception: Murder in HK. Fases: `waiting → running`.
- **Setup**: cada mesa escolhe uma carta azul e uma carta vermelha (inputs de texto, guardados em Firebase + localStorage)
- **Distribuição de papéis** (master): aleatória; sequência por nº de mesas — `assassino` (sempre), `cumplice` (N≥3), `testemunha` (N≥4), resto `investigador`/`detetive`. `secretInfo` por papel:
  - `assassino`: `{ blueCard, redCard }` (as suas próprias cartas, como confirmação)
  - `cumplice`: `{ assassinTable, assassinTeamName, blueCard, redCard }` (identidade + cartas do assassino)
  - `testemunha`: `{ involvedTables: [nomeA, nomeB] }` (duas equipas em ordem aleatória — não sabe qual é qual)
  - `investigador`/`detetive`: `{}`
- **Running**: cada cliente vê o seu papel + secretInfo; botão de acusação (uso único, bloqueado após envio, reposto pelo master individualmente ou em bloco)
- **Master**: vê papel de cada mesa; cartas visíveis **apenas** da mesa assassina; painel de acusações com "Acusação correta (+N pts)" e "Repor botão"; pontuação acumula entre rondas; "Nova ronda" limpa papéis+acusações mas mantém scores; "Confirmar vitória assassino+cúmplice" atribui roleVictoryPoints a ambos
- **Dual-Mode (Consola/Projeção)**: usa `sessionStorage['decMasterMode']` (não localStorage — permite que cada novo tab mostre o ecrã de escolha de modo, útil para abrir o projetor num segundo dispositivo sem configuração extra). Override via `?mode=console|public`; entrada directa `?mode=public&session=CODE` salta o setup. Modo Projeção mostra ranking via `publicState`. QR code só no modo Projeção.
- **Arquivo**: usa `archiveSession` com `attachClientsField` enricher. CloseModal com 3 opções: "📦 Sair e arquivar" / "🚪 Sair sem arquivar" / "Cancelar". HistoryModal com painel expansível por sessão (ranking com teamName+emails por nº de mesa), reabertura e eliminação de entradas.
- Firebase: `gameState.roles[tableNumber]={role,secretInfo}`, `gameState.accusations[tableNumber]={tableNumber,teamName,timestamp}`, `gameState.scores[tableNumber]=number`, `gameState.usedAccusations[tableNumber]=true`; `publicState={phase,round,scores,roundResult,timestamp}` (escrito pela Consola, lido só pelo modo Projeção)
- Sem `games/deception-*.js` em runtime — tudo inline nos HTMLs; ficheiros `games/deception-*.js` são artefactos da implementação inicial (ignorar)
- Cor de identidade: **rose** (🔪)

### Contador Genérico (`master.html` + `client.html` + `games/generic.js`)
Sistema modular legacy. Buzzers, +1/-1/+5, respostas de texto, leaderboard. Não usa shared cores.

---

## 🚀 Como Adicionar um Novo Jogo

Padrão recomendado: **standalone** (par `master-X.html` + `client-X.html`), usando os shared cores.

Se o jogo tiver um ecrã de projetor/placar partilhado distinto do dispositivo do
anfitrião, considerar o padrão **Master Dual-Mode (Consola/Público)** descrito na
secção anterior, usando `master-justone.html` como referência.

### Esqueleto do cliente (essencial)

```html
<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Jogo - Cliente</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="shared/firebase-config.js"></script>
  <script src="shared/client-core.js"></script>
</head><body>
  <div id="root"></div>
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
    import { getDatabase, ref, onValue, set, remove, get, update, goOffline, goOnline } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
    const app = initializeApp(window.FirebaseConfig);
    window.rtdb = getDatabase(app);
    window.fbModules = { ref, onValue, set, remove, get, update, goOffline, goOnline };
    window.dispatchEvent(new Event('firebaseReady'));
  </script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>
    window.addEventListener('firebaseReady', function() {
      var localStore = ClientCore.createLocalStore('meujogo');
      var CLIENT_ID  = ClientCore.getClientId('meujogo_clientId');
      // ... App() com handleConnect → ClientCore.joinSession,
      //     useEffect connectClient, useEffect listeners game-específicos.
    });
  </script>
</body></html>
```

### Esqueleto do master

Carregar `shared/firebase-config.js` + `shared/session-core.js`. Usar:
- `subscribeActiveSessions` no setup
- `subscribeSessionHistory` no histórico
- `subscribeClients` (com `onLastSeen` num ref) no jogo
- `archiveSession` com enricher apropriado nos 3 fluxos (terminar, criar nova sobre activa, fechar sem abrir); verificar **sempre** `res.ok` em cada chamada e mostrar alerta se `!res.ok`
- `archivingRef` para o sync useEffect
- Campos numéricos e de objeto em `history` com fallback `|| 0` / `|| {}` (ver padrão "Valores undefined")

### Adicionar URL pública
Em `shared/firebase-config.js`, adicionar ao `AppConfig`:
```javascript
CLIENT_MEUJOGO_URL: 'https://alpces.github.io/score/client-meujogo.html',
MASTER_MEUJOGO_URL: 'https://alpces.github.io/score/master-meujogo.html',
```

### Atualizar as landing pages (obrigatório)
**Sempre** que um novo jogo for adicionado, atualizar **ambas** as landing pages:

- **`jogar.html`** — adicionar card para `client-meujogo.html` na grelha `<main>`
- **`masters.html`** — adicionar card para `master-meujogo.html` na grelha `<main>`

Seguir o padrão visual dos cards existentes (ícone 6xl, título `font-black`, descrição `text-slate-300 flex-1`, botão com cor própria do jogo). Cada jogo deve ter uma cor distinta:

| Jogo | Cor |
|---|---|
| Mega Hitster | violet |
| Mega Diamant | amber |
| Mega Just One | teal |
| Mega Concept | sky |
| Deception Murder | rose |
| (novos jogos) | escolher cor que não conflitua com os anteriores |

### Escolher um enricher
- Tables são vistas do cliente (com emails como atributo) → `enrichers.mergeEmailsIntoTables`
- Tables têm vida própria + queres preservar dados raw dos clientes → `enrichers.attachClientsField`
- Outro padrão → escrever um custom inline

---

## 🎨 Princípios de UI

| Contexto | Cores principais |
|---|---|
| Genérico / Diamant | purple-600, indigo-600, green-500, red-500 |
| Mega Hitster | violet-900, purple-900, indigo-900 (fundo); yellow-500 (joker); violet-400/600 (pontos) |
| Mega Just One | teal-900, cyan-900 (fundo); teal-600/teal-400 (ações, pontos, destaques) |
| Deception Murder | slate-950 (fundo); rose-600 (acusação); blue-500/rose-500 (cartas azul/vermelha); cor por papel: rose=assassino, orange=cúmplice, yellow=testemunha, blue=investigador, purple=detetive |

- **Botões**: `rounded-lg`, `font-bold`, `active:scale-95 transition-all`
- **Cards**: `bg-white rounded-2xl shadow-2xl p-4` (claros) / `bg-slate-800 rounded-xl border` (escuros)
- **Modais**: backdrop `bg-black bg-opacity-70 fixed inset-0`, fecho ao clicar fora, animação `slide-in` no card interno
- **Modais com lista possivelmente longa**: card com `max-h-[90vh] flex flex-col`; lista com `overflow-y-auto flex-1`

---

## ⚠️ Regras e Notas

1. **`game-system.js`** é o core do sistema modular legacy. **Não modificar.**
2. **Apps standalone** são auto-contidas; não dependem de `game-system.js`.
3. **Firebase**: sempre incluir `gameType`, `timestamp`, `active` no `gameState`.
4. **Logos**: `logo1.png`–`logo4.png` existem; o código carrega até 5 com fallback (`onerror`).
5. **Retrocompatibilidade**: sessões e arquivos existentes devem continuar a funcionar após mudanças. Não remover campos de Firebase sem migração.
6. **Modais persistentes** (NewRoundModal, ReviewModal): chamar como função `Modal()`, não `h(Modal, null)`. Ver secção de padrões defensivos.
7. **Testes**: não há suite automatizada. Validar manualmente em browser e em GitHub Pages após push (preview ≠ produção em alguns casos de cache).
8. **Língua**: PT-PT em UI, comentários e mensagens de erro. Inglês em nomes de funções e variáveis.
9. **Commits e push**: fazer sempre commit + push automáticos após qualquer alteração de código pedida, sem necessidade de pedir confirmação. Mensagens em PT, formato Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`, ...). Co-Author: `Claude Sonnet 4.6 <noreply@anthropic.com>`.
10. **Landing pages**: sempre que um novo jogo for adicionado ou removido, atualizar `jogar.html` e `masters.html` no mesmo commit, sem esperar instruções explícitas para o fazer.

---

## 📝 Template de Prompt

```
## Projeto
Sistema de Pontuação — github.com/alpces/score (live: alpces.github.io/score)

## Contexto
Lê CLAUDE_CONTEXT.md primeiro.

## Ficheiros relevantes
[ex: client-hitster.html, shared/client-core.js]

## O que quero
[descrever]

## Comportamento esperado
[detalhar]
```

---

## 👥 Contribuidores

- **ALPCeS - Ludonautas** — desenvolvimento, design, regras
- **Claude (Anthropic)** — assistência de código
- https://ludonautas.pt
