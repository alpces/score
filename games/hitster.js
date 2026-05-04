/**
 * ============================================================================
 * HITSTER - Módulo de Jogo
 * ============================================================================
 *
 * Jogo de música onde as equipas adivinham o ano, artista ou título de músicas.
 * A equipa em último lugar canta a próxima música (modo cantora).
 * O joker duplica os pontos ganhos na ronda.
 *
 * FASES DO JOGO:
 * - waiting:      À espera de nova ronda
 * - joker_window: Janela de tempo para usar o joker (duplica pontos)
 * - answering:    Equipas submetem respostas de texto
 * - reviewing:    Master valida respostas e pontua
 *
 * REGRAS DO JOKER:
 * - Disponível apenas na fase joker_window
 * - Cada equipa só pode usar uma vez por jogo
 * - A equipa cantora NÃO pode usar joker
 * - Categorias Timeline NÃO permitem joker
 * - A ordem de uso do joker desempata em caso de pontuações iguais
 *
 * REGRAS DA CANTORA:
 * - A equipa em último lugar canta a música
 * - A equipa cantora não responde, mas ganha pontos se as outras acertarem
 * - Para cada resposta correta das outras equipas (máx. 3), a cantora ganha os pts da categoria
 *
 * @fileoverview Módulo do jogo Hitster para o sistema de pontuação modular
 * @version 1.0.0
 * @author ALPCeS - Ludonautas
 */

