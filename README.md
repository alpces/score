# 🎮 Sistema de Pontuação para Jogos/Quizzes

Sistema completo de gestão de pontuação em tempo real para eventos, jogos de tabuleiro, quizzes e competições. Com buzzers sonoros, respostas de texto e sincronização automática via Firebase.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://alpces.github.io/score/master.html)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📸 Capturas de Ecrã

### Master - Controlo do Jogo
![Master Interface](https://via.placeholder.com/800x450/4F46E5/FFFFFF?text=Master+Interface)

### Cliente - Vista da Mesa
![Client Interface](https://via.placeholder.com/400x800/7C3AED/FFFFFF?text=Client+View)

---

## ✨ Funcionalidades

### 🎯 Sistema Master (Organizador)
- ✅ **Configuração flexível**: Mesas fixas ou dinâmicas (0-20 mesas)
- ✅ **Buzzers em tempo real**: Som + ordem de resposta
- ✅ **Respostas de texto**: Com temporizador configurável ou ilimitado
- ✅ **Categorias sorteaveis**: Amarela e vermelha com rotação aleatória
- ✅ **Gestão de pontuação**: +1, -1, +5 ou manual
- ✅ **QR Code**: Para conexão rápida dos clientes
- ✅ **Gestão de Sessões**: Sessões abertas vs arquivadas com interface dedicada
- ✅ **Classificação**: Revelação progressiva do ranking
- ✅ **Logotipos**: Suporte para logo1.png até logo5.png

### 📱 Sistema Cliente (Participantes)
- ✅ **Registo simples**: Código da sessão + número da mesa
- ✅ **Buzzer interativo**: Botão grande com feedback sonoro
- ✅ **Respostas de texto**: Campo de 250 caracteres com contador
- ✅ **Visualização em tempo real**: Pontuação e categorias ativas
- ✅ **Design responsivo**: Funciona em telemóvel, tablet e desktop
- ✅ **Edição de respostas**: Possível alterar antes do tempo acabar

---

## 🚀 Começar a Usar

### Acesso Direto (GitHub Pages)

**Master (Organizador):**
```
https://alpces.github.io/score/master.html
```

**Cliente (Participantes):**
```
https://alpces.github.io/score/client.html
```

### Instalação Local

1. **Clone o repositório:**
```bash
git clone https://github.com/alpces/score.git
cd score
```

2. **Abra os ficheiros:**
   - `master.html` - Para o organizador
   - `client.html` - Para os participantes

3. **Opcional - Adicione logotipos:**
   - Coloque ficheiros `logo1.png`, `logo2.png`, etc. na pasta raiz
   - Serão exibidos automaticamente no rodapé

---

## 📖 Como Utilizar

### 1️⃣ Configurar Sessão (Master)

1. Abra `master.html`
2. Configure:
   - **Código da sessão** (opcional, será gerado automaticamente)
   - **Funcionalidades**: Ativar Buzzer ☑️ / Ativar Texto ☑️
   - **Número de mesas**: `0` para dinâmico, `1-20` para fixo
   - **Pontuação inicial**: Pontos que cada mesa começa
   - **Texto do buzzer**: Personalizar botão (ex: "RESPONDER")
   - **Categorias**: Lista de temas para sorteio
3. Clique **"Iniciar Jogo"**
4. Partilhe o **código** ou **QR code** com os participantes

### 2️⃣ Conectar Mesas (Cliente)

1. Abra `client.html` (ou escaneie QR code)
2. Insira:
   - Código da sessão (ex: `ABC123`)
   - Número da mesa (`1-20`)
   - Nome da equipa (opcional)
   - E-mails (opcional)
3. Clique **"Conectar ao Jogo"**
4. Aguarde que o jogo comece!

### 3️⃣ Durante o Jogo

#### Master:
- **Mostrar/Ocultar**: Toggle da visibilidade das pontuações
- **Buzzer**: Veja ordem de quem tocou, reset individual ou geral
- **Ativar Texto**: Define tempo (0 = ilimitado) e ativa
- **Ver Respostas**: Visualiza todas as respostas, ajusta pontos
- **Categorias**: Duplo clique para sortear nova categoria
- **+1 / -1 / +5**: Botões rápidos de pontuação nas mesas
- **Código/QR**: Mostra ecrã fullscreen para projetar

#### Cliente:
- **Buzzer** 🔔: Pressionar quando ativo (som + ordem)
- **Texto** 📝: Escrever resposta quando ativado
- **Editar**: Pode alterar e reenviar enquanto houver tempo
- **Pontuação**: Visível em tempo real

### 4️⃣ Terminar Sessão

Clique no botão **🏁 Terminar** para abrir o menu de fim de sessão:

| Opção | Descrição |
|-------|-----------|
| 📦 **Arquivar e Fechar** | Guarda no histórico e termina definitivamente |
| ⏸️ **Pausar** | Mantém aberta para retomar mais tarde |
| ❌ **Cancelar** | Volta ao jogo |

---

## 🗂️ Gestão de Sessões

O sistema inclui uma interface dedicada para gerir sessões:

### Aceder à Gestão
- No ecrã inicial, clique em **"📋 Gestão de Sessões"**

### Sessões Abertas (🟢)
- Sessões que estão em curso ou pausadas
- Podem ser **retomadas** a qualquer momento
- Podem ser **arquivadas** quando já não são necessárias

### Sessões Arquivadas (⚫)
- Sessões terminadas e guardadas no histórico
- Podem ser **carregadas** para visualizar ou continuar
- Podem ser **eliminadas** permanentemente

### Fluxo Recomendado
```
Criar Sessão → Jogar → 🏁 Terminar
                           │
                           ├── 📦 Arquivar (fim definitivo)
                           │
                           └── ⏸️ Pausar (retomar depois)
```

---

## ⚙️ Configuração Avançada

### Firebase (Obrigatório)

O sistema usa Firebase para sincronização. **Já vem configurado**, mas podes usar o teu próprio:

1. Cria projeto em [Firebase Console](https://console.firebase.google.com)
2. Ativa **Realtime Database** e **Firestore**
3. Substitui credenciais em `master.html` e `client.html`:

```javascript
const firebaseConfig = {
    apiKey: "TUA_API_KEY",
    authDomain: "TEU_PROJETO.firebaseapp.com",
    projectId: "TEU_PROJETO",
    databaseURL: "https://TEU_PROJETO.firebasedatabase.app"
    // ...
};
```

### Regras de Segurança Firebase

**⚠️ IMPORTANTE:** Para que a listagem de sessões funcione, as regras devem permitir leitura ao nível de `sessions/`:

```json
{
  "rules": {
    "sessions": {
      ".read": true,
      ".write": true
    },
    "sessionHistory": {
      ".read": true,
      ".write": true
    },
    "categories": {
      ".read": true,
      ".write": true
    }
  }
}
```

> **Nota:** Regras com `"$sessionId": { ".read": true }` não permitem listar todas as sessões, apenas ler sessões específicas.

### Personalização

#### Alterar URL do Cliente
Em `master.html`, linha ~38:
```javascript
const CLIENT_URL = 'https://SEU-DOMINIO.com/client.html';
```

#### Adicionar Logotipos
Coloca ficheiros na pasta raiz:
- `logo1.png`
- `logo2.png`
- `logo3.png`
- `logo4.png`
- `logo5.png`

Dimensões recomendadas: 200x80px (PNG transparente)

---

## 🎨 Características Técnicas

### Stack Tecnológico
- **Frontend**: React 18 (via CDN)
- **Styling**: Tailwind CSS
- **Backend**: Firebase Realtime Database + Firestore
- **Audio**: Web Audio API
- **QR Codes**: API externa (qrserver.com)

### Estrutura de Dados

```
Firebase Realtime Database:
├── sessions/{sessionId}/
│   ├── gameState/          # Estado geral (active, tables, categories, etc.)
│   ├── clients/            # Mesas conectadas
│   ├── buzzers/            # Estado dos buzzers
│   └── textResponses/      # Respostas de texto
└── sessionHistory/         # Sessões arquivadas

Firestore:
└── categories/             # Categorias pré-definidas
```

### Estados de uma Sessão

| Estado | Localização | Campo `active` |
|--------|-------------|----------------|
| **Aberta** | `sessions/` | `true` ou `undefined` |
| **Arquivada** | `sessionHistory/` | N/A (`archived: true`) |

### Compatibilidade
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

---

## 📊 Casos de Uso

### 🎲 Jogos de Tabuleiro
- Sessões longas com pausas
- Guardar progresso
- Múltiplas equipas

### 🧠 Quizzes e Trivia
- Buzzers para respostas rápidas
- Categorias temáticas
- Classificação final

### 🏫 Educação
- Gamificação de aulas
- Competições entre turmas
- Perguntas escritas

### 🎪 Eventos
- Jogos de grupo
- Dinâmicas de team building
- Competições corporativas

---

## 🛠️ Desenvolvimento

### Estrutura de Ficheiros
```
score/
├── master.html          # Aplicação master (~1700 linhas)
├── client.html          # Aplicação cliente (~500 linhas)
├── README.md            # Esta documentação
├── CHANGELOG.md         # Histórico de alterações
├── LICENSE              # Licença MIT
├── logo1.png            # Logotipo 1 (opcional)
├── logo2.png            # Logotipo 2 (opcional)
└── ...
```

### Arquitetura do Código

Ambos os ficheiros são **standalone** (HTML + JavaScript inline):

**Master:**
- Linhas 1-35: Configuração Firebase e imports
- Linhas 35-65: Utilitários (playBuzzer)
- Linhas 65-120: Estados React
- Linhas 120-750: Funções de lógica
- Linhas 750-1700: Componentes de UI

**Cliente:**
- Estrutura similar mas mais simples
- Foco em UI responsiva e interação com buzzer

### Princípios do Código
- ✅ **Alterações cirúrgicas**: Modificar apenas o necessário
- ✅ **Comentários em português**: Código bem documentado
- ✅ **Estados consolidados**: Organização clara por categoria
- ✅ **Sincronização automática**: Via useEffect
- ✅ **Tratamento de erros**: Try-catch em operações críticas

---

## 🐛 Resolução de Problemas

### Cliente não conecta
- ✅ Verifica código da sessão (case-sensitive)
- ✅ Confirma que master iniciou o jogo
- ✅ Verifica consola do browser (F12)

### Buzzers sem som
- ✅ Clica na página antes (browsers bloqueiam áudio)
- ✅ Verifica volume do sistema
- ✅ Testa noutro browser

### Sessões não aparecem em "Sessões Abertas"
- ✅ Verifica regras do Firebase (ver secção Configuração)
- ✅ Desativa adblocker temporariamente
- ✅ Verifica consola para erros "Permission denied"

### Sincronização falha
- ✅ Verifica conexão internet
- ✅ Confirma credenciais Firebase
- ✅ Verifica regras de segurança Firebase

### Ecrã branco
- ✅ Abre consola (F12) e verifica erros
- ✅ Limpa cache do browser
- ✅ Testa em modo incógnito

---

## 🤝 Contribuir

Contribuições são bem-vindas! 

### Como contribuir:
1. Fork o projeto
2. Cria branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para branch (`git push origin feature/NovaFuncionalidade`)
5. Abre Pull Request

### Guidelines:
- Mantém código em português
- Adiciona comentários explicativos
- Testa em múltiplos browsers
- Documenta novas funcionalidades

---

## 📝 Changelog

### v2.1.0 (2026-02-09)
- ✨ **Nova gestão de sessões**: Interface dedicada para sessões abertas vs arquivadas
- ✨ **Botão "Terminar"**: Substitui "Gravar Sessão" e "Nova Sessão" por um único botão com modal
- 🔧 **Correção de sessões fantasma**: Sessões são corretamente arquivadas/removidas
- 🔧 **Filtro de sessões melhorado**: Detecta sessões sem campo `active` definido
- 🔧 **Fecho robusto**: Verificação dupla de remoção do Firebase
- 📝 **Documentação atualizada**: Regras Firebase corrigidas

### v2.0.0 (2026-01-10)
- ✨ Adicionado sistema de respostas de texto
- ✨ Temporizador configurável (0 = ilimitado)
- ✨ Edição de respostas antes do tempo acabar
- 🎨 Layout horizontal das respostas no master
- 🎨 Buzzer responsivo em telemóveis
- 🎨 Cores distintas para áreas no cliente
- 🐛 Correções de bugs diversos

### v1.0.0 (2025-12-15)
- 🎉 Lançamento inicial
- ✨ Sistema de buzzers
- ✨ Gestão de pontuação
- ✨ Categorias sorteaveis
- ✨ QR Code para conexão

---

## 📄 Licença

Este projeto está sob a licença MIT. Vê o ficheiro [LICENSE](LICENSE) para detalhes.

```
MIT License

Copyright (c) 2026 ALPCeS - Ludonautas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👥 Créditos

**Desenvolvido por:** [ALPCeS - Associação Ludopedagógica Cultural e Social](https://alpces.pt)  
**Também conhecido como:** Ludonautas  
**Contacto:** [geral@alpces.pt](mailto:geral@alpces.pt)

### Tecnologias Utilizadas:
- [React](https://react.dev) - UI Framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Firebase](https://firebase.google.com) - Backend & Sincronização
- [QR Server API](https://goqr.me/api/) - Geração de QR Codes

---

## 🔗 Links Úteis

- 📖 [Documentação Firebase](https://firebase.google.com/docs)
- 🎨 [Tailwind CSS Docs](https://tailwindcss.com/docs)
- ⚛️ [React Documentation](https://react.dev)
- 🎮 [ALPCeS Website](https://alpces.pt)

---

## ❓ FAQ

**P: Preciso de conta Firebase?**  
R: Não! O sistema já vem configurado. Mas podes usar a tua própria.

**P: Funciona offline?**  
R: Não. Requer internet para sincronização em tempo real.

**P: Quantas mesas suporta?**  
R: Até 20 mesas simultâneas.

**P: Posso usar em eventos comerciais?**  
R: Sim! Licença MIT permite uso comercial.

**P: Como faço backup das sessões?**  
R: Usa o botão "🏁 Terminar" → "📦 Arquivar e Fechar". Os dados ficam no Firebase.

**P: Como retomo uma sessão pausada?**  
R: Vai a "Gestão de Sessões" → "Sessões Abertas" → "🔄 Abrir".

**P: Posso personalizar cores/design?**  
R: Sim! Edita as classes Tailwind nos ficheiros HTML.

**P: As sessões abertas não aparecem na lista!**  
R: Verifica as regras do Firebase. Precisam de `.read: true` ao nível de `sessions/`, não dentro de `$sessionId`.

---

## 💡 Suporte

Encontraste um bug? Tens uma sugestão?

- 🐛 [Reportar Bug](https://github.com/alpces/score/issues)
- 💬 [Discussões](https://github.com/alpces/score/discussions)
- 📧 [Email](mailto:geral@alpces.pt)

---

<div align="center">

**Feito com ❤️ por [Ludonautas](https://alpces.pt)**

⭐ Se este projeto te foi útil, dá uma estrela!

[⬆️ Voltar ao topo](#-sistema-de-pontuação-para-jogosquizzes)

</div>
