/**
 * Sistema de Gestão de Módulos de Jogos
 * 
 * Este ficheiro gere o carregamento e registo de módulos de jogos.
 * Cada jogo implementa a interface definida em game-interface.js
 * 
 * @fileoverview Sistema central de gestão de jogos
 */

const GameSystem = {
    // Módulos registados
    modules: {},
    
    // Módulo atual em uso
    currentModule: null,
    
    /**
     * Registar um módulo de jogo
     * @param {Object} module - Módulo que implementa GameInterface
     */
    register: function(module) {
        if (!module.id) {
            console.error('Módulo sem ID não pode ser registado');
            return false;
        }
        
        if (this.modules[module.id]) {
            console.warn(`Módulo ${module.id} já existe, a substituir...`);
        }
        
        this.modules[module.id] = module;
        console.log(`✅ Módulo registado: ${module.name} (${module.id})`);
        return true;
    },
    
    /**
     * Obter um módulo pelo ID
     * @param {string} id - ID do módulo
     * @returns {Object|null} Módulo ou null se não existir
     */
    get: function(id) {
        return this.modules[id] || null;
    },
    
    /**
     * Obter lista de todos os módulos disponíveis
     * @returns {Array} Lista de módulos
     */
    list: function() {
        return Object.values(this.modules).map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            icon: m.icon
        }));
    },
    
    /**
     * Definir o módulo atual
     * @param {string} id - ID do módulo a usar
     * @returns {boolean} Sucesso
     */
    setCurrent: function(id) {
        const module = this.get(id);
        if (!module) {
            console.error(`Módulo ${id} não encontrado`);
            return false;
        }
        this.currentModule = module;
        console.log(`🎮 Módulo ativo: ${module.name}`);
        return true;
    },
    
    /**
     * Obter o módulo atual
     * @returns {Object|null} Módulo atual
     */
    getCurrent: function() {
        return this.currentModule;
    },
    
    /**
     * Verificar se um módulo existe
     * @param {string} id - ID do módulo
     * @returns {boolean}
     */
    has: function(id) {
        return !!this.modules[id];
    },
    
    /**
     * Obter configuração padrão do módulo
     * @param {string} id - ID do módulo
     * @returns {Object} Configuração padrão
     */
    getDefaultConfig: function(id) {
        const module = this.get(id);
        if (!module || !module.getDefaultConfig) {
            return {};
        }
        return module.getDefaultConfig();
    },
    
    /**
     * Processar uma ação do jogo
     * @param {string} moduleId - ID do módulo
     * @param {Object} action - Ação a processar
     * @param {Object} gameState - Estado atual
     * @param {Array} tables - Mesas
     * @returns {Object} Novo estado
     */
    processAction: function(moduleId, action, gameState, tables) {
        const module = this.get(moduleId);
        if (!module || !module.processAction) {
            console.error(`Módulo ${moduleId} não tem processAction`);
            return { gameState, tables };
        }
        return module.processAction(action, gameState, tables);
    },
    
    /**
     * Iniciar uma sessão com um módulo
     * @param {string} moduleId - ID do módulo
     * @param {Object} config - Configuração
     * @returns {Object} Estado inicial do jogo
     */
    startSession: function(moduleId, config) {
        const module = this.get(moduleId);
        if (!module || !module.onSessionStart) {
            return {};
        }
        return module.onSessionStart(config);
    },
    
    /**
     * Obter estado para Firebase
     * @param {string} moduleId - ID do módulo
     * @param {Object} gameState - Estado do jogo
     * @param {Object} config - Configuração
     * @param {Array} tables - Mesas
     * @param {Object} extra - Dados extras
     * @returns {Object} Estado para Firebase
     */
    getFirebaseState: function(moduleId, gameState, config, tables, extra) {
        const module = this.get(moduleId);
        if (!module || !module.getFirebaseState) {
            return { gameType: moduleId, tables, active: true };
        }
        return module.getFirebaseState(gameState, config, tables, extra);
    }
};

// Exportar para uso global
window.GameSystem = GameSystem;

// Auto-registar módulos já carregados
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há módulos em GameModules
    if (window.GameModules) {
        Object.values(window.GameModules).forEach(module => {
            GameSystem.register(module);
        });
    }
    
    // Definir genérico como padrão se existir
    if (GameSystem.has('generic')) {
        GameSystem.setCurrent('generic');
    }
});

// Também verificar imediatamente
if (window.GameModules) {
    Object.values(window.GameModules).forEach(module => {
        GameSystem.register(module);
    });
    if (GameSystem.has('generic')) {
        GameSystem.setCurrent('generic');
    }
}
