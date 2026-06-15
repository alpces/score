# 📋 Development Log

Registo de desenvolvimento do Sistema de Pontuação Modular.

---

## 🤫 Mega Just One (Junho 2026)

Novo jogo standalone, adaptação competitiva (mesa vs. mesa) do "Just One". Decisões
de arquitetura específicas, para referência futura:

- **Separação `gameState`/`secret`/`publicState` como garantia de segurança por
  desenho**: o modo Público (projetor) e o cliente da mesa adivinhadora nunca
  chegam a fazer `onValue` no nó `secret` — não é apenas ocultação na UI, a palavra
  nunca existe na memória dessas instâncias, mesmo com bug de render ou ecrã
  espelhado. `publicState` é uma projeção sanitizada escrita só pela Consola
  (debounced 200ms, mesmo padrão de `gameState`).
- **`buildVisibleClues(phase, justoneClues, clueStatus)`** como projeção
  partilhada entre `gameState.visibleClues` e `publicState.visibleClues` — evita
  duplicar, em dois sítios, a lógica de "que pistas são visíveis em cada fase"
  (`guessing`: só `valid`, sem `status`; `reveal`: todas, com `status`).
- **Dois ficheiros de pool de palavras (PT/EN)** com seletor de idioma
  independente do idioma da interface, e drenagem sem reciclagem por nível de
  dificuldade (`drawSecretWord` devolve `null` quando um nível esgota; a UI
  desativa esse nível em vez de reciclar silenciosamente).
- **`tables[].timesGuessed`/"voltas completas"** (`isLapComplete`/
  `getCompletedLaps`) como mecanismo de paridade entre equipas para condicionar o
  fim de sessão — "Pausar Sessão" fica isento desta restrição.
- **Escolha de modo por dispositivo** (`masterMode`, localStorage
  `justoneMasterMode`, override `?mode=console|public`, entrada direta
  `?mode=public&session=CODE`) permite Consola+Público em simultâneo (PC +
  telemóvel, ou 2 ecrãs) sem coordenação extra.

### Ajustes pós-lançamento (2026-06-15)

- **`publicClients`**: o modo Público passou a subscrever também
  `sessions/{id}/clients` (só `teamName`/`tableNumber`/presença) para mesas novas
  aparecerem de imediato no placar — sem esta subscrição, o placar do projetor só
  refletia novas mesas no próximo `publicState` escrito pela Consola.
- **`publicShowScores`**: toggle na Consola (persistido em
  `gameState`/`publicState`) que esconde o placar no modo Público por defeito;
  quando oculto, o corpo do projetor usa tamanhos de texto maiores para pistas e
  revelação.
- **QR code restrito ao modo Público**, com link só para `client-justone.html` —
  a Consola não precisa de QR próprio.
- **`teamLabel(table)`**: helper que formata "Nome (Mesa N)" / "Mesa N", aplicada
  de forma consistente em todo o master e cliente.

Estes quatro pontos (escolha de modo, `publicState`, `publicClients`/presença,
`teamLabel`, QR só no Público) foram generalizados como padrão **Master Dual-Mode
(Consola/Público)** em `CLAUDE_CONTEXT.md`, para reutilização por jogos futuros com
ecrã de projetor.

---

## 🧱 Refactor — Extracção dos Shared Cores (Maio 2026)

Migração da infraestrutura repetida em todos os jogos para dois ficheiros partilhados em `shared/`. Trabalho feito em fases incrementais, cada uma validada manualmente antes de avançar.

### Phase 1 — Cliente (client-core.js)

**1.1** — Helpers puros: `getClientId`, `withTimeout`, `createLocalStore`, `computeConnState`. Migração trivial em `client-hitster.html`. Mesmas chaves de localStorage para preservar sessões existentes.

**1.2** — `connectClient({rtdb, fm, sessionCode, tableNumber, ...})` → `{disconnect, forceRefresh}`. Encapsula listener de gameState, listener de `clients/<n>` para deteção de remoção, `.info/connected`, eventos `visibilitychange`/`focus`/`pageshow`/`online` (com `goOnline` + `forceRefresh` + `onResume`), heartbeat periódico. Eliminou 3 useEffects + 3 refs no `client-hitster`.

**1.3** — `attachWakeLock`, `joinSession` (com deteção de colisão de clientId via leitura única de `clients/<n>`), `submitWithVerify` (3 retries + verify-after-write). `handleConnect` e `submitText` ficam reduzidos a wiring.

**Cumulativo**: `client-hitster.html` passa de 807 para 627 linhas (-22%).

### Phase 2 — Master (session-core.js)

`subscribeActiveSessions`, `subscribeSessionHistory`, `subscribeClients` (com separação `onLastSeen`/`onStructural` para evitar re-renders por heartbeat), `readGameStateOnce`, `readClientsOnce`, `archiveSession`. Versão inicial do `archiveSession` fazia merge de emails nas tables (padrão Hitster).

### Phase 3 — Migração do Diamant

Validação da abstracção. Apenas uma generalização foi necessária: `archiveSession` deixou de ter o merge de emails hard-coded e passou a aceitar um callback `enrich(history, clients)`. Adicionados dois enrichers prontos: `mergeEmailsIntoTables` (Hitster) e `attachClientsField` (Diamant).

`client-diamant.html` ganha features que não tinha: clientId persistente, heartbeat, forceRefresh em background-resume, `.info/connected`, wake lock. `master-diamant.html` ganha optimização anti-flicker do listener de clientes e `archivingRef` (corrige bug de "sessão fantasma" ao arquivar).