const HitsterGame = {

    // =========================================================================
    // METADADOS DO MÓDULO
    // =========================================================================

    id: 'hitster',
    name: 'Hitster',
    description: 'Adivinha o ano, artista ou título de músicas com joker e modo cantora',
    icon: '🎵',

    // =========================================================================
    // CATEGORIAS PADRÃO
    // =========================================================================

    DEFAULT_CATEGORIES: [
        { id: 'exact_year', name: 'Ano Exato',    description: 'O ano exato em que a música saiu',       points: 5 },
        { id: 'year_3',     name: 'Ano ±3',       description: 'Dentro de 3 anos do ano certo',           points: 4 },
        { id: 'title',      name: 'Título',        description: 'O título da canção',                      points: 3 },
        { id: 'artist',     name: 'Artista',       description: 'O nome do grupo ou solista',              points: 2 },
        { id: 'decade',     name: 'Década',        description: 'A década em que a música saiu',           points: 1 },
        { id: 'timeline',   name: 'Timeline Duel', description: 'Final do jogo — posiciona na timeline',   points: 1, isTimeline: true }
    ],

    // =========================================================================
    // CONFIGURAÇÃO PADRÃO
    // =========================================================================

    /**
     * Retorna a configuração padrão do jogo.
     * Estas opções aparecem no ecrã de setup do master.
     */
    getDefaultConfig: function() {
        return {
            categories: [
                { id: 'exact_year', name: 'Ano Exato',    description: 'O ano exato em que a música saiu',       points: 5 },
                { id: 'year_3',     name: 'Ano ±3',       description: 'Dentro de 3 anos do ano certo',           points: 4 },
                { id: 'title',      name: 'Título',        description: 'O título da canção',                      points: 3 },
                { id: 'artist',     name: 'Artista',       description: 'O nome do grupo ou solista',              points: 2 },
                { id: 'decade',     name: 'Década',        description: 'A década em que a música saiu',           points: 1 },
                { id: 'timeline',   name: 'Timeline Duel', description: 'Final do jogo — posiciona na timeline',   points: 1, isTimeline: true }
            ],
            jokerTimeSeconds: 10,
            answerTimeSeconds: 25
        };
    },

    // =========================================================================
    // UI DE CONFIGURAÇÃO
    // =========================================================================

    /**
     * UI de configuração específica do Hitster.
     * Aparece no ecrã de setup do master.
     *
     * @param {Object}   config    - Configuração atual
     * @param {Function} setConfig - Função para atualizar configuração
     * @param {Function} h         - React.createElement
     * @returns {ReactElement}
     */
    getConfigUI: function(config, setConfig, h) {
        var cats = config.categories || HitsterGame.DEFAULT_CATEGORIES;

        return h('div', { className: 'space-y-4' },

            // Descrição do jogo
            h('div', { className: 'bg-violet-50 p-3 rounded-lg border-2 border-violet-300' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'text-2xl' }, '🎵'),
                    h('span', { className: 'font-bold text-violet-800' }, 'Hitster')
                ),
                h('p', { className: 'text-sm text-violet-700' },
                    'Jogo de música: adivinha o ano, artista ou título. A equipa em último lugar canta a próxima música. O joker duplica os pontos.'
                )
            ),

            // Tempos
            h('div', { className: 'grid grid-cols-2 gap-4' },
                h('div', null,
                    h('label', { className: 'block text-sm font-semibold mb-1' }, '⏱️ Tempo do Joker (s)'),
                    h('input', {
                        type: 'number', min: 5, max: 30,
                        value: config.jokerTimeSeconds || 10,
                        onChange: function(e) {
                            setConfig(Object.assign({}, config, {
                                jokerTimeSeconds: Math.max(5, Math.min(30, parseInt(e.target.value) || 10))
                            }));
                        },
                        className: 'w-full px-3 py-2 border-2 rounded-lg text-center font-bold focus:border-violet-500 outline-none'
                    })
                ),
                h('div', null,
                    h('label', { className: 'block text-sm font-semibold mb-1' }, '⏱️ Tempo de Resposta (s)'),
                    h('input', {
                        type: 'number', min: 10, max: 60,
                        value: config.answerTimeSeconds || 25,
                        onChange: function(e) {
                            setConfig(Object.assign({}, config, {
                                answerTimeSeconds: Math.max(10, Math.min(60, parseInt(e.target.value) || 25))
                            }));
                        },
                        className: 'w-full px-3 py-2 border-2 rounded-lg text-center font-bold focus:border-violet-500 outline-none'
                    })
                )
            ),

            // Categorias editáveis
            h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, '🏷️ Categorias e Pontuações'),
                h('div', { className: 'space-y-2' },
                    cats.map(function(cat, idx) {
                        return h('div', { key: cat.id, className: 'flex gap-2 items-center' },
                            h('span', { className: 'text-xs text-gray-500 w-5 flex-shrink-0' }, (idx + 1) + '.'),
                            h('input', {
                                type: 'text', value: cat.name,
                                onChange: function(e) {
                                    var nc = cats.slice();
                                    nc[idx] = Object.assign({}, nc[idx], { name: e.target.value });
                                    setConfig(Object.assign({}, config, { categories: nc }));
                                },
                                className: 'flex-1 px-2 py-1.5 border rounded text-sm focus:border-violet-500 outline-none'
                            }),
                            h('input', {
                                type: 'number', min: 1, max: 20, value: cat.points,
                                onChange: function(e) {
                                    var nc = cats.slice();
                                    nc[idx] = Object.assign({}, nc[idx], { points: Math.max(1, parseInt(e.target.value) || 1) });
                                    setConfig(Object.assign({}, config, { categories: nc }));
                                },
                                className: 'w-14 px-2 py-1.5 border rounded text-sm text-center font-bold focus:border-violet-500 outline-none'
                            }),
                            h('span', { className: 'text-xs text-gray-500' }, 'pts'),
                            cat.isTimeline && h('span', { className: 'text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full' }, 'Final')
                        );
                    })
                )
            )
        );
    },

    // =========================================================================
    // ESTADO INICIAL (LIFECYCLE)
    // =========================================================================

    /**
     * Cria o estado inicial quando uma sessão começa.
     *
     * @param {Object} config - Configuração do jogo
     * @returns {Object} Estado inicial
     */
    onSessionStart: function(config) {
        return {
            phase: 'waiting',
            currentCategory: null,
            jokerTimerEndAt: 0,
            answerTimerEndAt: 0,
            jokerOrder: [],       // Ordem global de uso de joker (para desempate)
            roundJokers: [],      // Quem usou joker nesta ronda
            singingTeamId: null,  // ID da equipa cantora
            showScores: true,
            tablesLocked: false,
            roundNumber: 1
        };
    },

    /**
     * Prepara dados para guardar no histórico quando a sessão termina.
     *
     * @param {Object} gameState - Estado final
     * @param {Array}  tables    - Lista de mesas
     * @param {Object} config    - Configuração
     * @returns {Object}
     */
    onSessionEnd: function(gameState, tables, config) {
        return {
            gameType: 'hitster',
            roundNumber: gameState.roundNumber || 1,
            tables: tables.map(function(t) {
                return { id: t.id, name: t.name, score: t.score };
            })
        };
    },

    // =========================================================================
    // PROCESSAMENTO DE AÇÕES
    // =========================================================================

    /**
     * Processa uma ação e retorna o novo estado.
     *
     * AÇÕES DISPONÍVEIS:
     * - START_ROUND         : Inicia ronda com categoria e (opcionalmente) equipa cantora
     * - END_JOKER_WINDOW    : Termina janela do joker, inicia fase de resposta
     * - END_ANSWERING       : Termina fase de resposta, inicia revisão
     * - CONFIRM_SCORES      : Valida respostas e atualiza pontuações
     * - CANCEL_ROUND        : Cancela ronda atual sem pontuar
     * - PRESS_JOKER         : Equipa ativa o joker
     * - TOGGLE_SHOW_SCORES  : Liga/desliga visibilidade das pontuações (master)
     * - RESET_SCORES        : Repõe pontuações e jokers a zero
     *
     * @param {Object} action    - { type, payload }
     * @param {Object} gameState - Estado atual
     * @param {Array}  tables    - Lista de mesas
     * @returns {{ gameState, tables }}
     */
    processAction: function(action, gameState, tables) {
        switch (action.type) {

            // -----------------------------------------------------------------
            // INICIAR RONDA
            // -----------------------------------------------------------------
            case 'START_ROUND': {
                var cat = action.payload.category;
                var singing = action.payload.singingTeamId || null;
                var jokerSecs = action.payload.jokerTimeSeconds || 10;
                var now = Date.now();
                return {
                    gameState: Object.assign({}, gameState, {
                        phase: 'joker_window',
                        currentCategory: cat,
                        singingTeamId: singing,
                        roundJokers: [],
                        jokerTimerEndAt: now + jokerSecs * 1000,
                        answerTimerEndAt: 0
                    }),
                    tables: tables
                };
            }

            // -----------------------------------------------------------------
            // TERMINAR JANELA DO JOKER
            // -----------------------------------------------------------------
            case 'END_JOKER_WINDOW': {
                var answerSecs = action.payload ? (action.payload.answerTimeSeconds || 25) : 25;
                var now2 = Date.now();
                return {
                    gameState: Object.assign({}, gameState, {
                        phase: 'answering',
                        jokerTimerEndAt: 0,
                        answerTimerEndAt: now2 + answerSecs * 1000
                    }),
                    tables: tables
                };
            }

            // -----------------------------------------------------------------
            // TERMINAR FASE DE RESPOSTA
            // -----------------------------------------------------------------
            case 'END_ANSWERING': {
                return {
                    gameState: Object.assign({}, gameState, {
                        phase: 'reviewing',
                        answerTimerEndAt: 0
                    }),
                    tables: tables
                };
            }

            // -----------------------------------------------------------------
            // EQUIPA PRESSIONA JOKER
            // -----------------------------------------------------------------
            case 'PRESS_JOKER': {
                var tableId = action.payload.tableId;

                // Só válido na janela do joker
                if (gameState.phase !== 'joker_window') return { gameState: gameState, tables: tables };
                // Já usou nesta sessão
                if ((gameState.jokerOrder || []).indexOf(tableId) >= 0) return { gameState: gameState, tables: tables };
                // Equipa cantora não pode usar joker
                if (gameState.singingTeamId === tableId) return { gameState: gameState, tables: tables };
                // Timeline não permite joker
                if (gameState.currentCategory && gameState.currentCategory.isTimeline) return { gameState: gameState, tables: tables };

                return {
                    gameState: Object.assign({}, gameState, {
                        jokerOrder: (gameState.jokerOrder || []).concat([tableId]),
                        roundJokers: (gameState.roundJokers || []).concat([tableId])
                    }),
                    tables: tables.map(function(t) {
                        return t.id === tableId ? Object.assign({}, t, { jokerUsed: true }) : t;
                    })
                };
            }

            // -----------------------------------------------------------------
            // CONFIRMAR PONTUAÇÕES (validação de respostas)
            // -----------------------------------------------------------------
            case 'CONFIRM_SCORES': {
                var pts = gameState.currentCategory ? gameState.currentCategory.points : 0;
                var singingId = gameState.singingTeamId;
                var correctIds = action.payload.correctTableIds || [];
                var roundJokers = gameState.roundJokers || [];

                // Equipas que acertaram, excluindo a cantora
                var correctNonSinging = correctIds.filter(function(id) { return id !== singingId; });

                // Atualizar pontuações
                var newTables = tables.map(function(t) {
                    if (t.id === singingId) return t; // cantora trata-se separado
                    if (correctIds.indexOf(t.id) < 0) return t; // errou
                    var mult = roundJokers.indexOf(t.id) >= 0 ? 2 : 1; // joker duplica
                    return Object.assign({}, t, { score: t.score + pts * mult });
                });

                // Equipa cantora ganha pontos pelas respostas certas das outras (máx. 3)
                if (singingId !== null) {
                    var sp = Math.min(correctNonSinging.length, 3) * pts;
                    newTables = newTables.map(function(t) {
                        return t.id === singingId ? Object.assign({}, t, { score: t.score + sp }) : t;
                    });
                }

                return {
                    gameState: Object.assign({}, gameState, {
                        phase: 'waiting',
                        currentCategory: null,
                        singingTeamId: null,
                        roundJokers: [],
                        jokerTimerEndAt: 0,
                        answerTimerEndAt: 0,
                        roundNumber: (gameState.roundNumber || 1) + 1
                    }),
                    tables: newTables
                };
            }

            // -----------------------------------------------------------------
            // CANCELAR RONDA
            // -----------------------------------------------------------------
            case 'CANCEL_ROUND': {
                return {
                    gameState: Object.assign({}, gameState, {
                        phase: 'waiting',
                        currentCategory: null,
                        singingTeamId: null,
                        roundJokers: [],
                        jokerTimerEndAt: 0,
                        answerTimerEndAt: 0
                    }),
                    tables: tables
                };
            }

            // -----------------------------------------------------------------
            // TOGGLE MOSTRAR PONTUAÇÕES
            // -----------------------------------------------------------------
            case 'TOGGLE_SHOW_SCORES': {
                return {
                    gameState: Object.assign({}, gameState, { showScores: !gameState.showScores }),
                    tables: tables
                };
            }

            // -----------------------------------------------------------------
            // REPOR PONTUAÇÕES E JOKERS
            // -----------------------------------------------------------------
            case 'RESET_SCORES': {
                return {
                    gameState: Object.assign({}, gameState, {
                        jokerOrder: [],
                        roundJokers: [],
                        roundNumber: 1
                    }),
                    tables: tables.map(function(t) {
                        return Object.assign({}, t, { score: 0, jokerUsed: false });
                    })
                };
            }

            // -----------------------------------------------------------------
            // AÇÃO DESCONHECIDA
            // -----------------------------------------------------------------
            default:
                console.warn('HitsterGame: Ação desconhecida: ' + action.type);
                return { gameState: gameState, tables: tables };
        }
    },

    // =========================================================================
    // ESTADO PARA FIREBASE
    // =========================================================================

    /**
     * Prepara o estado para sincronizar com o Firebase.
     * Este é o estado que os clientes vão receber.
     *
     * @param {Object} gameState - Estado do jogo
     * @param {Object} config    - Configuração
     * @param {Array}  tables    - Lista de mesas
     * @param {Object} extra     - Dados extras (logos, etc.)
     * @returns {Object} Estado para Firebase
     */
    getFirebaseState: function(gameState, config, tables, extra) {
        extra = extra || {};
        return {
            // Identificação
            gameType: 'hitster',
            active: true,
            timestamp: Date.now(),

            // Fase e categoria
            phase: gameState.phase || 'waiting',
            currentCategory: gameState.currentCategory || null,

            // Timers absolutos (clientes derivam o countdown localmente)
            jokerTimerEndAt: gameState.jokerTimerEndAt || 0,
            answerTimerEndAt: gameState.answerTimerEndAt || 0,

            // Jokers
            jokerOrder: gameState.jokerOrder || [],
            roundJokers: gameState.roundJokers || [],

            // Equipa cantora
            singingTeamId: gameState.singingTeamId || null,

            // Controles
            showScores: gameState.showScores !== false,
            tablesLocked: gameState.tablesLocked || false,
            roundNumber: gameState.roundNumber || 1,

            // Mesas (pontuações sincronizadas)
            tables: tables.map(function(t) {
                return { id: t.id, name: t.name, score: t.score, jokerUsed: t.jokerUsed || false };
            }),

            // Extras
            selectedLogos: extra.selectedLogos || []
        };
    },

    // =========================================================================
    // UI DO MASTER - CONTROLOS DO JOGO
    // =========================================================================

    /**
     * Gera os controlos que aparecem na barra inferior do master.
     *
     * @param {Object}   params.gameState - Estado atual
     * @param {Object}   params.config    - Configuração
     * @param {Array}    params.tables    - Mesas
     * @param {Object}   params.actions   - Ações disponíveis (dispatch, etc.)
     * @param {Function} h                - React.createElement
     * @returns {ReactElement}
     */
    getGameControlsUI: function(params) {
        var gameState = params.gameState;
        var config    = params.config;
        var tables    = params.tables;
        var actions   = params.actions;
        var h         = params.h;

        var phase       = gameState.phase || 'waiting';
        var cats        = (config && config.categories) || HitsterGame.DEFAULT_CATEGORIES;
        var roundNumber = gameState.roundNumber || 1;
        var jokerSecs   = (config && config.jokerTimeSeconds) || 10;
        var answerSecs  = (config && config.answerTimeSeconds) || 25;

        // Tempo restante (calculado no momento do render — não é reativo)
        var now       = Date.now();
        var jokerRem  = gameState.jokerTimerEndAt  ? Math.max(0, Math.ceil((gameState.jokerTimerEndAt  - now) / 1000)) : 0;
        var answerRem = gameState.answerTimerEndAt ? Math.max(0, Math.ceil((gameState.answerTimerEndAt - now) / 1000)) : 0;

        return h('div', { className: 'flex flex-wrap gap-2 items-center' },

            // --- Fase: À espera ---
            phase === 'waiting' && h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-sm font-semibold text-gray-600 mr-1' }, 'Ronda #' + roundNumber + ':'),
                cats.map(function(cat) {
                    return h('button', {
                        key: cat.id,
                        onClick: function() {
                            actions.dispatch({ type: 'START_ROUND', payload: { category: cat, jokerTimeSeconds: jokerSecs } });
                        },
                        className: 'px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ' +
                            (cat.isTimeline
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300'
                                : 'bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-300')
                    }, cat.name + ' (' + cat.points + 'pts)');
                })
            ),

            // --- Fase: Janela do Joker ---
            phase === 'joker_window' && h('div', { className: 'flex items-center gap-3' },
                h('span', { className: 'font-bold text-yellow-700 animate-pulse' },
                    '🃏 Joker: ' + jokerRem + 's'
                ),
                h('button', {
                    onClick: function() {
                        actions.dispatch({ type: 'END_JOKER_WINDOW', payload: { answerTimeSeconds: answerSecs } });
                    },
                    className: 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm'
                }, '▶ Responder'),
                h('button', {
                    onClick: function() { actions.dispatch({ type: 'CANCEL_ROUND' }); },
                    className: 'px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm'
                }, '✕ Cancelar')
            ),

            // --- Fase: A responder ---
            phase === 'answering' && h('div', { className: 'flex items-center gap-3' },
                h('span', { className: 'font-bold text-blue-700 ' + (answerRem <= 5 ? 'animate-pulse' : '') },
                    '✍️ ' + answerRem + 's'
                ),
                h('button', {
                    onClick: function() { actions.dispatch({ type: 'END_ANSWERING' }); },
                    className: 'px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm'
                }, '▶ Terminar Respostas'),
                h('button', {
                    onClick: function() { actions.dispatch({ type: 'CANCEL_ROUND' }); },
                    className: 'px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm'
                }, '✕ Cancelar')
            ),

            // --- Fase: Revisão ---
            phase === 'reviewing' && h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-sm font-semibold text-green-700' }, '✅ A validar respostas...')
            ),

            // --- Ações globais ---
            h('div', { className: 'ml-auto flex items-center gap-2' },
                h('button', {
                    onClick: function() { actions.dispatch({ type: 'TOGGLE_SHOW_SCORES' }); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' +
                        (gameState.showScores ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600')
                }, gameState.showScores ? '👁️ Ocultar pts' : '👁️ Mostrar pts'),

                h('button', {
                    onClick: function() {
                        if (!confirm('Repor TODAS as pontuações e jokers a 0?')) return;
                        actions.dispatch({ type: 'RESET_SCORES' });
                    },
                    className: 'px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold'
                }, '↺ Reset')
            )
        );
    },

    // =========================================================================
    // UI DO MASTER - MESA INDIVIDUAL
    // =========================================================================

    /**
     * Gera a UI de uma mesa individual no master.
     *
     * @param {Object}   params.table            - Dados da mesa
     * @param {Object}   params.gameState         - Estado do jogo
     * @param {Object}   params.connectedClients  - Clientes conectados
     * @param {Object}   params.textResponses      - Respostas de texto submetidas
     * @param {Function} h                        - React.createElement
     * @returns {ReactElement}
     */
    getTableUI: function(params) {
        var table            = params.table;
        var gameState        = params.gameState;
        var connectedClients = params.connectedClients || {};
        var textResponses    = params.textResponses || {};
        var h                = params.h;

        var client        = connectedClients[table.id];
        var resp          = textResponses[table.id];
        var isSinging     = gameState.singingTeamId === table.id;
        var usedJoker     = (gameState.roundJokers || []).indexOf(table.id) >= 0;
        var showScores    = gameState.showScores !== false;

        var borderClass = isSinging      ? 'border-purple-500 bg-purple-900/20' :
                          usedJoker      ? 'border-yellow-500' :
                          resp           ? 'border-blue-600' :
                                           'border-slate-700';

        return h('div', {
            key: table.id,
            className: 'bg-slate-800 rounded-xl border p-3 transition-all ' + borderClass
        },
            h('div', { className: 'flex justify-between items-start mb-1' },
                h('div', null,
                    h('div', { className: 'text-xs text-slate-500' }, 'Mesa ' + table.id),
                    client && h('span', { className: 'text-xs text-green-400' }, ' ● online')
                ),
                h('div', { className: 'flex gap-1' },
                    usedJoker  && h('span', { className: 'text-sm' }, '🃏'),
                    isSinging  && h('span', { className: 'text-sm' }, '🎤'),
                    resp       && h('span', { className: 'text-sm' }, '✍️')
                )
            ),
            h('div', { className: 'font-bold text-white text-sm truncate mb-2' }, table.name || ('Mesa ' + table.id)),
            showScores
                ? h('div', { className: 'text-3xl font-black text-violet-400 text-center mb-2' }, table.score)
                : h('div', { className: 'text-3xl font-black text-slate-600 text-center mb-2' }, '—')
        );
    },

    // =========================================================================
    // UI DO CLIENTE
    // =========================================================================

    /**
     * Gera a UI específica do Hitster para o cliente.
     *
     * NOTA: Esta função não tem acesso a React hooks. Os timers são calculados
     * estaticamente no momento do render. Para contagem regressiva em tempo real,
     * o host (client.html) deve usar um setInterval externo que force re-renders.
     *
     * @param {Object}   params.gameData    - Dados do Firebase (gameState)
     * @param {Object}   params.myTable     - Dados da mesa do cliente
     * @param {number}   params.tableNumber - Número da mesa
     * @param {Object}   params.actions     - Ações disponíveis
     * @param {Function} h                  - React.createElement
     * @returns {ReactElement}
     */
    getClientUI: function(params) {
        var gameData    = params.gameData;
        var myTable     = params.myTable;
        var tableNumber = params.tableNumber;
        var actions     = params.actions || {};
        var h           = params.h;

        var tableId    = parseInt(tableNumber || '0');
        var phase      = gameData ? (gameData.phase || 'waiting') : 'waiting';
        var cat        = gameData ? gameData.currentCategory : null;
        var jokerOrder = gameData ? (gameData.jokerOrder || []) : [];
        var singingId  = gameData ? (gameData.singingTeamId || null) : null;
        var isSinging  = singingId === tableId;
        var myJokerUsed = jokerOrder.indexOf(tableId) >= 0;
        var myScore    = myTable ? myTable.score : 0;
        var isTimeline = cat && cat.isTimeline;

        var jokerWindowOpen = phase === 'joker_window';
        var jokerEnabled    = jokerWindowOpen && !myJokerUsed && !isTimeline && !isSinging;

        // Tempo restante (calculado no momento do render)
        var now       = Date.now();
        var jokerRem  = gameData && gameData.jokerTimerEndAt
            ? Math.max(0, Math.ceil((gameData.jokerTimerEndAt  - now) / 1000)) : 0;
        var answerRem = gameData && gameData.answerTimerEndAt
            ? Math.max(0, Math.ceil((gameData.answerTimerEndAt - now) / 1000)) : 0;
        var timeUp    = answerRem === 0 && phase === 'answering' && (gameData ? (gameData.answerTimerEndAt || 0) : 0) > 0;

        return h('div', { className: 'flex-1 flex flex-col items-center justify-center gap-4 p-4' },

            // Pontuação (sempre visível para o cliente)
            h('div', { className: 'bg-white bg-opacity-15 rounded-2xl p-4 text-center' },
                h('div', { className: 'text-5xl font-black text-white' }, myScore),
                h('div', { className: 'text-xs text-white opacity-70 mt-1' }, 'pontos')
            ),

            // Categoria atual
            cat && (phase === 'joker_window' || phase === 'answering' || phase === 'reviewing') &&
                h('div', { className: 'bg-yellow-400 text-yellow-900 rounded-2xl px-5 py-4 w-full max-w-sm text-center shadow-xl' },
                    h('div', { className: 'text-xl font-black mb-1' }, cat.name),
                    h('div', { className: 'text-sm font-semibold opacity-75' }, cat.description),
                    h('div', { className: 'mt-2 inline-block bg-yellow-300 bg-opacity-70 rounded-lg px-3 py-0.5' },
                        h('span', { className: 'font-black' }, cat.points + (cat.points === 1 ? ' ponto' : ' pontos'))
                    )
                ),

            // Timer joker
            phase === 'joker_window' &&
                h('div', { className: 'text-center text-white' },
                    h('div', { className: 'text-3xl font-bold animate-pulse' }, '⏱️ ' + jokerRem + 's'),
                    h('div', { className: 'text-sm opacity-75' }, 'Janela do Joker')
                ),

            // Timer resposta
            phase === 'answering' && !isSinging &&
                h('div', { className: 'text-center' },
                    h('div', {
                        className: 'text-3xl font-bold ' + (answerRem <= 5 ? 'text-red-300 animate-pulse' : 'text-white')
                    }, timeUp ? '⏱️ Tempo esgotado' : ('⏱️ ' + answerRem + 's'))
                ),

            // A aguardar ronda
            phase === 'waiting' &&
                h('div', { className: 'text-center text-white opacity-75' },
                    h('div', { className: 'text-5xl mb-3' }, '🎵'),
                    h('div', { className: 'text-lg font-semibold' }, 'A aguardar ronda...')
                ),

            // Em revisão
            phase === 'reviewing' &&
                h('div', { className: 'text-center text-white' },
                    h('div', { className: 'text-5xl mb-3' }, '✅'),
                    h('div', { className: 'text-lg font-semibold' }, 'Respostas em revisão...'),
                    h('div', { className: 'text-sm opacity-70 mt-1' }, 'O anfitrião está a validar')
                ),

            // Equipa canta
            isSinging && (phase === 'joker_window' || phase === 'answering') &&
                h('div', { className: 'bg-purple-500 bg-opacity-80 rounded-2xl p-5 w-full max-w-sm text-center text-white shadow-xl' },
                    h('div', { className: 'text-4xl mb-2' }, '🎤'),
                    h('div', { className: 'font-black text-xl' }, 'A vossa equipa canta!'),
                    h('div', { className: 'text-sm opacity-80 mt-1' }, 'Não precisam de responder')
                ),

            // Campo de resposta (se a ação estiver disponível)
            phase === 'answering' && !isSinging && actions.textInput !== undefined &&
                h('div', { className: 'w-full max-w-sm' },
                    h('div', { className: 'bg-white rounded-2xl shadow-xl p-4' },
                        h('textarea', {
                            value: actions.textInput || '',
                            onChange: function(e) {
                                if (actions.setTextInput) actions.setTextInput(e.target.value);
                            },
                            disabled: timeUp,
                            maxLength: 200,
                            placeholder: timeUp ? 'Tempo esgotado!' : 'Escreve a tua resposta...',
                            className: 'w-full h-24 px-3 py-2 text-base border-2 rounded-lg resize-none focus:outline-none ' +
                                (timeUp
                                    ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                                    : 'border-violet-400 focus:border-violet-600')
                        }),
                        h('div', { className: 'flex justify-between items-center mt-2' },
                            h('span', { className: 'text-xs text-gray-400' }, (actions.textInput || '').length + '/200'),
                            h('button', {
                                onClick: actions.submitText,
                                disabled: !(actions.textInput || '').trim() || timeUp || actions.sending,
                                className: 'px-6 py-2 rounded-lg font-bold text-white text-sm transition-all active:scale-95 ' + (
                                    actions.sending       ? 'bg-yellow-500 cursor-wait' :
                                    actions.textSubmitted ? 'bg-green-500' :
                                    (!(actions.textInput || '').trim() || timeUp) ? 'bg-gray-400 cursor-not-allowed' :
                                    'bg-green-600 hover:bg-green-700 shadow-md'
                                )
                            }, actions.sending ? '⏳' : (actions.textSubmitted ? '✓ Enviado' : '📤 Enviar'))
                        )
                    )
                ),

            // Botão Joker (desaparece após uso)
            !myJokerUsed &&
                h('button', {
                    onClick: jokerEnabled ? (actions.pressJoker || function() {}) : undefined,
                    disabled: !jokerEnabled,
                    className: 'w-36 h-36 rounded-full font-black text-lg shadow-2xl transition-all transform select-none ' + (
                        jokerEnabled
                            ? 'bg-yellow-500 text-yellow-900 hover:scale-105 active:scale-95 cursor-pointer'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-40'
                    )
                },
                    h('div', { className: 'flex flex-col items-center gap-1' },
                        h('div', { className: 'text-4xl' }, '🃏'),
                        h('div', { className: 'text-sm font-black tracking-wider' }, jokerEnabled ? 'JOKER!' : 'JOKER')
                    )
                )
        );
    }
};

// =============================================================================
// REGISTO DO MÓDULO
// =============================================================================

// Exportar para uso global
window.HitsterGame = HitsterGame;

// Registar no sistema de jogos modular
if (!window.GameModules) {
    window.GameModules = {};
}
window.GameModules.hitster = HitsterGame;

console.log('✅ Módulo Hitster carregado');
