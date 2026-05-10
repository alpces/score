# 🎮 Sistema de Pontuação Multijogador

Sistema de gestão de pontuação em tempo real para eventos, quizzes e jogos de tabuleiro. Múltiplos clientes (uma equipa por dispositivo) ligam-se a um master (anfitrião) via Firebase Realtime Database.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://alpces.github.io/score/master-hitster.html)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 Jogos Disponíveis

| Jogo | Master | Cliente |
|---|---|---|
| 🎵 **Mega Hitster** — quiz musical com joker, modo cantora e categorias configuráveis | [master](https://alpces.github.io/score/master-hitster.html) | [client](https://alpces.github.io/score/client-hitster.html) |
| 💎 **Diamant / Incan Gold** — adaptação do jogo de tabuleiro com votação secreta e apostas | [master](https://alpces.github.io/score/master-diamant.html) | [client](https://alpces.github.io/score/client-diamant.html) |
| 🎯 **Contador Genérico** — buzzers, +1/-1/+5, respostas de texto (sistema modular legacy) | [master](https://alpces.github.io/score/master.html) | [client](https://alpces.github.io/score/client.html) |

---

## 📁 Estrutura do Projeto

```
score/
├── master.html                   # Sistema modular (Contador Genérico)
├── client.html
├── master-hitster.html           # Standalone — Mega Hitster
├── client-hitster.html
├── master-diamant.html           # Standalone — Diamant
├── client-diamant.html
│
├── shared/
│   ├── firebase-config.js        # Config Firebase + URLs públicas
│   ├── client-core.js            # Lifecycle de cliente reutilizável
│   └── session-core.js           # Lifecycle de sessão reutilizável
│
├── games/
│   ├── game-system.js            # Core do sistema modular (legacy)
│   ├── game-interface.js
│   ├── generic.js                # Módulo: Contador Genérico
│   ├── hitster.js                # Constantes Hitster
│   └── diamant.js                # Referência de regras Diamant
│
├── logo1.png … logo4.png         # Logos opcionais
├── CLAUDE_CONTEXT.md             # 🤖 Referência completa para IAs
├── CHANGELOG.md
└── DEVELOPMENT_LOG.md
```

---

## 🏗️ Arquitectura

Cada jogo "standalone" tem o seu par de páginas auto-contidas (`master-X.html` + `client-X.html`) que comunicam via **Firebase Realtime Database**. Não há build step — todas as apps usam React 18 UMD (sem JSX) e Tailwind CDN, servidas estaticamente pelo GitHub Pages.

A infraestrutura repetível (Firebase listeners, heartbeat, reconexão, fluxo de arquivo de sessões) está extraída em **dois cores partilhados**:

- **`shared/client-core.js`** (`window.ClientCore`): UUID persistente, store local com expiry, listener de gameState/clientes/connection com forceRefresh em background-resume, heartbeat, joinSession com deteção de colisão, submitWithVerify, wake lock.
- **`shared/session-core.js`** (`window.SessionCore`): subscribers a sessões activas/históricas/clientes (com optimização anti-flicker), one-shot reads, archiveSession (fluxo de 6 passos seguros) com enrichers configuráveis.

Lógica game-específica (regras de pontuação, fases, modais de configuração) fica nos ficheiros do jogo.

### Resiliência

Os clientes resistem a:
- Tab em background no mobile (iOS Safari mata o WebSocket) — auto-acordar via visibility/focus/online
- Sessão remota a expirar — deteção via `gameState.active=false` ou remoção pelo master
- Mesa ocupada por outro dispositivo — colisão detectada por `clientId` em localStorage
- Writes pendurados — `withTimeout` em `Promise.race`
- Resposta perdida em rede instável — `submitWithVerify` faz read-back após write

---

## 🚀 Começar

### Em produção
Acede directamente aos URLs em https://alpces.github.io/score/

### Localmente
```bash
git clone https://github.com/alpces/score.git
cd score
# Servir staticamente (qualquer servidor estático serve)
python -m http.server 8000
# ou
npx serve
```

Abrir `http://localhost:8000/master-hitster.html` no browser.

### Configurar Firebase
A configuração está em `shared/firebase-config.js`. Para usar a tua própria base de dados, substitui as credenciais nesse ficheiro.

---

## 🛠️ Adicionar Um Novo Jogo

Padrão recomendado: jogo standalone (par master+client) usando os shared cores.

1. Criar `master-meujogo.html` e `client-meujogo.html` (ver esqueletos em `CLAUDE_CONTEXT.md`).
2. Carregar `shared/firebase-config.js` e o(s) core(s) apropriado(s).
3. Implementar a UI e a lógica game-específica; delegar tudo o que é genérico (Firebase, lifecycle, etc.) aos cores.
4. Escolher o enricher de arquivo apropriado (`mergeEmailsIntoTables` ou `attachClientsField`) ou escrever um custom.
5. Adicionar URLs em `shared/firebase-config.js` (`AppConfig`).
6. Adicionar entrada no histórico aqui no README.

A documentação técnica completa (APIs dos cores, padrões defensivos, estrutura Firebase, convenções) está em **[`CLAUDE_CONTEXT.md`](./CLAUDE_CONTEXT.md)**.

---

## 👥 Contribuidores

- **ALPCeS - Ludonautas** — desenvolvimento, design, regras de jogo — https://ludonautas.pt
- **Claude (Anthropic)** — assistência de código

## 📄 Licença

MIT
