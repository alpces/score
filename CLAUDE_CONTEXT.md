# 🤖 Contexto para Desenvolvimento com Claude

Este ficheiro serve para dar contexto ao Claude AI quando precisares de iterar ou criar novos módulos no sistema de pontuação.

---

## 📁 Estrutura do Projeto

```
score/
├── master.html              # App do organizador (NÃO MODIFICAR estrutura base)
├── client.html              # App dos participantes (NÃO MODIFICAR estrutura base)
├── games/
│   ├── game-interface.js    # Interface que TODOS os módulos devem seguir
│   ├── game-system.js       # Sistema de gestão (NÃO MODIFICAR)
│   ├── generic.js           # Módulo: Contador Genérico
│   └── diamant.js           # Módulo: Diamant / Incan Gold
├── shared/
│   └── firebase-config.js   # Configuração Firebase
└── CLAUDE_CONTEXT.md        # Este ficheiro
```

---

## 🎯 Princípios de Design

### 1. Consistência Visual
- **Cores principais**: purple-600, indigo-600, green-500, red-500
- **Botões**: `rounded-lg`, `font-bold`, `shadow-lg`
- **Cards**: `bg-white rounded-2xl shadow-2xl p-4`
- **Animações**: `btn-pulse-purple`, `btn-pulse-green` para destaque

### 2. Consistência de UX
- **Header do cliente**: Logo centrado, Mesa à esquerda, Sessão+X à direita
- **Persistência**: localStorage para reconexão automática
- **Confirmações**: Sempre confirmar ações destrutivas
- **Feedback**: Estados visuais claros (loading, sucesso, erro)

### 3. Estrutura de Estados
Todos os módulos devem ter:
- `gameType`: string identificadora
- `phase`: estado atual do jogo ('waiting', 'playing', etc.)
- Estados específicos do jogo

### 4. Firebase
- Dados em `sessions/{sessionId}/gameState`
- Sempre incluir `timestamp: Date.now()`
- Sempre incluir `active: true/false`
- Sempre incluir `gameType`

---

## 🔧 Interface de Módulo (Obrigatória)

```javascript
const MeuModulo = {
    // METADADOS
    id: 'meujogo',           // Identificador único
    name: 'Nome do Jogo',    // Nome para exibição
    description: '...',      // Descrição breve
    icon: '🎮',              // Emoji

    // CONFIGURAÇÃO
    getDefaultConfig: () => ({...}),
    getConfigUI: (config, setConfig, h) => {...},

    // LIFECYCLE
    onSessionStart: (config) => ({...}),  // Retorna estado inicial
    onSessionEnd: (state, tables, config) => ({...}),

    // LÓGICA
    processAction: (action, state, tables) => ({gameState, tables}),
    getFirebaseState: (state, config, tables, extra) => ({...}),

    // UI
    getGameControlsUI: ({gameState, config, tables, actions, h}) => {...},
    getClientUI: ({gameData, myTable, actions, h}) => {...}
};
```

---

## 📝 Template de Prompt para Claude

Quando iniciares uma nova conversa com o Claude, usa este template:

```
## Projeto
Sistema de Pontuação Modular para eventos de jogos de tabuleiro.
Repositório: https://github.com/alpces/score

## Ficheiros de Referência
- Interface base: games/game-interface.js
- Módulo exemplo: games/generic.js (para consistência de estilo)
- Contexto: CLAUDE_CONTEXT.md

## Tarefa Atual
[Descrever o que queres fazer]

## Ficheiro a Modificar/Criar
[Nome do ficheiro]

## Código Atual (se existir)
[Colar código relevante]

## Comportamento Esperado
[Descrever em detalhe]
```

---

## 🎲 Módulos Existentes

### generic.js
- Pontuação manual (+1, -1, +5)
- Buzzers com bloqueio
- Respostas de texto com temporizador
- Categorias sorteaveis

### diamant.js
- Distribuição automática de rubis
- Votação secreta "Continuar/Sair"
- Gestão de reserva e sobras
- Pontos provisórios vs definitivos
- Timeout opcional para votação

---

## ⚠️ Regras Importantes

1. **Não modificar game-system.js** - É o core do sistema
2. **Não modificar estrutura base de master.html/client.html** - Só adicionar scripts
3. **Sempre comentar o código** - Para facilitar futuras iterações
4. **Testar incrementalmente** - Uma funcionalidade de cada vez
5. **Manter retrocompatibilidade** - Sessões antigas devem continuar a funcionar

---

## 🔄 Fluxo de Desenvolvimento

1. **Planear** - Definir estados, ações e UI
2. **Criar módulo** - `games/novojogo.js`
3. **Adicionar script** - Em master.html e client.html
4. **Testar localmente** - Abrir os HTML no browser
5. **Commit** - Com mensagem descritiva
6. **Push** - Para GitHub
7. **Testar em produção** - GitHub Pages

---

## 📞 Contacto

Desenvolvido por ALPCeS - Ludonautas
https://alpces.pt
