# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste ficheiro.

---

## [Mega Just One — Ajustes] - 2026-06-15

### Corrigido
- **Placar do modo Público não atualizava com novas mesas**: nova subscrição a
  `sessions/{id}/clients` (só `teamName`/`tableNumber`/presença) faz mesas novas
  aparecerem de imediato no projetor, sem esperar pelo próximo `publicState`.
- Texto duplicado no botão "Ver Pistas" da Consola.

### Alterado
- **QR code passa a existir só no modo Público**, com link apenas para
  `client-justone.html` (a Consola deixou de ter QR/modal próprios).
- **Pontuações ocultas por defeito no modo Público** (`publicShowScores`, toggle
  na Consola); corpo do projetor redesenhado para mostrar a equipa adivinhadora,
  fase, pistas e revelação em destaque quando os pontos estão ocultos.
- **`teamLabel(table)`**: nova helper que formata "Nome (Mesa N)" / "Mesa N",
  aplicada de forma consistente no master e no cliente.
- `jogar.html` deixa de ter link de volta para `masters.html` (cross-hub-link
  volta a ser de sentido único, masters → jogar).
- Dica de escolha de dificuldade (`j_choose_difficulty_hint`) reformulada em
  PT/EN.

---

## [Mega Just One] - 2026-06

### Adicionado
- **Novo jogo standalone "Mega Just One"** (`master-justone.html` +
  `client-justone.html`): adaptação competitiva mesa-vs-mesa do jogo de tabuleiro
  "Just One" — fases `waiting → choosing_difficulty → clue_giving → reviewing →
  guessing → reveal → choosing_difficulty → ...`.
- **Dois modos de master por dispositivo** (Consola/Público), com subscrições
  Firebase separadas por desenho de segurança: o modo Público e o cliente
  adivinhador nunca subscrevem o nó `secret` da palavra, `justoneClues`,
  `justoneDifficultyChoice` ou `justoneStats`.
- **Pools de palavras PT/EN** (`games/justone-words-pt.txt`/`-en.txt`), por
  dificuldade (Fácil/Médio/Difícil), com seletor de idioma independente da
  interface, fallback embutido e sem reciclagem de palavras já usadas.
- **Pontuação "Risco Proporcional" configurável por dificuldade**: pontos por
  acerto (defeito +2/+3/+5), bónus por pista válida (+1) e penalização por erro
  (defeito -1 em todos os níveis, configurável), com floor em 0.
- **Timer opcional para submissão de pistas** (`timerSeconds`/`clueDeadline`):
  bloqueia o input dos clientes ao esgotar, sem alterar a fase automaticamente.
- **Contador de voltas (`timesGuessed`)**: arquivar/encerrar sessão só disponível
  no fim de uma volta completa ("Pausar Sessão" continua sempre disponível).
- **Painel de Estatísticas** (modo Consola): agregação ao vivo por dificuldade +
  export CSV/JSON.
- Novo cartão "Mega Just One" (teal) em `masters.html`/`jogar.html`.
- `RULES-JUSTONE.md` — regras completas em PT-PT.

---

## [Refactor — Shared Cores] - 2026-05

Extração da infraestrutura partilhada para dois ficheiros em `shared/`, validada migrando Hitster e Diamant. Mais detalhe técnico em `DEVELOPMENT_LOG.md`.

### Adicionado
- **`shared/client-core.js`** (`window.ClientCore`): `getClientId`, `withTimeout`, `createLocalStore`, `computeConnState`, `connectClient`, `attachWakeLock`, `joinSession`, `submitWithVerify`.
- **`shared/session-core.js`** (`window.SessionCore`): `subscribeActiveSessions`, `subscribeSessionHistory`, `subscribeClients`, `readGameStateOnce`, `readClientsOnce`, `archiveSession`, `enrichers.{mergeEmailsIntoTables, attachClientsField}`.
- **Resiliência adicional no Diamant**: clientes ganham UUID persistente (deteção de colisão), heartbeat, forceRefresh em background-resume, `.info/connected`, wake lock — features que não tinha.

### Alterado
- **client-hitster.html**: 807 → 627 linhas (-22%). connectClient/joinSession/submitWithVerify/attachWakeLock substituem implementações inline.
- **master-hitster.html**: lifecycle de sessão delegado ao SessionCore (active sessions, history, clients listener, archive flow).
- **client-diamant.html**: 710 → 672 linhas. Migrado para usar ClientCore.
- **master-diamant.html**: 1164 → 1140 linhas. Migrado para usar SessionCore. Adicionado `archivingRef` (mesmo padrão do Hitster) para bloquear o sync useEffect durante o arquivo.