### Resultado final

| Ficheiro | Antes | Depois | Δ |
|---|---|---|---|
| `client-hitster.html`  | 807  | 627  | -22% |
| `master-hitster.html`  | 1490 | 1410 | -5%  |
| `client-diamant.html`  | 710  | 672  | -5%  |
| `master-diamant.html`  | 1164 | 1140 | -2%  |
| `shared/client-core.js`  | —    | 474  | (novo) |
| `shared/session-core.js` | —    | 293  | (novo) |

Linhas no master diminuem pouco em valor absoluto, mas a complexidade concentra-se nos cores (testáveis isoladamente, partilhados entre jogos). Adicionar um novo jogo passa a exigir essencialmente UI + lógica game-específica.

---

## 🎯 Módulo: Diamant / Incan Gold

### v3.1.0 - 2026-04-04
**Versão inicial do Diamant**

#### ✅ Implementado
- Setup com código de sessão personalizável
- Configuração de número de mesas (2-16)
- Nomes de equipas opcionais
- Seleção de logotipos
- Cartas de rubis com divisão automática
- Cartas de perigo (normal ou repetido)
- Reserva de rubis (sobras das divisões)
- Votação secreta continuar/sair
- Confirmação antes de sair (cliente)
- Timeout de votação (10 segundos)
- Revelação de votos
- Pontos provisórios vs definitivos
- Estado "no acampamento" para quem saiu
- Auto-reconexão do cliente (localStorage)
- QR Code para entrada rápida
- Leaderboard com revelação progressiva
- Toggle mostrar/ocultar provisórios no master

#### 🔜 Por Implementar (Futuras Iterações)

**Prioridade Alta:**
- [ ] Artefactos (estatuetas) - só recolhidos se 1 pessoa sair sozinha
- [ ] Valores dos artefactos: 5, 7, 8, 10, 12 pontos
- [ ] UI de artefacto no master (botão "🗿 Artefacto")
- [ ] Indicador visual de artefacto disponível no cliente

**Prioridade Média:**
- [ ] Tracking de tipos de perigo (cobra, aranha, fogo, múmia, pedras)
- [ ] Indicador visual de perigos já saídos
- [ ] Aviso quando perigo está prestes a repetir
- [ ] Histórico de sessões (guardar/carregar)
- [ ] Som de carta virada
- [ ] Som de perigo

**Prioridade Baixa:**
- [ ] Animação de rubis a dividir
- [ ] Animação de perigo
- [ ] Tema visual alternativo (noite/dia)
- [ ] Modo espectador (só ver, sem votar)

#### 🐛 Bugs Conhecidos
- (nenhum reportado ainda)

#### 📝 Notas Técnicas
- Votos guardados em `sessions/{id}/diamantVotes/{tableId}`
- Não usa o módulo games/diamant.js (app standalone)
- Firebase paths: gameState, clients, diamantVotes

---

## 🎯 Módulo: Contador Genérico

### v3.0.0 - 2026-04-04
**Arquitetura modular**

#### ✅ Implementado
- Sistema de módulos (games/*.js)
- gameType em todos os estados Firebase
- Compatibilidade retroativa

### v2.2.0 - 2026-02-12
- Persistência de sessão no cliente
- Bloqueio/desbloqueio de buzzers
- Logotipos no cliente
- Animações intensas nos botões

### v2.1.0 - 2026-02-09
- Modal "Terminar Sessão"
- Gestão de sessões abertas/arquivadas

### v2.0.0 - 2026-01-10
- Sistema de respostas de texto
- Temporizador configurável

### v1.0.0 - 2025-12-15
- Versão inicial
- Buzzers, pontuação, categorias, QR Code

---

## 📁 Estrutura de Ficheiros

```
score/
├── master.html              # Genérico - Master
├── client.html              # Genérico - Cliente
├── master-diamant.html      # Diamant - Master
├── client-diamant.html      # Diamant - Cliente
├── games/
│   ├── game-interface.js    # Interface base
│   ├── game-system.js       # Gestor de módulos
│   ├── generic.js           # Módulo genérico
│   └── diamant.js           # Módulo diamant (referência)
├── shared/
│   └── firebase-config.js
├── logo1.png ... logo5.png  # Logotipos
├── README.md
├── CHANGELOG.md
├── CLAUDE_CONTEXT.md        # Contexto para Claude AI
└── DEVELOPMENT_LOG.md       # Este ficheiro
```

---

## 🔧 Como Adicionar Entradas

Quando fizeres alterações, adiciona uma entrada assim:

```markdown
### vX.X.X - YYYY-MM-DD
**Título breve**

#### ✅ Implementado
- Feature 1
- Feature 2

#### 🐛 Corrigido
- Bug 1

#### 📝 Notas
- Notas técnicas relevantes
```

---

## 🤖 Template para Nova Conversa com Claude

```
## Projeto
Sistema de Pontuação Modular - https://github.com/alpces/score

## Módulo
Diamant (master-diamant.html, client-diamant.html)

## Última versão
v3.1.0 - Ver DEVELOPMENT_LOG.md para estado atual

## O que quero fazer
[DESCREVER AQUI]

## Código relevante (se aplicável)
[COLAR CÓDIGO]
```

---

## 👥 Contribuidores

- **ALPCeS - Ludonautas** - Desenvolvimento e design
- **Claude AI** - Assistência de código

---

*Última atualização: 2026-04-04*
