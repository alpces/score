# 🎮 Sistema de Pontuação Multijogador

Sistema de gestão de pontuação em tempo real para eventos, quizzes e jogos de tabuleiro. Múltiplos clientes (uma equipa por dispositivo) ligam-se a um master (anfitrião) via Firebase Realtime Database.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://alpces.github.io/score/jogar.html)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🎯 Jogos Disponíveis

Acede a **[jogar.html](https://alpces.github.io/score/jogar.html)** e escolhe o jogo a que te
vais juntar (a equipa fica logo associada à sessão em curso, basta abrir o link/QR partilhado
pelo anfitrião):

| Jogo | Cliente |
|---|---|
| 🎵 **Mega Hitster** — quiz musical com joker, modo cantora e categorias configuráveis | [client](https://alpces.github.io/score/client-hitster.html) |
| 💎 **Mega Diamant** — adaptação do Diamant/Incan Gold com votação secreta e apostas | [client](https://alpces.github.io/score/client-diamant.html) |
| 🤫 **Mega Just One** — pistas de uma só palavra, mesa contra mesa, com validação pelo anfitrião | [client](https://alpces.github.io/score/client-justone.html) |
| ❓ **Mega Concept** — adivinha conceitos a partir de pistas (sistema modular genérico) | [client](https://alpces.github.io/score/client.html) |
| 🕵️ **Deception Murder** — cada mesa escolhe cartas, recebe um papel secreto e tenta acusar corretamente o assassino | [client](https://alpces.github.io/score/client-deception.html) |

> O acesso de anfitrião (`masters.html` e os `master-*.html` correspondentes) não é divulgado
> publicamente — é partilhado diretamente com quem organiza a sessão. Ver [`robots.txt`](robots.txt).

---

## 📁 Estrutura do Projeto

```
score/
├── jogar.html                    # Hub público — escolher jogo e entrar como equipa
├── masters.html                  # Hub de anfitrião — não divulgado (ver robots.txt)
├── master.html                   # Sistema modular (Mega Concept / Contador Genérico)
├── client.html
├── master-hitster.html           # Standalone — Mega Hitster
├── client-hitster.html
├── master-diamant.html           # Standalone — Mega Diamant
├── client-diamant.html
├── master-justone.html           # Standalone — Mega Just One (modos Consola/Público)
├── client-justone.html
│
├── shared/
│   ├── firebase-config.js        # Config Firebase + URLs públicas
│   ├── client-core.js            # Lifecycle de cliente reutilizável
│   ├── session-core.js           # Lifecycle de sessão reutilizável
│   ├── i18n.js / i18n-pt.js / i18n-en.js   # Sistema de traduções (PT/EN) reutilizável
│   └── home-common.js            # Lógica partilhada das páginas de entrada
│
├── games/
│   ├── game-system.js            # Core do sistema modular (legacy)
│   ├── game-interface.js
│   ├── generic.js                # Módulo: Contador Genérico
│   ├── hitster.js                # Constantes Hitster
│   ├── diamant.js                # Referência de regras Diamant
│   ├── justone-words-pt.txt      # Pool de palavras PT-PT (Mega Just One)
│   └── justone-words-en.txt      # Pool de palavras EN (Mega Just One)
│
├── logo1.png … logo4.png         # Logos opcionais
├── robots.txt                    # Esconde /master* dos motores de busca
├── CLAUDE_CONTEXT.md             # 🤖 Referência completa para IAs
├── CHANGELOG.md
├── DEVELOPMENT_LOG.md
└── RULES-JUSTONE.md              # Regras PT-PT do Mega Just One
```

---

## 🏗️ Arquitectura

Cada jogo "standalone" tem o seu par de páginas auto-contidas (`master-X.html` + `client-X.html`) que comunicam via **Firebase Realtime Database**. Não há build step — todas as apps usam React 18 UMD (sem JSX) e Tailwind CDN, servidas estaticamente pelo GitHub Pages.

A infraestrutura repetível (Firebase listeners, heartbeat, reconexão, fluxo de arquivo de sessões) está extraída em **dois cores partilhados**:

- **`shared/client-core.js`** (`window.ClientCore`): UUID persistente, store local com expiry, listener de gameState/clientes/connection com forceRefresh em background-resume, heartbeat, joinSession com deteção de colisão, submitWithVerify, wake lock.
- **`shared/session-core.js`** (`window.SessionCore`): subscribers a sessões activas/históricas/clientes (com optimização anti-flicker), one-shot reads, archiveSession (fluxo de 6 passos seguros) com enrichers configuráveis.
- **`shared/i18n.js`** (`window.I18n`): traduções PT/EN partilhadas por todos os jogos, com seletor de língua por dispositivo (PT sempre pré-definido).

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

Abrir `http://localhost:8000/jogar.html` (jogadores) ou `http://localhost:8000/masters.html`
(anfitriões) no browser.

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
6. Adicionar `<meta name="robots" content="noindex, nofollow">` ao `<head>` do `master-meujogo.html`
   (o `robots.txt` já cobre `/master*`, mas a meta tag protege quem consulta a página diretamente).
7. Adicionar um cartão (ícone, título, descrição curta, `data-game-link`) a `masters.html` e a
   `jogar.html`.
8. Adicionar entrada na tabela "Jogos Disponíveis" aqui no README.

A documentação técnica completa (APIs dos cores, padrões defensivos, estrutura Firebase, convenções) está em **[`CLAUDE_CONTEXT.md`](./CLAUDE_CONTEXT.md)**.

---

## 👥 Contribuidores

- **ALPCeS - Ludonautas** — desenvolvimento, design, regras de jogo — https://ludonautas.pt
- **Claude (Anthropic)** — assistência de código

## 📄 Licença

MIT
