/**
 * session-core.js — utilitários partilhados para a app master de qualquer
 * jogo deste sistema. Foca-se no lifecycle de sessões (criar, listar,
 * arquivar) e no listener de clientes (presença + comparação estrutural).
 *
 * Tudo o que é específico de um jogo (campos do gameState, regras de
 * pontuação, modais de configuração) fica fora deste ficheiro — o core só
 * trata da plumbing partilhada.
 *
 * Como usar: carregar como <script> antes do código do master.
 *   <script src="shared/session-core.js"></script>
 *
 * Disponível em window.SessionCore.
 */

(function() {
    'use strict';

    /**
     * Subscreve à lista de sessões activas filtrada por gameType.
     *
     * O snapshot de Firebase em 'sessions' é uma map { code -> {gameState, clients, ...} }.
     * Esta função filtra pelos que têm `gameState.gameType === gameType` e
     * `gameState.active !== false`, e devolve um array ordenado por `timestamp`
     * descendente (mais recente primeiro).
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm        window.fbModules ({ref, onValue})
     * @param {string} opts.gameType  filtra por este tipo de jogo
     * @param {function} opts.onChange  recebe um array de sessões activas
     * @returns {function} unsubscribe
     */
    function subscribeActiveSessions(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.gameType) {
            throw new Error('subscribeActiveSessions requer rtdb, fm e gameType');
        }
        var rtdb = opts.rtdb, fm = opts.fm, gameType = opts.gameType;
        var onChange = opts.onChange || function() {};

        return fm.onValue(fm.ref(rtdb, 'sessions'), function(snap) {
            var data = snap.val();
            if (!data) { onChange([]); return; }
            var active = Object.keys(data).filter(function(code) {
                var gs = data[code] && data[code].gameState;
                return gs && gs.gameType === gameType && gs.active !== false;
            }).map(function(code) {
                return Object.assign({ sessionId: code }, data[code].gameState);
            }).sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
            onChange(active);
        });
    }

    /**
     * Subscreve ao histórico arquivado, filtrado por gameType.
     *
     * Cada entrada vem com `id` (key do RTDB) injectado para uso na UI.
     * Ordenado por `timestamp` descendente.
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm
     * @param {string} opts.gameType
     * @param {function} opts.onChange
     * @returns {function} unsubscribe
     */
    function subscribeSessionHistory(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.gameType) {
            throw new Error('subscribeSessionHistory requer rtdb, fm e gameType');
        }
        var rtdb = opts.rtdb, fm = opts.fm, gameType = opts.gameType;
        var onChange = opts.onChange || function() {};

        return fm.onValue(fm.ref(rtdb, 'sessionHistory'), function(snap) {
            var data = snap.val();
            if (!data) { onChange([]); return; }
            var entries = Object.entries(data)
                .filter(function(p) { return p[1].gameType === gameType; })
                .map(function(p) { return Object.assign({ id: p[0] }, p[1]); })
                .sort(function(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
            onChange(entries);
        });
    }

    /**
     * Subscreve ao nó `sessions/<id>/clients` e gere a actualização de presença
     * de forma optimizada para evitar re-renders desnecessários:
     *
     * - `onLastSeen(map)` é chamado em CADA update do Firebase, com um map
     *   `{tableNumber: timestamp}`. Tipicamente usa-se para actualizar um React
     *   ref (sem causar re-render) e ler timestamps frescos a cada presenceTick.
     *
     * - `onStructural(data)` é chamado APENAS quando há uma mudança estrutural
     *   (nova mesa, nome alterado, ou desconexão), comparando keys e os campos
     *   `teamName`, `tableNumber`, `connectedAt`. Heartbeats puros (só lastSeen
     *   alterado) NÃO disparam esta callback.
     *
     * Esta separação evita ~1 re-render por segundo do master quando há muitos
     * clientes a fazer heartbeat (ver fix do flicker do modal de nova ronda).
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm
     * @param {string} opts.sessionId
     * @param {function} [opts.onLastSeen]    chamado com {tableNumber: ts} em cada update
     * @param {function} [opts.onStructural]  chamado com data quando algo estrutural muda
     * @returns {function} unsubscribe
     */
    function subscribeClients(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.sessionId) {
            throw new Error('subscribeClients requer rtdb, fm e sessionId');
        }
        var rtdb = opts.rtdb, fm = opts.fm, sessionId = opts.sessionId;
        var onLastSeen   = opts.onLastSeen   || function() {};
        var onStructural = opts.onStructural || function() {};

        var prev = {};

        return fm.onValue(fm.ref(rtdb, 'sessions/' + sessionId + '/clients'), function(snap) {
            var data = snap.val() || {};

            // lastSeen: sempre — o caller decide se faz state update ou ref
            var lsMap = {};
            Object.values(data).forEach(function(c) {
                if (c && c.tableNumber) lsMap[c.tableNumber] = c.lastSeen || c.connectedAt || 0;
            });
            onLastSeen(lsMap);

            // Estrutural: só quando algo relevante mudou
            var prevKeys = Object.keys(prev).sort().join(',');
            var newKeys  = Object.keys(data).sort().join(',');
            var structChanged = prevKeys !== newKeys;
            if (!structChanged) {
                structChanged = Object.keys(data).some(function(k) {
                    var p = prev[k], n = data[k];
                    return !p || p.teamName !== n.teamName || p.tableNumber !== n.tableNumber || p.connectedAt !== n.connectedAt;
                });
            }
            if (structChanged) {
                prev = data;
                onStructural(data);
            }
        });
    }

    /**
     * Lê uma sessão activa uma única vez (one-shot). Útil para popups de info,
     * fluxos de confirmação, ou para verificar se um código existe antes de criar.
     *
     * @returns {Promise<object|null>} gameState ou null se não existir
     */
    function readGameStateOnce(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.sessionId) {
            throw new Error('readGameStateOnce requer rtdb, fm e sessionId');
        }
        var rtdb = opts.rtdb, fm = opts.fm, sessionId = opts.sessionId;
        return new Promise(function(resolve) {
            fm.onValue(fm.ref(rtdb, 'sessions/' + sessionId + '/gameState'), function(snap) {
                resolve(snap.val());
            }, { onlyOnce: true });
        });
    }

    /**
     * Lê o nó de clientes de uma sessão uma única vez. Usado pelo arquivo de
     * sessão para enriquecer as tables com os emails capturados pelos clientes.
     *
     * @returns {Promise<object>} {tableNumber: clientNode} ou {} se vazio
     */
    function readClientsOnce(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.sessionId) {
            throw new Error('readClientsOnce requer rtdb, fm e sessionId');
        }
        var rtdb = opts.rtdb, fm = opts.fm, sessionId = opts.sessionId;
        return new Promise(function(resolve) {
            fm.onValue(fm.ref(rtdb, 'sessions/' + sessionId + '/clients'), function(snap) {
                resolve(snap.val() || {});
            }, { onlyOnce: true });
        });
    }

    /**
     * Arquiva uma sessão activa em quatro passos seguros:
     *
     * 1. Marca `gameState.active = false` (sinaliza aos clientes que a sessão
     *    terminou — eles detectam pelo listener e limpam estado local).
     * 2. Espera `waitMs` (default 500ms) para os clientes processarem.
     * 3. Lê o nó `clients` para enriquecer o registo do histórico.
     * 4. Aplica `enrich(history, clients)` se fornecido — cada jogo decide o
     *    que fazer com os dados dos clientes (ex: mesclar emails nas tables,
     *    ou guardar o objecto clients inteiro num campo separado).
     * 5. Escreve em `sessionHistory/<id>` o resultado de `enrich`, com
     *    `gameType`, `sessionId`, `timestamp` e `archived: true` injectados.
     * 6. Remove `sessions/<id>` por completo.
     *
     * Helpers prontos a usar:
     *   - `SessionCore.enrichers.mergeEmailsIntoTables` — padrão Hitster
     *   - `SessionCore.enrichers.attachClientsField`    — padrão Diamant
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm
     * @param {string} opts.sessionId
     * @param {string} opts.gameType
     * @param {object} opts.history    base do payload do histórico
     * @param {function} [opts.enrich] (history, clients) → history transformado
     * @param {number} [opts.waitMs=500]
     * @returns {Promise<{ok:boolean, archiveId?:string, error?:Error}>}
     */
    async function archiveSession(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.sessionId || !opts.gameType) {
            throw new Error('archiveSession requer rtdb, fm, sessionId e gameType');
        }
        var rtdb = opts.rtdb, fm = opts.fm;
        var sessionId = opts.sessionId;
        var gameType  = opts.gameType;
        var history   = opts.history || {};
        var enrich    = typeof opts.enrich === 'function' ? opts.enrich : null;
        var waitMs    = typeof opts.waitMs === 'number' ? opts.waitMs : 500;

        try {
            // 1. Marcar inativo PRIMEIRO (sem active:true bleed)
            await fm.update(fm.ref(rtdb, 'sessions/' + sessionId + '/gameState'), {
                active: false, closedAt: Date.now()
            });

            // 2. Dar tempo aos clientes para processarem
            await new Promise(function(r) { setTimeout(r, waitMs); });

            // 3. Ler clients
            var clientsData = await readClientsOnce({ rtdb: rtdb, fm: fm, sessionId: sessionId });

            // 4. Aplicar enrich (se fornecido)
            var enriched = history;
            if (enrich) {
                enriched = enrich(history, clientsData) || history;
            }

            // 5. Escrever no histórico
            var archiveId = Math.random().toString(36).substring(2, 12);
            var payload = Object.assign({}, enriched, {
                gameType:  gameType,
                sessionId: sessionId,
                timestamp: Date.now(),
                archived:  true
            });
            await fm.set(fm.ref(rtdb, 'sessionHistory/' + archiveId), payload);

            // 6. Remover sessions/<id>
            await fm.remove(fm.ref(rtdb, 'sessions/' + sessionId));

            return { ok: true, archiveId: archiveId };
        } catch(e) {
            return { ok: false, error: e };
        }
    }

    /**
     * Enrichers prontos para usar com archiveSession.
     * Cada um modifica o objecto `history` em função do snapshot de clientes.
     */
    var enrichers = {
        // Padrão Hitster: olha para cada t em history.tables, encontra o cliente
        // com o mesmo id, e mescla os emails directamente em t. Útil quando o
        // cliente é considerado uma "vista" da equipa.
        mergeEmailsIntoTables: function(history, clients) {
            if (!Array.isArray(history.tables)) return history;
            history.tables = history.tables.map(function(t) {
                var cl = clients[t.id];
                var emails = cl ? (cl.emails || []) : (t.emails || []);
                return Object.assign({}, t, { emails: emails });
            });
            return history;
        },
        // Padrão Diamant: guarda o objecto clients inteiro num campo separado.
        // Útil quando o cliente tem mais informação relevante para preservar
        // (ex: log de conexões, status 'left'/'active', etc.).
        attachClientsField: function(history, clients) {
            history.clients = clients;
            return history;
        }
    };

    window.SessionCore = {
        subscribeActiveSessions: subscribeActiveSessions,
        subscribeSessionHistory: subscribeSessionHistory,
        subscribeClients:        subscribeClients,
        readGameStateOnce:       readGameStateOnce,
        readClientsOnce:         readClientsOnce,
        archiveSession:          archiveSession,
        enrichers:               enrichers
    };
})();
