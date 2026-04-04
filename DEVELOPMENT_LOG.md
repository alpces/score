# 📋 Development Log

Registo de desenvolvimento do Sistema de Pontuação Modular.

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
