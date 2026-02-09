# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste ficheiro.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [2.1.0] - 2026-02-09

### Adicionado
- **Modal "Terminar Sessão"**: Interface elegante com 3 opções claras
  - 📦 Arquivar e Fechar (guarda no histórico e termina)
  - ⏸️ Pausar (mantém aberta para retomar)
  - ❌ Cancelar (volta ao jogo)
- **Gestão de Sessões melhorada**: Distinção visual entre sessões abertas e arquivadas
- **Monitorização em tempo real**: Sessões abertas atualizam automaticamente na lista
- **Logs de debug**: Mensagens na consola para rastrear operações de sessão

### Alterado
- **Substituídos 2 botões por 1**: "Gravar Sessão" + "Nova Sessão" → "🏁 Terminar"
- **Filtro de sessões**: Agora detecta sessões sem campo `active` definido (retrocompatibilidade)
- **Fecho de sessões**: Processo mais robusto com verificação dupla

### Corrigido
- **Sessões fantasma**: Sessões que ficavam "perdidas" no Firebase são agora corretamente geridas
- **Listagem de sessões**: Corrigido erro "Permission denied" com novas regras Firebase
- **Arquivamento**: Sessões são marcadas como `active: false` antes de serem removidas

### Documentação
- **Regras Firebase atualizadas**: Documentação clara sobre configuração necessária
- **FAQ expandido**: Novas perguntas sobre gestão de sessões
- **Troubleshooting**: Secção sobre sessões não aparecerem na lista

---

## [2.0.0] - 2026-01-10

### Adicionado
- **Sistema de respostas de texto**: Campo para escrever respostas além do buzzer
- **Temporizador configurável**: Define tempo para respostas (0 = ilimitado)
- **Edição de respostas**: Possível alterar enquanto o tempo não acabar
- **Visualização de respostas**: Ecrã dedicado no master para ver e pontuar respostas
- **Opção de funcionalidades**: Ativar/desativar buzzer e texto independentemente

### Alterado
- **Layout de respostas**: Disposição horizontal para melhor visualização
- **Buzzer responsivo**: Melhor experiência em dispositivos móveis
- **Cores no cliente**: Áreas visuais distintas para buzzer, texto e informação

### Corrigido
- Diversos bugs de sincronização
- Problemas de UI em ecrãs pequenos

---

## [1.0.0] - 2025-12-15

### Adicionado
- **Sistema de buzzers**: Botão com som e ordem de resposta
- **Gestão de pontuação**: Botões +1, -1, +5 por mesa
- **Categorias sorteaveis**: Duas categorias (amarela e vermelha) com rotação aleatória
- **QR Code**: Geração automática para conexão rápida dos clientes
- **Histórico**: Guardar e carregar sessões
- **Classificação**: Revelação progressiva do ranking
- **Logotipos**: Suporte para até 5 logos personalizados
- **Design responsivo**: Funciona em desktop, tablet e telemóvel

### Características Iniciais
- Aplicação master para organizador
- Aplicação cliente para participantes
- Sincronização em tempo real via Firebase
- Suporte para 0-20 mesas (fixas ou dinâmicas)
- Código da sessão personalizável ou automático

---

## Tipos de Alterações

- `Adicionado` para novas funcionalidades
- `Alterado` para alterações em funcionalidades existentes
- `Obsoleto` para funcionalidades que serão removidas em breve
- `Removido` para funcionalidades removidas
- `Corrigido` para correção de bugs
- `Segurança` para vulnerabilidades corrigidas
