/**
 * ============================================================================
 * DIAMANT / INCAN GOLD - Módulo de Jogo
 * ============================================================================
 * 
 * Adaptação digital do jogo de tabuleiro Diamant (Incan Gold).
 * 
 * MECÂNICA PRINCIPAL:
 * - Jogadores exploram uma gruta e decidem quando sair
 * - Rubis são divididos entre quem está na exploração
 * - Sobras ficam na reserva para quem sair depois
 * - Perigo repetido = todos perdem pontos provisórios
 * 
 * FLUXO DO JOGO:
 * 1. Master coloca carta (rubis ou perigo)
 * 2. Se rubis: divide entre jogadores, sobras vão para reserva
 * 3. Jogadores votam: continuar ou sair
 * 4. Quem sai: provisório + parte da reserva → definitivo
 * 5. Repete até todos saírem ou perigo repetido
 * 
 * @fileoverview Módulo do jogo Diamant para o sistema de pontuação
 * @version 1.0.0
 * @author ALPCeS - Ludonautas
 * 
 * NOTAS PARA FUTURAS ITERAÇÕES:
 * - Artefactos: adicionar campo 'artifacts' ao estado e lógica de recolha
 * - Tipos de perigo: adicionar array 'dangerTypes' para tracking visual
 */

const DiamantGame = {
    // =========================================================================
    // METADADOS DO MÓDULO
    // =========================================================================
    
    id: 'diamant',
    name: 'Diamant / Incan Gold',
    description: 'Exploração de grutas com divisão de rubis e decisões de risco',
    icon: '💎',
    
    // =========================================================================
    // CONFIGURAÇÃO PADRÃO
    // =========================================================================
    
    /**
     * Retorna a configuração padrão do jogo
     * Estas opções aparecem no ecrã de setup do master
     */
    getDefaultConfig: () => ({
        // Tempo limite para votação (0 = sem limite)
        votingTimeoutSeconds: 0,
        
        // Mostrar pontos provisórios no master (pode ocultar para projeção)
        showProvisionalInMaster: true,
        
        // FUTURO: Usar artefactos
        // useArtifacts: false,
    }),
    
    /**
     * UI de configuração específica do Diamant
     * Aparece no ecrã de setup do master
     * 
     * @param {Object} config - Configuração atual
     * @param {Function} setConfig - Função para atualizar configuração
     * @param {Function} h - React.createElement
     * @returns {ReactElement} Elementos de configuração
     */
    getConfigUI: (config, setConfig, h) => {
        return h('div', { className: 'space-y-4' },
            // Título do jogo
            h('div', { className: 'bg-amber-50 p-3 rounded-lg border-2 border-amber-300' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'text-2xl' }, '💎'),
                    h('span', { className: 'font-bold text-amber-800' }, 'Diamant / Incan Gold')
                ),
                h('p', { className: 'text-sm text-amber-700' }, 
                    'Exploração de grutas com divisão automática de rubis. Os jogadores decidem quando sair para garantir os seus tesouros.'
                )
            ),
            
            // Timeout para votação
            h('div', null,
                h('label', { className: 'block text-sm font-semibold mb-2' }, 
                    'Tempo limite para votação (segundos, 0 = sem limite)'
                ),
                h('input', { 
                    type: 'number', 
                    min: 0, 
                    max: 60,
                    value: config.votingTimeoutSeconds || 0, 
                    onChange: e => setConfig({ 
                        ...config, 
                        votingTimeoutSeconds: Math.max(0, parseInt(e.target.value) || 0) 
                    }), 
                    className: 'w-full px-4 py-2 border-2 rounded-lg focus:border-amber-500 outline-none' 
                }),
                h('p', { className: 'text-xs text-gray-500 mt-1' }, 
                    'O master pode ativar um timeout durante o jogo se necessário'
                )
            ),
            
            // Mostrar pontos provisórios
            h('div', { className: 'flex items-center gap-2' },
                h('input', { 
                    type: 'checkbox', 
                    id: 'showProvisional', 
                    checked: config.showProvisionalInMaster !== false, 
                    onChange: e => setConfig({ 
                        ...config, 
                        showProvisionalInMaster: e.target.checked 
                    }), 
                    className: 'w-4 h-4' 
                }),
                h('label', { htmlFor: 'showProvisional', className: 'text-sm font-semibold text-gray-700' }, 
                    'Mostrar pontos provisórios no master'
                )
            ),
            h('p', { className: 'text-xs text-gray-500 -mt-2 ml-6' }, 
                'Desativar se for projetar o master para os jogadores verem'
            )
            
            // FUTURO: Checkbox para artefactos
            // h('div', { className: 'flex items-center gap-2 opacity-50' },
            //     h('input', { type: 'checkbox', disabled: true }),
            //     h('label', { className: 'text-sm text-gray-500' }, 
            //         'Usar artefactos (em desenvolvimento)'
            //     )
            // )
        );
    },
    
    // =========================================================================
    // CONSTANTES E FASES DO JOGO
    // =========================================================================
    
    /**
     * Fases possíveis do jogo
     * 
     * WAITING_START    - À espera que o master inicie a expedição
     * EXPLORING        - A explorar, master pode colocar cartas
     * VOTING           - Jogadores estão a votar continuar/sair
     * REVEALING        - A revelar os votos
     * EXPEDITION_END   - Expedição terminou, a preparar próxima
     */
    PHASES: {
        WAITING_START: 'waiting_start',
        EXPLORING: 'exploring',
        VOTING: 'voting',
        REVEALING: 'revealing',
        EXPEDITION_END: 'expedition_end'
    },
    
    // =========================================================================
    // ESTADO INICIAL (LIFECYCLE)
    // =========================================================================
    
    /**
     * Cria o estado inicial quando uma sessão começa
     * 
     * @param {Object} config - Configuração do jogo
     * @returns {Object} Estado inicial do jogo
     */
    onSessionStart: (config) => ({
        // Número da expedição atual (para display)
        expedition: 1,
        
        // Fase atual do jogo
        phase: 'waiting_start',
        
        // Rubis na reserva (sobras das divisões)
        reserve: 0,
        
        // IDs das mesas que ainda estão na exploração
        // Preenchido quando a expedição começa
        teamsInExpedition: [],
        
        // Pontos provisórios de cada mesa (ganhos durante a exploração)
        // { [tableId]: number }
        provisionalScores: {},
        
        // Pontos definitivos de cada mesa (garantidos após sair)
        // { [tableId]: number }
        definitiveScores: {},
        
        // Votos de cada mesa na ronda atual
        // { [tableId]: 'continue' | 'leave' | null }
        votes: {},
        
        // Timeout ativo para votação (segundos restantes, 0 = sem timeout)
        votingTimeout: 0,
        
        // Última carta jogada (para display)
        // { type: 'ruby' | 'danger', value: number } | null
        lastCard: null,
        
        // Resultado da última revelação (para display)
        // { staying: [tableIds], leaving: [tableIds] }
        lastRevealResult: null,
        
        // Configuração do timeout (do config, mas pode ser alterado durante o jogo)
        defaultVotingTimeout: config.votingTimeoutSeconds || 0,
        
        // Mostrar provisórios no master
        showProvisionalInMaster: config.showProvisionalInMaster !== false
        
        // FUTURO: Artefactos
        // artifacts: [],
        // collectedArtifacts: {}
    }),
    
    /**
     * Prepara dados para guardar no histórico quando a sessão termina
     * 
     * @param {Object} gameState - Estado final do jogo
     * @param {Array} tables - Lista de mesas
     * @param {Object} config - Configuração do jogo
     * @returns {Object} Dados para o histórico
     */
    onSessionEnd: (gameState, tables, config) => ({
        gameType: 'diamant',
        expedition: gameState.expedition,
        definitiveScores: gameState.definitiveScores,
        tables: tables.map(t => ({ 
            id: t.id, 
            name: t.name, 
            // Score final = definitivos (provisórios já foram perdidos ou convertidos)
            score: gameState.definitiveScores[t.id] || 0 
        }))
    }),
    
    // =========================================================================
    // PROCESSAMENTO DE AÇÕES
    // =========================================================================
    
    /**
     * Processa uma ação e retorna o novo estado
     * Esta é a função principal de lógica do jogo
     * 
     * AÇÕES DISPONÍVEIS:
     * - START_EXPEDITION: Inicia uma nova expedição
     * - DRAW_RUBY_CARD: Master colocou carta de rubis
     * - DRAW_DANGER_CARD: Master colocou carta de perigo
     * - CONFIRM_DANGER_REPEATED: Master confirmou se perigo é repetido
     * - CAST_VOTE: Jogador votou continuar/sair
     * - REVEAL_VOTES: Master revela os votos
     * - START_VOTING_TIMEOUT: Ativa timeout para votação
     * - TICK_TIMEOUT: Decrementa o timeout
     * - FORCE_END_VOTING: Força fim da votação (timeout expirou)
     * 
     * @param {Object} action - Ação a processar { type, payload }
     * @param {Object} gameState - Estado atual
     * @param {Array} tables - Lista de mesas
     * @returns {Object} { gameState, tables }
     */
    processAction: (action, gameState, tables) => {
        switch (action.type) {
            
            // -----------------------------------------------------------------
            // INICIAR EXPEDIÇÃO
            // -----------------------------------------------------------------
            case 'START_EXPEDITION': {
                // Coloca todas as mesas na expedição
                const allTableIds = tables.map(t => t.id);
                
                // Inicializa pontos provisórios a 0 para todos
                const provisionalScores = {};
                allTableIds.forEach(id => {
                    provisionalScores[id] = 0;
                });
                
                // Mantém pontos definitivos anteriores
                const definitiveScores = { ...gameState.definitiveScores };
                allTableIds.forEach(id => {
                    if (definitiveScores[id] === undefined) {
                        definitiveScores[id] = 0;
                    }
                });
                
                return {
                    gameState: {
                        ...gameState,
                        phase: 'exploring',
                        reserve: 0,
                        teamsInExpedition: allTableIds,
                        provisionalScores,
                        definitiveScores,
                        votes: {},
                        lastCard: null,
                        lastRevealResult: null
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // CARTA DE RUBIS
            // -----------------------------------------------------------------
            case 'DRAW_RUBY_CARD': {
                const { value } = action.payload;
                const teamsCount = gameState.teamsInExpedition.length;
                
                // Se não há equipas, não faz nada
                if (teamsCount === 0) {
                    return { gameState, tables };
                }
                
                // Calcula divisão
                const perTeam = Math.floor(value / teamsCount);
                const leftover = value % teamsCount;
                
                // Atualiza pontos provisórios
                const newProvisionalScores = { ...gameState.provisionalScores };
                gameState.teamsInExpedition.forEach(id => {
                    newProvisionalScores[id] = (newProvisionalScores[id] || 0) + perTeam;
                });
                
                // Atualiza reserva
                const newReserve = gameState.reserve + leftover;
                
                // Limpa votos anteriores e prepara para nova votação
                const clearedVotes = {};
                gameState.teamsInExpedition.forEach(id => {
                    clearedVotes[id] = null;
                });
                
                return {
                    gameState: {
                        ...gameState,
                        phase: 'voting',
                        reserve: newReserve,
                        provisionalScores: newProvisionalScores,
                        votes: clearedVotes,
                        votingTimeout: 0, // Reset timeout
                        lastCard: { type: 'ruby', value, perTeam, leftover }
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // CARTA DE PERIGO
            // -----------------------------------------------------------------
            case 'DRAW_DANGER_CARD': {
                // Apenas muda para estado de confirmação
                // O master tem de confirmar se é repetido ou não
                
                // Limpa votos anteriores
                const clearedVotes = {};
                gameState.teamsInExpedition.forEach(id => {
                    clearedVotes[id] = null;
                });
                
                return {
                    gameState: {
                        ...gameState,
                        phase: 'voting', // Permite votar mesmo com perigo
                        votes: clearedVotes,
                        votingTimeout: 0,
                        lastCard: { type: 'danger', awaitingConfirmation: true }
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // CONFIRMAR SE PERIGO É REPETIDO
            // -----------------------------------------------------------------
            case 'CONFIRM_DANGER_REPEATED': {
                const { isRepeated } = action.payload;
                
                if (isRepeated) {
                    // PERIGO REPETIDO: Todos perdem provisórios, reserva vai a 0
                    // Expedição termina
                    
                    return {
                        gameState: {
                            ...gameState,
                            phase: 'expedition_end',
                            reserve: 0,
                            teamsInExpedition: [],
                            provisionalScores: {}, // Todos perdem provisórios
                            votes: {},
                            lastCard: { type: 'danger', isRepeated: true },
                            lastRevealResult: {
                                staying: [],
                                leaving: [],
                                dangerRepeated: true
                            }
                        },
                        tables
                    };
                } else {
                    // Perigo não repetido: continua votação normal
                    return {
                        gameState: {
                            ...gameState,
                            lastCard: { type: 'danger', isRepeated: false }
                        },
                        tables
                    };
                }
            }
            
            // -----------------------------------------------------------------
            // JOGADOR VOTA
            // -----------------------------------------------------------------
            case 'CAST_VOTE': {
                const { tableId, vote } = action.payload;
                
                // Verifica se a mesa está na expedição
                if (!gameState.teamsInExpedition.includes(tableId)) {
                    return { gameState, tables };
                }
                
                // Regista o voto
                const newVotes = {
                    ...gameState.votes,
                    [tableId]: vote // 'continue' ou 'leave'
                };
                
                return {
                    gameState: {
                        ...gameState,
                        votes: newVotes
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // REVELAR VOTOS
            // -----------------------------------------------------------------
            case 'REVEAL_VOTES': {
                const votes = gameState.votes;
                const teamsInExpedition = gameState.teamsInExpedition;
                
                // Separa quem sai e quem fica
                // Quem não votou (null) assume que continua
                const leaving = teamsInExpedition.filter(id => votes[id] === 'leave');
                const staying = teamsInExpedition.filter(id => votes[id] !== 'leave');
                
                // Calcula distribuição da reserva para quem sai
                let reservePerLeaver = 0;
                let reserveLeftover = 0;
                
                if (leaving.length > 0 && gameState.reserve > 0) {
                    reservePerLeaver = Math.floor(gameState.reserve / leaving.length);
                    reserveLeftover = gameState.reserve % leaving.length;
                }
                
                // Atualiza pontos
                const newProvisionalScores = { ...gameState.provisionalScores };
                const newDefinitiveScores = { ...gameState.definitiveScores };
                
                leaving.forEach(id => {
                    // Adiciona provisórios + parte da reserva aos definitivos
                    const provisional = newProvisionalScores[id] || 0;
                    const fromReserve = reservePerLeaver;
                    newDefinitiveScores[id] = (newDefinitiveScores[id] || 0) + provisional + fromReserve;
                    
                    // Limpa provisórios
                    newProvisionalScores[id] = 0;
                });
                
                // Nova reserva: se sobrou algo da divisão entre quem saiu
                // Se todos saíram, a reserva restante é perdida
                let newReserve = staying.length > 0 ? reserveLeftover : 0;
                
                // Se ninguém sai, reserva mantém
                if (leaving.length === 0) {
                    newReserve = gameState.reserve;
                }
                
                // Verifica se a expedição termina (ninguém ficou)
                const expeditionEnds = staying.length === 0;
                
                return {
                    gameState: {
                        ...gameState,
                        phase: expeditionEnds ? 'expedition_end' : 'exploring',
                        reserve: newReserve,
                        teamsInExpedition: staying,
                        provisionalScores: newProvisionalScores,
                        definitiveScores: newDefinitiveScores,
                        votes: {},
                        votingTimeout: 0,
                        lastRevealResult: {
                            staying,
                            leaving,
                            reserveDistributed: reservePerLeaver,
                            reserveLost: expeditionEnds ? reserveLeftover : 0
                        }
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // INICIAR TIMEOUT DE VOTAÇÃO
            // -----------------------------------------------------------------
            case 'START_VOTING_TIMEOUT': {
                const { seconds } = action.payload;
                
                return {
                    gameState: {
                        ...gameState,
                        votingTimeout: seconds
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // TICK DO TIMEOUT
            // -----------------------------------------------------------------
            case 'TICK_TIMEOUT': {
                if (gameState.votingTimeout <= 0) {
                    return { gameState, tables };
                }
                
                const newTimeout = gameState.votingTimeout - 1;
                
                return {
                    gameState: {
                        ...gameState,
                        votingTimeout: newTimeout
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // FORÇAR FIM DA VOTAÇÃO (timeout expirou)
            // -----------------------------------------------------------------
            case 'FORCE_END_VOTING': {
                // Quem não votou assume que continua
                const newVotes = { ...gameState.votes };
                gameState.teamsInExpedition.forEach(id => {
                    if (newVotes[id] === null || newVotes[id] === undefined) {
                        newVotes[id] = 'continue';
                    }
                });
                
                return {
                    gameState: {
                        ...gameState,
                        votes: newVotes,
                        votingTimeout: 0
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // PREPARAR NOVA EXPEDIÇÃO
            // -----------------------------------------------------------------
            case 'PREPARE_NEW_EXPEDITION': {
                return {
                    gameState: {
                        ...gameState,
                        phase: 'waiting_start',
                        expedition: gameState.expedition + 1,
                        reserve: 0,
                        teamsInExpedition: [],
                        provisionalScores: {},
                        votes: {},
                        lastCard: null,
                        lastRevealResult: null,
                        votingTimeout: 0
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // TOGGLE MOSTRAR PROVISÓRIOS
            // -----------------------------------------------------------------
            case 'TOGGLE_SHOW_PROVISIONAL': {
                return {
                    gameState: {
                        ...gameState,
                        showProvisionalInMaster: !gameState.showProvisionalInMaster
                    },
                    tables
                };
            }
            
            // -----------------------------------------------------------------
            // AÇÃO DESCONHECIDA
            // -----------------------------------------------------------------
            default:
                console.warn(`DiamantGame: Ação desconhecida: ${action.type}`);
                return { gameState, tables };
        }
    },
    
    // =========================================================================
    // ESTADO PARA FIREBASE
    // =========================================================================
    
    /**
     * Prepara o estado para sincronizar com o Firebase
     * Este é o estado que os clientes vão receber
     * 
     * @param {Object} gameState - Estado do jogo
     * @param {Object} config - Configuração
     * @param {Array} tables - Lista de mesas
     * @param {Object} extra - Dados extras (logos, etc.)
     * @returns {Object} Estado para Firebase
     */
    getFirebaseState: (gameState, config, tables, extra = {}) => ({
        // Identificação
        gameType: 'diamant',
        active: true,
        timestamp: Date.now(),
        
        // Estado do jogo
        phase: gameState.phase,
        expedition: gameState.expedition,
        reserve: gameState.reserve,
        teamsInExpedition: gameState.teamsInExpedition,
        provisionalScores: gameState.provisionalScores,
        definitiveScores: gameState.definitiveScores,
        
        // Votação
        votes: gameState.votes,
        votingTimeout: gameState.votingTimeout,
        
        // Última carta (para display no cliente)
        lastCard: gameState.lastCard,
        lastRevealResult: gameState.lastRevealResult,
        
        // Mesas (para compatibilidade)
        tables: tables.map(t => ({ 
            id: t.id, 
            name: t.name, 
            score: gameState.definitiveScores[t.id] || 0
        })),
        
        // Extras
        selectedLogos: extra.selectedLogos || []
    }),
    
    // =========================================================================
    // UI DO MASTER - CONTROLOS
    // =========================================================================
    
    /**
     * Gera os controlos que aparecem na barra inferior do master
     * 
     * @param {Object} params
     * @param {Object} params.gameState - Estado atual
     * @param {Object} params.config - Configuração
     * @param {Array} params.tables - Mesas
     * @param {Object} params.actions - Ações disponíveis
     * @param {Function} h - React.createElement
     * @returns {ReactElement}
     */
    getGameControlsUI: ({ gameState, config, tables, actions, h }) => {
        const { phase, teamsInExpedition, votes, reserve, votingTimeout } = gameState;
        
        // Conta votos recebidos
        const votesReceived = Object.values(votes).filter(v => v !== null).length;
        const totalToVote = teamsInExpedition.length;
        const allVoted = votesReceived === totalToVote && totalToVote > 0;
        
        return h('div', { className: 'flex flex-wrap gap-2 items-center' },
            
            // --- Fase: À espera de iniciar ---
            phase === 'waiting_start' && h('button', {
                onClick: () => actions.dispatch({ type: 'START_EXPEDITION' }),
                className: 'px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg'
            }, '🚀 Iniciar Expedição'),
            
            // --- Fase: Exploração (pode colocar cartas) ---
            phase === 'exploring' && h('div', { className: 'flex gap-2 items-center' },
                // Input para rubis
                h('input', {
                    type: 'number',
                    min: 1,
                    max: 15,
                    placeholder: '💎',
                    id: 'rubyInput',
                    className: 'w-16 px-2 py-2 border-2 border-amber-400 rounded-lg text-center font-bold text-lg'
                }),
                h('button', {
                    onClick: () => {
                        const input = document.getElementById('rubyInput');
                        const value = parseInt(input.value);
                        if (value > 0) {
                            actions.dispatch({ type: 'DRAW_RUBY_CARD', payload: { value } });
                            input.value = '';
                        }
                    },
                    className: 'px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold'
                }, '💎 Rubis'),
                
                h('div', { className: 'w-px h-8 bg-gray-300 mx-2' }),
                
                h('button', {
                    onClick: () => actions.dispatch({ type: 'DRAW_DANGER_CARD' }),
                    className: 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold'
                }, '☠️ Perigo')
            ),
            
            // --- Fase: Votação ---
            phase === 'voting' && h('div', { className: 'flex gap-2 items-center' },
                // Status da votação
                h('span', { className: 'text-sm font-semibold bg-blue-100 px-3 py-1 rounded-full' },
                    `🗳️ ${votesReceived}/${totalToVote} votos`
                ),
                
                // Se última carta foi perigo, mostrar confirmação
                gameState.lastCard?.type === 'danger' && gameState.lastCard?.awaitingConfirmation && 
                h('div', { className: 'flex gap-2 ml-4' },
                    h('span', { className: 'text-sm font-semibold' }, 'Perigo repetido?'),
                    h('button', {
                        onClick: () => actions.dispatch({ 
                            type: 'CONFIRM_DANGER_REPEATED', 
                            payload: { isRepeated: false } 
                        }),
                        className: 'px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm'
                    }, '✓ Não'),
                    h('button', {
                        onClick: () => actions.dispatch({ 
                            type: 'CONFIRM_DANGER_REPEATED', 
                            payload: { isRepeated: true } 
                        }),
                        className: 'px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm'
                    }, '✗ Sim (Todos perdem)')
                ),
                
                // Botão de timeout (se não está ativo)
                votingTimeout === 0 && h('button', {
                    onClick: () => actions.dispatch({ 
                        type: 'START_VOTING_TIMEOUT', 
                        payload: { seconds: 10 } 
                    }),
                    className: 'px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm'
                }, '⏱️ 10s'),
                
                // Countdown do timeout
                votingTimeout > 0 && h('span', { 
                    className: 'text-lg font-bold text-orange-600 animate-pulse' 
                }, `⏱️ ${votingTimeout}s`),
                
                // Botão revelar (quando todos votaram ou timeout)
                (allVoted || votingTimeout === 0) && votesReceived > 0 && h('button', {
                    onClick: () => actions.dispatch({ type: 'REVEAL_VOTES' }),
                    className: 'px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold ml-4 btn-pulse-purple'
                }, '👁️ Revelar Votos')
            ),
            
            // --- Fase: Expedição Terminou ---
            phase === 'expedition_end' && h('button', {
                onClick: () => actions.dispatch({ type: 'PREPARE_NEW_EXPEDITION' }),
                className: 'px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg'
            }, '🔄 Nova Expedição'),
            
            // --- Info da Reserva (sempre visível) ---
            h('div', { className: 'ml-auto flex items-center gap-2 bg-amber-100 px-3 py-1 rounded-full' },
                h('span', { className: 'text-lg' }, '💎'),
                h('span', { className: 'font-bold text-amber-800' }, `Reserva: ${reserve}`)
            ),
            
            // --- Toggle mostrar provisórios ---
            h('button', {
                onClick: () => actions.dispatch({ type: 'TOGGLE_SHOW_PROVISIONAL' }),
                className: `px-2 py-1 rounded text-xs ${
                    gameState.showProvisionalInMaster 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-200 text-gray-600'
                }`
            }, gameState.showProvisionalInMaster ? '👁️ Prov.' : '🙈 Prov.')
        );
    },
    
    // =========================================================================
    // UI DO MASTER - MESA INDIVIDUAL
    // =========================================================================
    
    /**
     * Gera a UI de uma mesa individual no master
     * 
     * @param {Object} params
     * @param {Object} params.table - Dados da mesa
     * @param {Object} params.gameState - Estado do jogo
     * @param {Object} params.connectedClients - Clientes conectados
     * @param {Function} h - React.createElement
     * @returns {ReactElement}
     */
    getTableUI: ({ table, gameState, connectedClients, h }) => {
        const client = connectedClients[table.id];
        const isInExpedition = gameState.teamsInExpedition.includes(table.id);
        const provisional = gameState.provisionalScores[table.id] || 0;
        const definitive = gameState.definitiveScores[table.id] || 0;
        const vote = gameState.votes[table.id];
        const hasVoted = vote !== null && vote !== undefined;
        
        // Cores baseadas no estado
        let borderColor = 'border-gray-200';
        let bgColor = 'bg-white';
        
        if (gameState.phase === 'revealing' && gameState.lastRevealResult) {
            if (gameState.lastRevealResult.leaving?.includes(table.id)) {
                borderColor = 'border-red-400';
                bgColor = 'bg-red-50';
            } else if (gameState.lastRevealResult.staying?.includes(table.id)) {
                borderColor = 'border-green-400';
                bgColor = 'bg-green-50';
            }
        } else if (!isInExpedition && gameState.phase !== 'waiting_start') {
            bgColor = 'bg-gray-100';
        }
        
        return h('div', { 
            key: table.id, 
            className: `${bgColor} rounded-xl shadow-lg p-3 border-2 ${borderColor} transition-all`
        },
            // Header
            h('div', { className: 'flex justify-between items-center mb-2' },
                h('div', null,
                    h('span', { className: 'text-xs text-gray-500' }, `Mesa ${table.id}`),
                    client && h('span', { className: 'ml-2 text-xs text-green-600' }, '● Online')
                ),
                // Status na expedição
                isInExpedition 
                    ? h('span', { className: 'text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full' }, '⛏️ Explorando')
                    : gameState.phase !== 'waiting_start' && h('span', { className: 'text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full' }, '🏕️ Acampamento')
            ),
            
            // Nome da equipa
            h('div', { className: 'font-bold text-gray-800 truncate mb-2' }, 
                table.name || client?.teamName || `Mesa ${table.id}`
            ),
            
            // Pontuação
            h('div', { className: 'flex justify-around text-center' },
                // Provisório (se visível)
                gameState.showProvisionalInMaster && isInExpedition && h('div', null,
                    h('div', { className: 'text-xs text-amber-600' }, 'Provisório'),
                    h('div', { className: 'text-xl font-bold text-amber-500' }, provisional)
                ),
                // Definitivo
                h('div', null,
                    h('div', { className: 'text-xs text-purple-600' }, 'Definitivo'),
                    h('div', { className: 'text-2xl font-black text-purple-600' }, definitive)
                )
            ),
            
            // Status do voto (durante votação)
            gameState.phase === 'voting' && isInExpedition && h('div', { className: 'mt-2 text-center' },
                hasVoted 
                    ? h('span', { className: 'text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full' }, '✓ Votou')
                    : h('span', { className: 'text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full animate-pulse' }, '⏳ A votar...')
            )
        );
    },
    
    // =========================================================================
    // UI DO CLIENTE
    // =========================================================================
    
    /**
     * Gera a UI específica do Diamant para o cliente
     * 
     * @param {Object} params
     * @param {Object} params.gameData - Dados do Firebase
     * @param {Object} params.myTable - Dados da mesa do cliente
     * @param {number} params.tableNumber - Número da mesa
     * @param {Object} params.actions - Ações disponíveis
     * @param {Function} h - React.createElement
     * @returns {ReactElement}
     */
    getClientUI: ({ gameData, myTable, tableNumber, actions, h }) => {
        const tableId = parseInt(tableNumber);
        const phase = gameData?.phase || 'waiting_start';
        const isInExpedition = gameData?.teamsInExpedition?.includes(tableId);
        const provisional = gameData?.provisionalScores?.[tableId] || 0;
        const definitive = gameData?.definitiveScores?.[tableId] || 0;
        const myVote = gameData?.votes?.[tableId];
        const hasVoted = myVote !== null && myVote !== undefined;
        const votingTimeout = gameData?.votingTimeout || 0;
        const teamsInExpedition = gameData?.teamsInExpedition || [];
        const reserve = gameData?.reserve || 0;
        const lastCard = gameData?.lastCard;
        const lastRevealResult = gameData?.lastRevealResult;
        
        // Estado de confirmação local
        const [confirmingLeave, setConfirmingLeave] = actions.useConfirmState 
            ? actions.useConfirmState() 
            : [false, () => {}];
        
        return h('div', { className: 'flex-1 flex flex-col items-center justify-center gap-4 p-4' },
            
            // --- Card de Pontuação ---
            h('div', { className: 'bg-white rounded-2xl shadow-xl p-4 w-full max-w-sm' },
                h('div', { className: 'flex justify-around text-center' },
                    // Provisório
                    h('div', { className: 'flex-1' },
                        h('div', { className: 'text-sm text-amber-600 font-semibold' }, '💎 Provisório'),
                        h('div', { className: 'text-4xl font-black text-amber-500' }, provisional)
                    ),
                    h('div', { className: 'w-px bg-gray-200' }),
                    // Definitivo
                    h('div', { className: 'flex-1' },
                        h('div', { className: 'text-sm text-purple-600 font-semibold' }, '🏆 Definitivo'),
                        h('div', { className: 'text-4xl font-black text-purple-600' }, definitive)
                    )
                )
            ),
            
            // --- Info da Expedição ---
            h('div', { className: 'text-center text-white' },
                h('div', { className: 'text-sm opacity-75' }, `Expedição ${gameData?.expedition || 1}`),
                h('div', { className: 'text-lg' }, 
                    `${teamsInExpedition.length} explorador${teamsInExpedition.length !== 1 ? 'es' : ''} na gruta`
                ),
                reserve > 0 && h('div', { className: 'text-amber-300 mt-1' }, 
                    `💎 ${reserve} rubis na reserva`
                )
            ),
            
            // --- Última Carta (info) ---
            lastCard && phase === 'voting' && h('div', { 
                className: `text-center p-3 rounded-lg ${
                    lastCard.type === 'ruby' ? 'bg-amber-400 text-amber-900' : 'bg-red-500 text-white'
                }`
            },
                lastCard.type === 'ruby' 
                    ? h('span', null, `💎 ${lastCard.value} rubis (${lastCard.perTeam} cada, +${lastCard.leftover} reserva)`)
                    : h('span', null, '☠️ Perigo!')
            ),
            
            // --- Estado: À espera ---
            phase === 'waiting_start' && h('div', { className: 'text-center text-white' },
                h('div', { className: 'text-6xl mb-4' }, '⏳'),
                h('div', { className: 'text-xl font-semibold' }, 'À espera do início da expedição...')
            ),
            
            // --- Estado: No Acampamento ---
            !isInExpedition && phase !== 'waiting_start' && phase !== 'expedition_end' && 
            h('div', { className: 'text-center text-white' },
                h('div', { className: 'text-6xl mb-4' }, '🏕️'),
                h('div', { className: 'text-xl font-semibold' }, 'A descansar no acampamento'),
                h('div', { className: 'text-sm opacity-75 mt-2' }, 'À espera do regresso dos colegas...')
            ),
            
            // --- Estado: Votação ---
            phase === 'voting' && isInExpedition && !hasVoted && h('div', { className: 'w-full max-w-sm' },
                // Timeout
                votingTimeout > 0 && h('div', { className: 'text-center mb-4' },
                    h('span', { className: 'text-2xl font-bold text-orange-400 animate-pulse' }, 
                        `⏱️ ${votingTimeout}s`
                    )
                ),
                
                // Botões de voto (com confirmação para sair)
                !confirmingLeave 
                    ? h('div', { className: 'flex gap-4' },
                        h('button', {
                            onClick: () => actions.castVote('continue'),
                            className: 'flex-1 py-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform'
                        }, h('div', null,
                            h('div', { className: 'text-4xl mb-1' }, '💎'),
                            h('div', null, 'Continuar')
                        )),
                        h('button', {
                            onClick: () => setConfirmingLeave(true),
                            className: 'flex-1 py-6 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform'
                        }, h('div', null,
                            h('div', { className: 'text-4xl mb-1' }, '🏃'),
                            h('div', null, 'Sair')
                        ))
                    )
                    : h('div', { className: 'bg-red-100 rounded-2xl p-4' },
                        h('div', { className: 'text-center mb-4' },
                            h('div', { className: 'text-lg font-bold text-red-800' }, 'Tens a certeza que queres sair?'),
                            h('div', { className: 'text-sm text-red-600 mt-1' }, 
                                `Vais receber ${provisional} provisórios + parte da reserva`
                            )
                        ),
                        h('div', { className: 'flex gap-4' },
                            h('button', {
                                onClick: () => setConfirmingLeave(false),
                                className: 'flex-1 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-xl font-bold'
                            }, 'Cancelar'),
                            h('button', {
                                onClick: () => {
                                    actions.castVote('leave');
                                    setConfirmingLeave(false);
                                },
                                className: 'flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold'
                            }, 'Sim, Sair')
                        )
                    )
            ),
            
            // --- Estado: Já votou ---
            phase === 'voting' && isInExpedition && hasVoted && h('div', { className: 'text-center text-white' },
                h('div', { className: 'text-6xl mb-4' }, myVote === 'leave' ? '🏃' : '💎'),
                h('div', { className: 'text-xl font-semibold' }, 
                    myVote === 'leave' ? 'Decidiste sair' : 'Decidiste continuar'
                ),
                h('div', { className: 'text-sm opacity-75 mt-2' }, 'À espera dos outros jogadores...')
            ),
            
            // --- Estado: Revelação ---
            phase === 'revealing' && lastRevealResult && h('div', { className: 'text-center text-white' },
                lastRevealResult.dangerRepeated
                    ? h('div', null,
                        h('div', { className: 'text-6xl mb-4' }, '💀'),
                        h('div', { className: 'text-xl font-bold text-red-400' }, 'Perigo Repetido!'),
                        h('div', { className: 'text-lg mt-2' }, 'Todos perderam os rubis provisórios')
                    )
                    : h('div', null,
                        h('div', { className: 'text-lg' }, 
                            `${lastRevealResult.leaving?.length || 0} saíram, ${lastRevealResult.staying?.length || 0} ficaram`
                        )
                    )
            ),
            
            // --- Estado: Fim da Expedição ---
            phase === 'expedition_end' && h('div', { className: 'text-center text-white' },
                h('div', { className: 'text-6xl mb-4' }, '🏁'),
                h('div', { className: 'text-xl font-semibold' }, 'Expedição Terminada!'),
                h('div', { className: 'text-sm opacity-75 mt-2' }, 'À espera da próxima expedição...')
            )
        );
    }
};

// =============================================================================
// REGISTO DO MÓDULO
// =============================================================================

// Exportar para uso global
window.DiamantGame = DiamantGame;

// Registar no sistema de jogos
if (!window.GameModules) {
    window.GameModules = {};
}
window.GameModules.diamant = DiamantGame;

console.log('✅ Módulo Diamant carregado');