### Corrigido
- **Sessão fantasma no Diamant ao arquivar** (motivado pela migração): sem `archivingRef`, a remoção dos clientes ao apagar `sessions/<id>` disparava `subscribeClients`, gerando setStates → re-render → sync useEffect → re-escrita de `gameState` com `active:true`. Histórico mostrava entrada arquivada + entrada activa fantasma.
- **Flicker do modal de nova ronda no Hitster**: `showNewRound && h(NewRoundModal, null)` tratava a função local como componente; nova referência por render → desmontar+remontar → animação `slide-in` reactivava cada `presenceTick` (5s). Corrigido para `NewRoundModal()` (mesmo padrão usado no `ReviewModal`).
- **Re-renders desnecessários por heartbeat**: `subscribeClients.onLastSeen` actualiza um ref (sem re-render); `onStructural` só dispara quando há mudança real. Com 18 clientes, eliminou ~1 re-render/segundo no master.
- **Scroll bloqueado no popup de info de sessão Hitster**: card com `max-h-[90vh] flex flex-col`, lista com `overflow-y-auto flex-1`.

### Removido
- **Código morto no master-hitster**: `catsLoadedRef`, `jokerTimeRef` + useEffect, state `jokerPresses` (set, nunca lido).
- **Código morto no client-hitster**: `showScores` derivado mas nunca usado.
- **Import morto no master-diamant**: Firestore (`getFirestore`, `collection`, etc.) — nunca usado.

---

## [Diamant v2.6] - 2026-04-07

### Módulo Diamant - Auto-reconnect, Apostas Amount-based, Detalhes de Sessão

### Adicionado
- **Auto-reconnect no refresh**: Se URL = sessão guardada, reconecta automaticamente sem mostrar login
- **Expiração 12h**: Sessão local expira após 12 horas (diamant_ts), evitando conflitos com sessões antigas
- **clearLocal() helper**: Função centralizada para limpar todos os dados de sessão do localStorage
- **Detalhes de sessão**: Botão ℹ️ em cada sessão (ativa ou arquivada) abre popup com tabela de equipas, pontuações (Guardados + Descobertos) e emails
- **Clients guardados no arquivo**: Ao arquivar sessão, dados completos dos clientes (nome, mesa, emails) são preservados

### Alterado
- **Sistema de apostas**: Aposta apenas em quem vai SAIR (removido "Fica"). Quantidade: 1-5 rubis dos descobertos. Acertou = dobro, falhou = perde o apostado
- **Botão "?"**: Fundo azul com brilho suave (bg-blue-500 shadow-blue-500/50)
- **Guardados ocultos por defeito no master**: Toggle 👁️/🙈 Guard (removido showDiscovered, agora showSaved)
- **Textos**: Formato "Label: valor" (Exploradores na gruta: X, Rubis deixados para trás: X, Saíram: X, Ficaram: X)
- **Campos sem placeholder**: Nome e email sem texto de exemplo
- **Texto de ajuda apostas**: Regras actualizadas para sistema amount-based

### Removido
- **betPrediction**: Estado completamente removido (apostas são sempre "sai")
- **showDiscovered**: Redundante (descobertos sempre visíveis)
- **Confirmação de voto**: Removida em versão anterior, confirmado limpo

### Corrigido
- **revealedBets(null)**: Agora limpo em TODOS os caminhos de reset (startExpedition, drawCard, prepareNewExpedition, closePopup)
- **Audit**: Zero código morto, parêntesis/chaves balanceados, variáveis limpas

---

## [Diamant v2.5] - 2026-04-07

### Módulo Diamant - Sistema de Apostas e Melhorias UX

### Adicionado
- **Apostas para equipas que já saíram**: Durante a votação, equipas no acampamento podem apostar 1 rubi numa equipa em jogo, prevendo se "Fica" ou "Sai"
- **Payoff**: Acertar "Sai" = +3 rubis, acertar "Fica" = +2 rubis, errar = -1 rubi
- **Alterar aposta**: Possível alterar enquanto o master não revelar
- **Revelação em popup**: Dois tempos — 1) mostra apostas, 2) botão revela decisões com colunas Ficaram/Saíram e apostas coloridas (verde/vermelho) com ganhos
- **Apostas secretas**: Clientes não vêm apostas uns dos outros até à revelação
- **Regras de apostas no player aid (?)** 

### Alterado
- **Pontos descobertos ocultos por defeito** no master
- **Textos de ajuda**: Rubis ("ficam para trás nesta carta"), apostas ("fora da expedição, gastando 1 dos rubis descobertos")
- **Texto rubis no cliente**: "X rubis descobertos" / "X para cada equipa" / "X não recolhidos"
- **Campos sem placeholder**: Nome da equipa e email sem texto de exemplo
- **Popup de revelação profissional**: Apostas na parte superior com nome+mesa, decisões em duas colunas coloridas, info de rubis/artefactos

