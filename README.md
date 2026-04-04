# 🎮 Sistema de Pontuação Modular para Jogos

Sistema completo de gestão de pontuação em tempo real para eventos, jogos de tabuleiro, quizzes e competições. Arquitetura modular que permite criar diferentes modos de jogo.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://alpces.github.io/score/master.html)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📁 Estrutura do Projeto

```
score/
├── master.html              # App do organizador
├── client.html              # App dos participantes
├── games/
│   ├── game-interface.js    # Interface base para módulos
│   ├── game-system.js       # Sistema de gestão de módulos
│   └── generic.js           # Módulo: Contador Genérico
├── shared/
│   └── firebase-config.js   # Configuração Firebase
├── logo1.png ... logo5.png  # Logotipos (opcional)
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## ✨ Jogos Disponíveis

### 🎯 Contador Genérico (`generic`)
Sistema de pontuação manual com:
- ✅ Pontuação manual (+1, -1, +5)
- ✅ Buzzers com bloqueio
- ✅ Respostas de texto com temporizador
- ✅ Categorias sorteaveis
- ✅ Leaderboard com revelação progressiva
- ✅ Até 5 logotipos personalizados

### 💎 Diamant / Incan Gold (`diamant`) - *Em desenvolvimento*
Adaptação do jogo de tabuleiro com:
- Distribuição automática de rubis
- Votação "Ficar/Sair" via telemóvel
- Gestão de sobras e expedições
- Cartas de perigo

---

## 🚀 Como Usar

### Acesso Rápido
- **Master:** https://alpces.github.io/score/master.html
- **Cliente:** https://alpces.github.io/score/client.html

### Instalação Local
```bash
git clone https://github.com/alpces/score.git
cd score
# Abrir master.html num browser
```

---

## 🔧 Arquitetura Modular

### Como Funciona

1. **GameSystem** (`game-system.js`) - Regista e gere módulos de jogos
2. **GameInterface** (`game-interface.js`) - Define a interface que cada jogo deve implementar
3. **Módulos** (`games/*.js`) - Implementações específicas de cada jogo

### Fluxo de Dados

```
┌─────────────┐     Firebase      ┌─────────────┐
│   MASTER    │ ←───────────────→ │   CLIENT    │
│  master.html│   gameType: X     │ client.html │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌─────────────┐
│ GameSystem  │                   │ GameSystem  │
│  .get('X')  │                   │  .get('X')  │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌─────────────┐
│  Módulo X   │                   │  Módulo X   │
│ (generic.js)│                   │ (generic.js)│
└─────────────┘                   └─────────────┘
```

---

## 📝 Como Criar um Novo Módulo de Jogo

### 1. Criar o Ficheiro

Criar `games/meujogo.js`:

```javascript
const MeuJogo = {
    // METADADOS
    id: 'meujogo',
    name: 'Meu Jogo Fantástico',
    description: 'Descrição do jogo',
    icon: '🎲',
    
    // CONFIGURAÇÃO PADRÃO
    getDefaultConfig: () => ({
        minhaOpcao: true,
        outraOpcao: 10
    }),
    
    // UI DE CONFIGURAÇÃO (setup)
    getConfigUI: (config, setConfig, h) => {
        return h('div', { className: 'space-y-4' },
            h('label', null, 'Minha Opção'),
            h('input', {
                type: 'checkbox',
                checked: config.minhaOpcao,
                onChange: e => setConfig({...config, minhaOpcao: e.target.checked})
            })
        );
    },
    
    // ESTADO INICIAL
    onSessionStart: (config) => ({
        fase: 'inicio',
        pontos: {}
    }),
    
    // PROCESSAR AÇÕES
    processAction: (action, gameState, tables) => {
        switch (action.type) {
            case 'MINHA_ACAO':
                return {
                    gameState: { ...gameState, fase: 'proxima' },
                    tables
                };
            default:
                return { gameState, tables };
        }
    },
    
    // DADOS PARA FIREBASE
    getFirebaseState: (gameState, config, tables, extra) => ({
        gameType: 'meujogo',
        tables: tables,
        fase: gameState.fase,
        active: true,
        timestamp: Date.now()
    }),
    
    // UI DOS CONTROLOS (barra inferior master)
    getGameControlsUI: ({ gameState, config, tables, actions, h }) => {
        return h('button', {
            onClick: () => actions.dispatch({ type: 'MINHA_ACAO' }),
            className: 'px-4 py-2 bg-blue-500 text-white rounded'
        }, 'Minha Ação');
    },
    
    // UI DO CLIENTE
    getClientUI: ({ gameData, myTable, actions, h }) => {
        return h('div', { className: 'text-center' },
            h('h2', null, `Fase: ${gameData.fase}`),
            h('button', {
                onClick: actions.minhaAcaoCliente,
                className: 'px-6 py-3 bg-green-500 text-white rounded-lg'
            }, 'Ação do Cliente')
        );
    },
    
    // DADOS PARA HISTÓRICO
    onSessionEnd: (gameState, tables, config) => ({
        gameType: 'meujogo',
        tables: tables,
        fasesFinal: gameState.fase
    })
};

// REGISTAR O MÓDULO
window.GameModules = window.GameModules || {};
window.GameModules.meujogo = MeuJogo;
```

### 2. Incluir no HTML

Em `master.html` e `client.html`, adicionar:

```html
<script src="games/meujogo.js"></script>
```

### 3. Ativar o Módulo

Mudar `GAME_TYPE` em `master.html`:

```javascript
const GAME_TYPE = 'meujogo';
```

---

## 🎲 Exemplo: Módulo Diamant

```javascript
const DiamantGame = {
    id: 'diamant',
    name: 'Diamant / Incan Gold',
    icon: '💎',
    
    getDefaultConfig: () => ({
        totalExpeditions: 5,
        maxPlayers: 8
    }),
    
    onSessionStart: (config) => ({
        expedition: 1,
        phase: 'waiting',      // waiting, exploring, voting, results
        rubiesOnTable: 0,      // Sobras acumuladas
        currentCard: null,     // Carta atual
        dangers: [],           // Perigos saídos
        teamsIn: [],           // Equipas na expedição
        votes: {}              // { tableId: 'stay' | 'leave' }
    }),
    
    processAction: (action, state, tables) => {
        switch (action.type) {
            case 'DRAW_RUBY_CARD': {
                const rubies = action.payload.value;
                const teamsCount = state.teamsIn.length;
                const perTeam = Math.floor(rubies / teamsCount);
                const leftover = rubies % teamsCount;
                
                // Distribuir rubis
                const newTables = tables.map(t => {
                    if (state.teamsIn.includes(t.id)) {
                        return { ...t, score: t.score + perTeam };
                    }
                    return t;
                });
                
                return {
                    gameState: {
                        ...state,
                        rubiesOnTable: state.rubiesOnTable + leftover,
                        currentCard: { type: 'ruby', value: rubies },
                        phase: 'voting'
                    },
                    tables: newTables
                };
            }
            
            case 'TEAM_VOTE': {
                const { tableId, vote } = action.payload;
                return {
                    gameState: {
                        ...state,
                        votes: { ...state.votes, [tableId]: vote }
                    },
                    tables
                };
            }
            
            case 'REVEAL_VOTES': {
                const leaving = Object.entries(state.votes)
                    .filter(([_, vote]) => vote === 'leave')
                    .map(([id, _]) => parseInt(id));
                
                // Distribuir sobras entre quem sai
                const rubiesPerLeaver = leaving.length > 0 
                    ? Math.floor(state.rubiesOnTable / leaving.length)
                    : 0;
                
                const newTables = tables.map(t => {
                    if (leaving.includes(t.id)) {
                        return { ...t, score: t.score + rubiesPerLeaver };
                    }
                    return t;
                });
                
                return {
                    gameState: {
                        ...state,
                        teamsIn: state.teamsIn.filter(id => !leaving.includes(id)),
                        rubiesOnTable: leaving.length > 0 ? state.rubiesOnTable % leaving.length : state.rubiesOnTable,
                        votes: {},
                        phase: 'exploring'
                    },
                    tables: newTables
                };
            }
            
            default:
                return { gameState: state, tables };
        }
    },
    
    getClientUI: ({ gameData, myTable, actions, h }) => {
        const inExpedition = gameData.teamsIn?.includes(myTable?.id);
        const hasVoted = gameData.votes?.[myTable?.id];
        
        if (gameData.phase === 'voting' && inExpedition && !hasVoted) {
            return h('div', { className: 'flex gap-4' },
                h('button', {
                    onClick: () => actions.vote('stay'),
                    className: 'px-8 py-4 bg-green-500 text-white text-xl rounded-lg'
                }, '💎 Ficar'),
                h('button', {
                    onClick: () => actions.vote('leave'),
                    className: 'px-8 py-4 bg-red-500 text-white text-xl rounded-lg'
                }, '🏃 Sair')
            );
        }
        
        return h('div', { className: 'text-center text-white' },
            h('div', { className: 'text-4xl mb-2' }, '💎'),
            h('div', null, inExpedition ? 'Na expedição' : 'Fora da expedição'),
            h('div', { className: 'text-2xl mt-4' }, `${myTable?.score || 0} rubis`)
        );
    }
};

window.GameModules.diamant = DiamantGame;
```

---

## 📋 API do GameSystem

```javascript
// Registar módulo
GameSystem.register(MeuModulo);

// Obter módulo
const modulo = GameSystem.get('meujogo');

// Listar módulos
const lista = GameSystem.list();
// [{ id, name, description, icon }, ...]

// Definir módulo atual
GameSystem.setCurrent('meujogo');

// Obter módulo atual
const atual = GameSystem.getCurrent();

// Processar ação
const resultado = GameSystem.processAction('meujogo', action, state, tables);

// Iniciar sessão
const estadoInicial = GameSystem.startSession('meujogo', config);

// Obter estado para Firebase
const firebaseState = GameSystem.getFirebaseState('meujogo', state, config, tables, extra);
```

---

## 🔍 Dicas para Desenvolvimento

### Trabalhar com o Claude

1. **Um ficheiro por sessão** - Focar num módulo de cada vez
2. **Mostrar interface** - Começar com `game-interface.js`
3. **Testar incrementalmente** - Implementar uma função de cada vez

### Boas Práticas

1. **Ações imutáveis** - Nunca modificar `gameState` diretamente
2. **Validar inputs** - Verificar `action.payload` antes de usar
3. **Estados claros** - Usar enums/strings para fases (`'waiting'`, `'playing'`, etc.)
4. **Fallbacks** - Sempre ter valores por defeito (`|| []`, `|| 0`)

---

## 📄 Licença

MIT License - Ver [LICENSE](LICENSE)

---

## 👥 Créditos

**Desenvolvido por:** [ALPCeS - Ludonautas](https://alpces.pt)

---

<div align="center">

**Feito com ❤️ por [Ludonautas](https://alpces.pt)**

</div>
