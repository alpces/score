/**
 * Jogo Genérico - Contador de Pontos
 * 
 * Funcionalidades:
 * - Pontuação manual (+1, -1, +5)
 * - Buzzers com bloqueio
 * - Respostas de texto com temporizador
 * - Categorias sorteaveis
 * - Leaderboard com revelação
 * 
 * @fileoverview Módulo do jogo genérico de contagem de pontos
 */

const GenericGame = {
    // ==========================================
    // METADADOS
    // ==========================================
    id: 'generic',
    name: 'Contador Genérico',
    description: 'Sistema de pontuação manual com buzzers e respostas de texto',
    icon: '🎯',
    
    // ==========================================
    // CONFIGURAÇÃO
    // ==========================================
    
    getDefaultConfig: () => ({
        enableBuzzer: true,
        enableTextInput: false,
        startWithBuzzersBlocked: true,
        blockBuzzerAtZero: false,
        buzzerText: 'BUZZER',
        numTables: 0,
        initialScore: 0,
        textInputSeconds: 25
    }),
    
    /**
     * UI de configuração específica do jogo genérico
     */
    getConfigUI: (config, setConfig, h) => {
        return h('div', { className: 'space-y-4' },
            // Funcionalidades dos Clientes
            h('div', { className: 'bg-blue-50 p-3 rounded-lg border-2 border-blue-200' },
                h('label', { className: 'block text-sm font-semibold mb-3 text-blue-900' }, 'Funcionalidades dos Clientes:'),
                h('div', { className: 'space-y-2' },
                    // Buzzer
                    h('div', { className: 'flex items-center gap-2' },
                        h('input', { 
                            type: 'checkbox', 
                            id: 'enableBuzzer', 
                            checked: config.enableBuzzer, 
                            onChange: e => setConfig({ ...config, enableBuzzer: e.target.checked }), 
                            className: 'w-4 h-4' 
                        }),
                        h('label', { htmlFor: 'enableBuzzer', className: 'text-sm font-semibold text-gray-700' }, 'Ativar Buzzer')
                    ),
                    // Sub-opção: Buzzers bloqueados no início
                    config.enableBuzzer && h('div', { className: 'flex items-center gap-2 ml-6' },
                        h('input', { 
                            type: 'checkbox', 
                            id: 'startWithBuzzersBlocked', 
                            checked: config.startWithBuzzersBlocked, 
                            onChange: e => setConfig({ ...config, startWithBuzzersBlocked: e.target.checked }), 
                            className: 'w-4 h-4' 
                        }),
                        h('label', { htmlFor: 'startWithBuzzersBlocked', className: 'text-sm text-gray-600' }, 'Buzzers bloqueados no início')
                    ),
                    // Campo de Texto
                    h('div', { className: 'flex items-center gap-2' },
                        h('input', { 
                            type: 'checkbox', 
                            id: 'enableTextInput', 
                            checked: config.enableTextInput, 
                            onChange: e => setConfig({ ...config, enableTextInput: e.target.checked }), 
                            className: 'w-4 h-4' 
                        }),
                        h('label', { htmlFor: 'enableTextInput', className: 'text-sm font-semibold text-gray-700' }, 'Ativar Campo de Texto (Respostas)')
                    )
                )
            ),
            
            // Número de Mesas
            h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, 'Número de Mesas (0 = Dinâmico, máx: 20)'),
                h('input', { 
                    type: 'number', 
                    min: 0, 
                    max: 20, 
                    value: config.numTables, 
                    onChange: e => setConfig({ ...config, numTables: Math.min(20, Math.max(0, +e.target.value || 0)) }), 
                    className: 'w-full px-4 py-2 border-2 rounded-lg focus:border-indigo-500 outline-none' 
                }),
                h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Se 0, as mesas aparecem à medida que os clientes se conectam')
            ),
            
            // Pontuação Inicial
            h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, 'Pontuação Inicial'),
                h('input', { 
                    type: 'number', 
                    min: 0, 
                    value: config.initialScore, 
                    onChange: e => setConfig({ ...config, initialScore: Math.max(0, +e.target.value || 0) }), 
                    className: 'w-full px-4 py-2 border-2 rounded-lg focus:border-indigo-500 outline-none' 
                })
            ),
            
            // Texto do Buzzer
            config.enableBuzzer && h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, 'Texto do Botão Buzzer'),
                h('input', { 
                    type: 'text', 
                    value: config.buzzerText, 
                    onChange: e => setConfig({ ...config, buzzerText: e.target.value }), 
                    placeholder: 'BUZZER', 
                    className: 'w-full px-4 py-2 border-2 rounded-lg focus:border-indigo-500 outline-none' 
                })
            ),
            
            // Bloquear buzzer a 0 pontos
            config.enableBuzzer && h('div', { className: 'flex items-center gap-2' },
                h('input', { 
                    type: 'checkbox', 
                    id: 'blockBuzzer', 
                    checked: config.blockBuzzerAtZero, 
                    onChange: e => setConfig({ ...config, blockBuzzerAtZero: e.target.checked }), 
                    className: 'w-4 h-4' 
                }),
                h('label', { htmlFor: 'blockBuzzer', className: 'text-sm font-semibold text-gray-700' }, 'Bloquear buzzer quando mesa tem 0 pontos')
            ),
            
            // Tempo para respostas
            config.enableTextInput && h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, 'Tempo para Respostas (segundos, 0 = ilimitado)'),
                h('input', { 
                    type: 'number', 
                    min: 0, 
                    value: config.textInputSeconds, 
                    onChange: e => setConfig({ ...config, textInputSeconds: Math.max(0, +e.target.value || 0) }), 
                    className: 'w-full px-4 py-2 border-2 rounded-lg focus:border-indigo-500 outline-none' 
                })
            )
        );
    },
    
    // ==========================================
    // ESTADO INICIAL
    // ==========================================
    
    onSessionStart: (config) => ({
        buzzersBlocked: config.enableBuzzer ? config.startWithBuzzersBlocked : false,
        textInputActive: false,
        textInputTimeRemaining: 0,
        yellowCategory: null,
        redCategory: null
    }),
    
    // ==========================================
    // FIREBASE STATE
    // ==========================================
    
    getFirebaseState: (gameState, config, tables, extra = {}) => ({
        gameType: 'generic',
        tables: tables.map(t => ({ id: t.id, name: t.name, score: t.score })),
        active: true,
        enableBuzzer: config.enableBuzzer,
        enableTextInput: config.enableTextInput,
        buzzerText: config.buzzerText,
        blockBuzzerAtZero: config.blockBuzzerAtZero,
        buzzersBlocked: gameState.buzzersBlocked,
        textInputActive: gameState.textInputActive,
        textInputTimeRemaining: gameState.textInputTimeRemaining,
        yellowCategory: gameState.yellowCategory,
        redCategory: gameState.redCategory,
        categories: extra.categories || [],
        selectedLogos: extra.selectedLogos || [],
        timestamp: Date.now()
    }),
    
    // ==========================================
    // AÇÕES DO JOGO
    // ==========================================
    
    processAction: (action, gameState, tables) => {
        switch (action.type) {
            case 'ADD_SCORE': {
                const { tableId, amount } = action.payload;
                const newTables = tables.map(t => 
                    t.id === tableId 
                        ? { ...t, score: Math.max(0, t.score + amount) }
                        : t
                );
                return { gameState, tables: newTables };
            }
            
            case 'SET_SCORE': {
                const { tableId, score } = action.payload;
                const newTables = tables.map(t => 
                    t.id === tableId 
                        ? { ...t, score: Math.max(0, score) }
                        : t
                );
                return { gameState, tables: newTables };
            }
            
            case 'RESET_ALL_SCORES': {
                const initialScore = action.payload?.initialScore || 0;
                const newTables = tables.map(t => ({ ...t, score: initialScore }));
                return { gameState, tables: newTables };
            }
            
            case 'TOGGLE_BUZZERS_BLOCKED': {
                return {
                    gameState: { ...gameState, buzzersBlocked: !gameState.buzzersBlocked },
                    tables
                };
            }
            
            case 'SET_BUZZERS_BLOCKED': {
                return {
                    gameState: { ...gameState, buzzersBlocked: action.payload },
                    tables
                };
            }
            
            case 'ACTIVATE_TEXT_INPUT': {
                const { seconds } = action.payload;
                return {
                    gameState: { 
                        ...gameState, 
                        textInputActive: true, 
                        textInputTimeRemaining: seconds 
                    },
                    tables
                };
            }
            
            case 'DEACTIVATE_TEXT_INPUT': {
                return {
                    gameState: { 
                        ...gameState, 
                        textInputActive: false, 
                        textInputTimeRemaining: 0 
                    },
                    tables
                };
            }
            
            case 'TICK_TEXT_INPUT': {
                if (gameState.textInputTimeRemaining > 0) {
                    const newRemaining = gameState.textInputTimeRemaining - 1;
                    return {
                        gameState: { 
                            ...gameState, 
                            textInputTimeRemaining: newRemaining,
                            textInputActive: newRemaining > 0 || action.payload?.isUnlimited
                        },
                        tables
                    };
                }
                return { gameState, tables };
            }
            
            case 'SET_CATEGORY': {
                const { color, category } = action.payload;
                if (color === 'yellow') {
                    return {
                        gameState: { ...gameState, yellowCategory: category },
                        tables
                    };
                } else if (color === 'red') {
                    return {
                        gameState: { ...gameState, redCategory: category },
                        tables
                    };
                }
                return { gameState, tables };
            }
            
            default:
                return { gameState, tables };
        }
    },
    
    // ==========================================
    // UI - CONTROLOS DO MASTER (Barra Inferior)
    // ==========================================
    
    getGameControlsUI: ({ gameState, config, tables, actions, h }) => {
        const { 
            buzzersBlocked, 
            textInputActive, 
            textInputTimeRemaining 
        } = gameState;
        
        return h('div', { className: 'flex gap-2 items-center' },
            // Botão de bloqueio de buzzers
            config.enableBuzzer && h('button', { 
                onClick: () => actions.dispatch({ type: 'TOGGLE_BUZZERS_BLOCKED' }), 
                className: `px-4 py-2 text-sm text-white rounded-lg font-bold transition-all ${
                    buzzersBlocked 
                        ? 'bg-purple-600 hover:bg-purple-700 btn-pulse-purple' 
                        : 'bg-gray-500 hover:bg-gray-600'
                }`
            }, buzzersBlocked ? '🔓 Desbloquear Buzzers' : '🔒 Bloquear'),
            
            // Controlos de texto
            config.enableTextInput && h('div', { className: 'flex items-center gap-2 ml-4 pl-4 border-l-2 border-gray-300' },
                h('input', {
                    type: 'number',
                    value: config.textInputSeconds,
                    onChange: (e) => actions.setConfig({ 
                        ...config, 
                        textInputSeconds: Math.max(0, parseInt(e.target.value) || 0) 
                    }),
                    disabled: textInputActive,
                    className: 'w-16 px-2 py-1.5 text-xs border-2 border-gray-300 rounded text-center font-bold',
                    placeholder: '25'
                }),
                h('span', { className: 'text-xs text-gray-600' }, 's'),
                h('button', { 
                    onClick: () => actions.dispatch({ 
                        type: 'ACTIVATE_TEXT_INPUT', 
                        payload: { seconds: config.textInputSeconds } 
                    }),
                    disabled: textInputActive,
                    className: `px-5 py-2.5 text-sm rounded-lg font-bold transition-all ${
                        textInputActive 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white btn-pulse-green'
                    }`
                }, textInputActive 
                    ? (config.textInputSeconds === 0 ? '✓ Ativo (∞)' : `⏱️ ${textInputTimeRemaining}s`) 
                    : '📝 ATIVAR TEXTO')
            )
        );
    },
    
    // ==========================================
    // UI - ÁREA PRINCIPAL DO MASTER
    // ==========================================
    
    /**
     * Gera a UI das mesas (grid com pontuação)
     * Esta é a parte específica do jogo genérico
     */
    getTableUI: ({ table, config, connectedClients, buzzers, flashEffects, actions, h }) => {
        const client = connectedClients[table.id];
        const buzzerData = buzzers[table.id];
        const hasBuzzer = buzzerData?.pressed;
        
        return h('div', { 
            key: table.id, 
            className: `bg-white rounded-xl shadow-lg p-3 transition-all ${
                flashEffects[table.id] || ''
            } ${hasBuzzer ? 'ring-4 ring-blue-500 animate-pulse' : ''}`
        },
            // Header da mesa
            h('div', { className: 'flex justify-between items-center mb-2' },
                h('div', null,
                    h('span', { className: 'text-xs text-gray-500' }, `Mesa ${table.id}`),
                    client && h('span', { className: 'ml-2 text-xs text-green-600' }, '● Online')
                ),
                hasBuzzer && h('span', { className: 'text-xl' }, '🔔')
            ),
            
            // Nome da equipa
            h('div', { className: 'font-bold text-gray-800 truncate mb-2' }, 
                table.name || client?.teamName || `Mesa ${table.id}`
            ),
            
            // Pontuação
            h('div', { className: 'text-3xl font-black text-center text-purple-600 mb-2' }, 
                table.score
            ),
            
            // Botões de pontuação
            h('div', { className: 'flex gap-1 justify-center' },
                h('button', { 
                    onClick: () => actions.dispatch({ type: 'ADD_SCORE', payload: { tableId: table.id, amount: -1 } }),
                    className: 'px-3 py-1 bg-red-500 text-white rounded font-bold hover:bg-red-600 text-sm'
                }, '-1'),
                h('button', { 
                    onClick: () => actions.dispatch({ type: 'ADD_SCORE', payload: { tableId: table.id, amount: 1 } }),
                    className: 'px-3 py-1 bg-green-500 text-white rounded font-bold hover:bg-green-600 text-sm'
                }, '+1'),
                h('button', { 
                    onClick: () => actions.dispatch({ type: 'ADD_SCORE', payload: { tableId: table.id, amount: 5 } }),
                    className: 'px-3 py-1 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 text-sm'
                }, '+5')
            )
        );
    },
    
    // ==========================================
    // UI DO CLIENTE
    // ==========================================
    
    getClientUI: ({ gameData, myTable, buzzerState, textInput, actions, h }) => {
        const showBuzzer = gameData?.enableBuzzer;
        const showTextInput = gameData?.enableTextInput && gameData?.textInputActive;
        const buzzersBlocked = gameData?.buzzersBlocked;
        const blockedByZeroScore = gameData?.blockBuzzerAtZero && myTable?.score === 0;
        const textTimeRemaining = gameData?.textInputTimeRemaining || 0;
        const isUnlimitedTime = showTextInput && textTimeRemaining === 0;
        
        return h('div', { className: 'flex-1 flex flex-col items-center justify-center gap-4' },
            // Buzzer
            showBuzzer && h('button', {
                onClick: actions.pressBuzzer,
                disabled: !buzzerState.enabled || buzzerState.pressed || blockedByZeroScore || buzzersBlocked,
                className: `${showTextInput ? 'w-44 h-44 sm:w-48 sm:h-48' : 'w-56 h-56 sm:w-64 sm:h-64'} rounded-full text-white font-black text-2xl sm:text-3xl shadow-2xl transition-all transform ${
                    buzzersBlocked
                        ? 'bg-gray-400 cursor-not-allowed'
                        : (!buzzerState.enabled || buzzerState.pressed || blockedByZeroScore)
                            ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                            : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                }`
            }, h('div', { className: 'flex flex-col items-center gap-2' },
                h('div', { className: 'text-5xl' }, 
                    buzzersBlocked ? '⏳' : (buzzerState.pressed || blockedByZeroScore ? '🔒' : '🔔')
                ),
                h('div', null, 
                    buzzersBlocked ? 'Aguarde' : (buzzerState.pressed || blockedByZeroScore ? 'BLOQUEADO' : (gameData?.buzzerText || 'BUZZER'))
                )
            )),
            
            // Campo de texto
            showTextInput && h('div', { className: 'w-full max-w-2xl relative z-20' },
                h('div', { className: 'bg-indigo-50 rounded-2xl shadow-2xl p-4' },
                    !isUnlimitedTime && textTimeRemaining > 0 && h('div', { className: 'mb-2 text-center' },
                        h('span', { className: 'text-sm font-bold text-indigo-600' }, `⏱️ Tempo restante: ${textTimeRemaining}s`)
                    ),
                    isUnlimitedTime && h('div', { className: 'mb-2 text-center' },
                        h('span', { className: 'text-sm font-bold text-green-600' }, `✓ Tempo ilimitado`)
                    ),
                    h('textarea', {
                        value: textInput.value,
                        onChange: actions.onTextChange,
                        disabled: !isUnlimitedTime && textTimeRemaining === 0,
                        maxLength: 250,
                        placeholder: (!isUnlimitedTime && textTimeRemaining === 0) ? 'Tempo esgotado!' : 'Escreve a tua resposta...',
                        className: `w-full h-32 px-4 py-3 text-lg border-2 rounded-lg resize-none focus:outline-none ${
                            !isUnlimitedTime && textTimeRemaining === 0
                                ? 'border-gray-300 bg-gray-100 cursor-not-allowed' 
                                : 'border-purple-500 focus:border-purple-600'
                        }`
                    }),
                    h('div', { className: 'flex justify-between items-center mt-2' },
                        h('span', { className: 'text-xs text-gray-500' }, `${textInput.value.length}/250`),
                        h('button', {
                            onClick: actions.submitText,
                            disabled: !textInput.value.trim() || (!isUnlimitedTime && textTimeRemaining === 0) || textInput.isSubmitting,
                            className: `px-8 py-3 rounded-lg font-bold text-lg transition-all active:scale-95 ${
                                textInput.isSubmitting
                                    ? 'bg-yellow-500 text-white cursor-wait'
                                    : textInput.justSubmitted
                                        ? 'bg-green-500 text-white'
                                        : (!textInput.value.trim() || (!isUnlimitedTime && textTimeRemaining === 0))
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                            }`
                        }, textInput.isSubmitting ? '⏳ A enviar...' : (textInput.justSubmitted ? '✓ Enviado' : '📤 Enviar'))
                    )
                )
            )
        );
    },
    
    // ==========================================
    // HISTÓRICO
    // ==========================================
    
    onSessionEnd: (gameState, tables, config) => ({
        gameType: 'generic',
        tables: tables.map(t => ({ id: t.id, name: t.name, score: t.score })),
        buzzerText: config.buzzerText,
        blockBuzzerAtZero: config.blockBuzzerAtZero,
        enableBuzzer: config.enableBuzzer,
        enableTextInput: config.enableTextInput
    })
};

// Exportar para uso global
window.GenericGame = GenericGame;

// Registar no sistema de jogos
if (!window.GameModules) {
    window.GameModules = {};
}
window.GameModules.generic = GenericGame;