---

## [Diamant v2.4] - 2026-04-06

### Módulo Diamant - Artefactos e UX Cliente

### Adicionado
- **Cartas de artefacto**: Novo botão "🏺" na fase de exploração com valores pré-definidos (5, 7, 8, 10, 12)
- **Acumulação de artefactos**: O valor acumula enquanto ninguém sair sozinho da expedição
- **Recolha solo**: Quando exactamente 1 equipa sai, recolhe todos os pontos de artefactos acumulados (adicionados aos Descobertos)
- **Artefactos perdidos**: Se perigo repetido ou expedição termina sem recolha solo, artefactos perdem-se
- **Visibilidade**: Valor de artefactos visível no master (barra de info) e no cliente (info da expedição) quando > 0
- **Banners informativos**: Card teal ao revelar artefacto, info de recolha no banner de revelação
- **Player aid (?)**: Botão no header do cliente abre resumo das regras (rubis, saída, artefactos, perigos, pontuação)

### Alterado
- **Nome da equipa obrigatório**: Campo deixou de ser opcional no registo do cliente
- **Email obrigatório**: Campo deixou de ser opcional no registo do cliente
- **Votação sem confirmação**: Botões Continuar/Sair votam com um único toque, sem confirmação — interface limpa e rápida
- **Timer local no cliente**: Contagem decrescente corre localmente no dispositivo em vez de depender do Firebase a cada segundo, eliminando atrasos de rede na visualização do countdown

---

## [Diamant v2.3] - 2026-04-05

### Módulo Diamant - Pontuação Diferida

### Alterado
- **Scoring diferido**: Quando uma equipa sai, Descobertos e Guardados ficam inalterados. Parte da reserva vai para Descobertos. Guardados só atualizam no fim da expedição (todos saem ou perigo repetido)
- **Perigo repetido**: Equipas que já saíram recebem discovered → saved. Equipas na gruta perdem discovered

### Corrigido
- Fix "undefined rubis": campo `value` adicionado ao lastCard
- Removido `effectiveValue` (redundante com `value`) e `pendingSavings`
- `disconnectTable` agora limpa discoveredScores e adiciona a exitedTeams

---

## [Diamant v2.2] - 2026-04-05

### Módulo Diamant - Funcionalidades e Correções

### Adicionado
- **Multiplicador de rubis**: Quando o nº de equipas atinge um limiar (por defeito ≥9), o valor de cada carta de rubis é automaticamente multiplicado (por defeito ×2). Configurável no setup (limiar e fator). No cliente aparece nota divertida sobre a "mega-expedição"
- **Desconectar mesa individual**: Botão ✕ em cada card de mesa no master para desconectar e remover da expedição
- **Prevenção de mesa duplicada**: Cliente não consegue conectar-se com o mesmo nº de mesa já ocupado
- **Lista de equipas em jogo (cliente)**: Botão "ver" ao lado de "X exploradores na gruta" mostra popup com equipas em jogo e as que já saíram
- **Info detalhada de saída**: Banner no master mostra quantos rubis cada equipa que saiu levou dos deixados para trás, e quantos sobram (para o master saber o que deixar no caminho)
- **Reserva mantém-se até Nova Expedição**: Quando todos saem, a reserva (rubis deixados para trás) só é resetada quando o master inicia nova expedição

### Alterado
- **Terminologia master**: "Reserva" → "Rubis deixados para trás" / "Deixados"
- **Cores revelação**: Vermelho forte (bg-red-200 border-red-600) para quem acabou de sair nesta ronda; verde forte para quem ficou; cinza escuro (bg-gray-500) para quem já saiu em rondas anteriores
- **Logotipos no setup**: Fundo cinza escuro (bg-gray-800) para logos legíveis com letras brancas
- **Arquivar sessão**: Marca active:false com 500ms de espera antes de remover, para clientes detectarem e desconectarem graciosamente

### Corrigido
- **Desconexão ao arquivar**: Verificado que o fluxo marca active:false → espera → remove todo o nó sessions/, fazendo com que os clientes detectem e mostrem "Sessão Terminada"

---

## [Diamant v2.1] - 2026-04-05

### Módulo Diamant - Correções e Melhorias

