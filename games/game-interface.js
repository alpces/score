/**
 * Interface base para módulos de jogos
 * Todos os jogos devem implementar esta interface
 * 
 * @fileoverview Define a estrutura que cada módulo de jogo deve seguir
 */

/**
 * @typedef {Object} GameModule
 * @property {string} id - Identificador único do jogo (ex: 'generic', 'diamant')
 * @property {string} name - Nome do jogo para exibição
 * @property {string} description - Descrição breve do jogo
 * @property {string} icon - Emoji ou ícone do jogo
 * 
 * @property {Function} getDefaultConfig - Retorna configuração padrão do jogo
 * @property {Function} getConfigUI - Retorna UI de configuração (React elements)
 * @property {Function} getGameControlsUI - Retorna controlos durante o jogo (barra inferior)
 * @property {Function} getGameMainUI - Retorna UI principal do jogo (área central)
 * @property {Function} getClientUI - Retorna UI do cliente para este jogo
 * 
 * @property {Function} processAction - Processa ações do jogo e retorna novo estado
 * @property {Function} getFirebaseState - Retorna dados a sincronizar com Firebase
 * @property {Function} onSessionStart - Chamado quando sessão inicia
 * @property {Function} onSessionEnd - Chamado quando sessão termina
 */

// Estrutura de exemplo para referência
const GameInterfaceExample = {
    // ==========================================
    // METADADOS DO JOGO
    // ==========================================
    id: 'example',
    name: 'Jogo Exemplo',
    description: 'Descrição do jogo',
    icon: '🎮',
    
    // ==========================================
    // CONFIGURAÇÃO
    // ==========================================
    
    /**
     * Retorna a configuração padrão do jogo
     * @returns {Object} Configuração inicial
     */
    getDefaultConfig: () => ({
        // Configurações específicas do jogo
    }),
    
    /**
     * Retorna elementos React para configuração do jogo no setup
     * @param {Object} config - Configuração atual
     * @param {Function} setConfig - Função para atualizar configuração
     * @param {Function} h - React.createElement
     * @returns {ReactElement} UI de configuração
     */
    getConfigUI: (config, setConfig, h) => {
        return null; // Retorna elementos React
    },
    
    // ==========================================
    // UI DO MASTER
    // ==========================================
    
    /**
     * Retorna controlos do jogo para a barra inferior do master
     * @param {Object} params
     * @param {Object} params.gameState - Estado atual do jogo
     * @param {Array} params.tables - Lista de mesas
     * @param {Object} params.actions - Ações disponíveis (processAction, etc)
     * @param {Function} h - React.createElement
     * @returns {ReactElement} Controlos do jogo
     */
    getGameControlsUI: ({ gameState, tables, actions, h }) => {
        return null;
    },
    
    /**
     * Retorna UI principal do jogo (área central do master)
     * @param {Object} params
     * @param {Object} params.gameState - Estado atual do jogo
     * @param {Array} params.tables - Lista de mesas
     * @param {Object} params.connectedClients - Clientes conectados
     * @param {Object} params.actions - Ações disponíveis
     * @param {Function} h - React.createElement
     * @returns {ReactElement} UI principal
     */
    getGameMainUI: ({ gameState, tables, connectedClients, actions, h }) => {
        return null;
    },
    
    // ==========================================
    // UI DO CLIENTE
    // ==========================================
    
    /**
     * Retorna UI específica do jogo para o cliente
     * @param {Object} params
     * @param {Object} params.gameData - Dados do jogo do Firebase
     * @param {Object} params.tableData - Dados da mesa do cliente
     * @param {Object} params.actions - Ações do cliente
     * @param {Function} h - React.createElement
     * @returns {ReactElement} UI do cliente
     */
    getClientUI: ({ gameData, tableData, actions, h }) => {
        return null;
    },
    
    // ==========================================
    // LÓGICA DO JOGO
    // ==========================================
    
    /**
     * Processa uma ação do jogo e retorna o novo estado
     * @param {Object} action - Ação a processar { type: string, payload: any }
     * @param {Object} currentState - Estado atual
     * @param {Array} tables - Lista de mesas
     * @returns {Object} Novo estado { gameState, tables }
     */
    processAction: (action, currentState, tables) => {
        return { gameState: currentState, tables };
    },
    
    /**
     * Retorna o estado a sincronizar com Firebase
     * @param {Object} gameState - Estado do jogo
     * @param {Object} config - Configuração do jogo
     * @returns {Object} Dados para Firebase
     */
    getFirebaseState: (gameState, config) => {
        return {};
    },
    
    // ==========================================
    // LIFECYCLE
    // ==========================================
    
    /**
     * Chamado quando uma sessão inicia
     * @param {Object} config - Configuração do jogo
     * @returns {Object} Estado inicial do jogo
     */
    onSessionStart: (config) => {
        return {};
    },
    
    /**
     * Chamado quando uma sessão termina
     * @param {Object} gameState - Estado final do jogo
     * @returns {Object} Dados para guardar no histórico
     */
    onSessionEnd: (gameState) => {
        return {};
    }
};

// Exportar a interface como referência
window.GameInterface = GameInterfaceExample;
