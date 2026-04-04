# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste ficheiro.

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