### Corrigido
- **Perigo não mostra info prematura**: Clientes não vêm qualquer informação sobre perigo até o master confirmar que não é repetido (mesmo fluxo que rubis — só após confirmação é que a fase muda para votação)
- **Clientes desconectam ao arquivar**: Quando o master arquiva uma sessão, os clientes conectados são automaticamente desconectados e vêm mensagem "Sessão Terminada"
- **Validação de sessão ativa**: Clientes não conseguem conectar-se a sessões inexistentes ou inativas
- **Cores de revelação mais visíveis**: Verde e vermelho mais carregados (border-green-600/red-600, bg-green-100/red-100) para distinguir melhor quem ficou e quem saiu

### Alterado
- **Terminologia**: "Provisório" → "Descobertos", "Definitivo" → "Guardados" em ambas as apps
- **Terminologia reserva (cliente)**: "rubis na reserva" → "rubis deixados para trás"; sobras da divisão → "não recolhidos"
- **Equipas que já saíram**: Mesas que desistiram em rondas anteriores aparecem em cinza escuro (bg-gray-400) em vez do cinza claro normal

### Adicionado
- **Mesas dinâmicas**: Sem necessidade de definir nº de mesas no setup — equipas registam-se automaticamente quando os clientes se conectam
- **Botão revelar condicionado**: Só aparece quando todos os jogadores votaram OU quando o timeout expira
- **Timeout expirado**: No master mostra "Tempo esgotado!" + botão revelar; nos clientes a opção de votar desaparece (continuam por defeito)
- **Info da reserva na tile**: Quando há sobras na divisão de rubis, mostra explicitamente quantos rubis devem ser colocados na tile revelada
- **Logotipos**: Logo1 em destaque ao centro do header; restantes logos no rodapé (ambas apps)
- **Ranking progressivo**: Ao abrir, posições do 6º para baixo aparecem logo; depois revela do 5º ao 1º por clique
- **Gestão de sessões completa**: Restaurar/arquivar sessões, diálogo de sessão existente, modal de terminar sessão (Arquivar/Pausar/Cancelar)

---

## [3.0.0] - 2026-04-04

### 🏗️ Arquitetura Modular

Esta versão introduz uma **arquitetura modular** que permite criar diferentes modos de jogo.

### Adicionado
- **Sistema de Módulos de Jogos**
  - `games/game-interface.js` - Interface base para todos os jogos
  - `games/game-system.js` - Sistema de gestão e registo de módulos
  - `games/generic.js` - Módulo do jogo genérico (funcionalidade atual)
  - `shared/firebase-config.js` - Configuração Firebase partilhada

- **Suporte a gameType**
  - Campo `gameType` em todos os estados Firebase
  - Preparado para múltiplos modos de jogo
  - Cliente adapta-se automaticamente ao tipo de jogo

- **Documentação**
  - README.md com guia completo de criação de módulos
  - Exemplo de implementação do Diamant

### Alterado
- Estrutura de pastas reorganizada
- Scripts de módulos carregados no `<head>`

### Notas de Migração
- O sistema é retrocompatível
- Sessões antigas sem `gameType` assumem `'generic'`
- Nenhuma alteração necessária em sessões existentes

---

## [2.2.0] - 2026-02-12

### Adicionado
- **Persistência de sessão no cliente**: Refresh reconecta automaticamente
- **Botão X para desconectar**: Canto superior direito
- **Logotipos no cliente**: Logo principal centrado, patrocinadores em background
- **Bloqueio/Desbloqueio de Buzzers**: Checkbox + botão na barra inferior
- **Animações intensas**: Botões pulsantes para não passarem despercebidos
- **Pontos visíveis por defeito**: Ao criar sessão

### Corrigido
- Bug `setTextSubmitted` → `setTextJustSubmitted`
- Robustez do envio de texto com retry automático

---

## [2.1.0] - 2026-02-09

### Adicionado
- **Modal "Terminar Sessão"**: 3 opções (Arquivar/Pausar/Cancelar)
- **Gestão de Sessões**: Distinção entre abertas e arquivadas
- **Monitorização em tempo real**

### Corrigido
- Sessões fantasma no Firebase
- Listagem de sessões com novas regras Firebase

---

## [2.0.0] - 2026-01-10

### Adicionado
- Sistema de respostas de texto
- Temporizador configurável
- Visualização de respostas no master

---

## [1.0.0] - 2025-12-15

### Versão Inicial
- Sistema de buzzers
- Gestão de pontuação
- Categorias sorteaveis
- QR Code para conexão
- Histórico de sessões
- Classificação com revelação progressiva

---

## Tipos de Alterações

- `Adicionado` - Novas funcionalidades
- `Alterado` - Alterações em funcionalidades existentes
- `Obsoleto` - Funcionalidades que serão removidas
- `Removido` - Funcionalidades removidas
- `Corrigido` - Correção de bugs
- `Segurança` - Vulnerabilidades corrigidas
