/**
 * client-core.js — utilitários partilhados para a app cliente de qualquer jogo
 * deste sistema de pontuação multijogador.
 *
 * Este ficheiro contém apenas helpers puros (sem Firebase, sem React, sem UI).
 * Os blocos de lifecycle (connectClient, joinSession, submitWithVerify, wakeLock)
 * serão adicionados nas Phase 1.2 e 1.3 do refactor.
 *
 * Como usar: carregar como <script> ANTES do script type="module" do Firebase.
 *   <script src="shared/client-core.js"></script>
 *
 * Disponível em window.ClientCore.
 */

(function() {
    'use strict';

    /**
     * UUID persistente por dispositivo/instalação.
     * Permite detectar colisões de mesa (dois dispositivos a usar o mesmo número)
     * e validar que escritas vêm do dispositivo certo.
     *
     * @param {string} [storageKey='client_id'] chave do localStorage. Cada jogo pode
     *   passar uma chave própria (ex: 'hitster_clientId') ou partilhar a default.
     * @returns {string} UUID com prefixo 'c_', estável entre sessões neste browser.
     */
    function getClientId(storageKey) {
        storageKey = storageKey || 'client_id';
        var id = localStorage.getItem(storageKey);
        if (!id) {
            id = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(storageKey, id);
        }
        return id;
    }

    /**
     * Corre uma Promise com timeout. Evita ficar pendurado se o WebSocket estiver
     * morto e o SDK do Firebase não rejeitar nem resolver.
     *
     * @param {Promise} promise
     * @param {number} ms
     * @returns {Promise} resolve com o valor original ou rejeita com Error('timeout')
     */
    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise(function(_, reject) {
                setTimeout(function() { reject(new Error('timeout')); }, ms);
            })
        ]);
    }

    /**
     * Cria um gestor de localStorage para os dados de sessão de um cliente
     * (código de sessão, número da mesa, nome de equipa, emails) com expiry.
     *
     * Os dados são guardados com chaves no formato `<prefix>_<campo>`. Por exemplo,
     * `createLocalStore('hitster')` usa as chaves `hitster_session`, `hitster_table`,
     * `hitster_team`, `hitster_emails`, `hitster_ts` — backwards-compatível com o
     * localStorage existente do client-hitster antes do refactor.
     *
     * NOTA: o clientId NÃO é gerido por este store — usa getClientId() à parte,
     * porque o clientId é por dispositivo e não deve ser limpo ao sair de uma sessão.
     *
     * @param {string} prefix prefixo das chaves no localStorage (ex: 'hitster')
     * @param {number} [expiryMs=12*3600*1000] tempo após o qual load() devolve null
     *   e limpa os dados — protege contra "ressuscitar" sessões muito antigas.
     * @returns {{save: function, load: function, clear: function}}
     *   - save({session?, table?, team?, emails?}): grava os campos fornecidos + timestamp
     *   - load(): {session, table, team, emails, ts} ou null se expirado / em falta
     *   - clear(): remove todas as chaves do prefixo
     */
    function createLocalStore(prefix, expiryMs) {
        if (!prefix) throw new Error('createLocalStore requer um prefixo');
        if (typeof expiryMs !== 'number') expiryMs = 12 * 60 * 60 * 1000;

        var keys = {
            session: prefix + '_session',
            table:   prefix + '_table',
            team:    prefix + '_team',
            emails:  prefix + '_emails',
            ts:      prefix + '_ts'
        };

        function clear() {
            Object.keys(keys).forEach(function(k) { localStorage.removeItem(keys[k]); });
        }

        return {
            save: function(data) {
                data = data || {};
                if (data.session != null) localStorage.setItem(keys.session, String(data.session));
                if (data.table   != null) localStorage.setItem(keys.table,   String(data.table));
                if (data.team    != null) localStorage.setItem(keys.team,    String(data.team));
                if (data.emails  != null) localStorage.setItem(keys.emails,  String(data.emails));
                localStorage.setItem(keys.ts, String(Date.now()));
            },
            load: function() {
                var ts = parseInt(localStorage.getItem(keys.ts) || '0', 10);
                if (!ts || (Date.now() - ts) > expiryMs) { clear(); return null; }
                var session = localStorage.getItem(keys.session);
                var table   = localStorage.getItem(keys.table);
                if (!session || !table) return null;
                return {
                    session: session,
                    table:   table,
                    team:    localStorage.getItem(keys.team)   || '',
                    emails:  localStorage.getItem(keys.emails) || '',
                    ts:      ts
                };
            },
            clear: clear
        };
    }

    /**
     * Calcula o estado de conexão de um cliente a partir do tempo desde o último
     * heartbeat conhecido. Usado pelo master para mostrar indicadores de presença.
     *
     * Boundaries default: 30s = idle, 60s = offline. Antes de 30s = online.
     *
     * @param {number} sinceSeenMs milissegundos desde o último lastSeen
     * @param {boolean} hasClient se há ou não um nó de cliente associado
     * @param {object} [opts] {idleAfterMs=30000, offlineAfterMs=60000}
     * @returns {'online'|'idle'|'offline'|'gone'}
     *   - 'gone'    quando hasClient é false
     *   - 'online'  quando sinceSeen < idleAfterMs
     *   - 'idle'    quando idleAfterMs ≤ sinceSeen < offlineAfterMs
     *   - 'offline' caso contrário
     */
    function computeConnState(sinceSeenMs, hasClient, opts) {
        if (!hasClient) return 'gone';
        opts = opts || {};
        var idleAfter    = typeof opts.idleAfterMs    === 'number' ? opts.idleAfterMs    : 30000;
        var offlineAfter = typeof opts.offlineAfterMs === 'number' ? opts.offlineAfterMs : 60000;
        if (sinceSeenMs < idleAfter)    return 'online';
        if (sinceSeenMs < offlineAfter) return 'idle';
        return 'offline';
    }

    /**
     * Liga um cliente a uma sessão e gere todos os mecanismos de resiliência:
     * listeners de gameState e clients/<n>, .info/connected, eventos de
     * visibilidade/focus/online (que acordam o WebSocket e forçam refresh),
     * heartbeat periódico (escreve lastSeen).
     *
     * Pré-condições: o cliente JÁ deve ter feito join (escrever a entrada em
     * clients/<n>) — isto é responsabilidade do joinSession (Phase 1.3) ou do
     * call-site. Esta função apenas mantém a ligação viva.
     *
     * Não é responsabilidade desta função decidir o que fazer quando a sessão
     * é perdida — o caller fornece os callbacks.
     *
     * @param {object} opts
     * @param {object} opts.rtdb           instância do Firebase RTDB
     * @param {object} opts.fm             window.fbModules ({ref, onValue, get, update})
     * @param {string} opts.sessionCode    código da sessão
     * @param {string|number} opts.tableNumber  número da mesa do cliente
     * @param {number} [opts.heartbeatMs=15000] intervalo do heartbeat em ms
     * @param {function} [opts.onGameState]    chamado com gameState fresco (do listener ou do forceRefresh)
     * @param {function} [opts.onSessionLost]  chamado quando active===false ou clients/<n> é removido
     * @param {function} [opts.onFbConnectionChange] chamado com bool quando .info/connected muda
     * @param {function} [opts.onResume]   chamado depois de cada visibility/focus/online resume
     * @returns {{disconnect: function, forceRefresh: function}}
     */
    function connectClient(opts) {
        if (!opts || !opts.rtdb || !opts.fm) throw new Error('connectClient requer rtdb e fm');
        if (!opts.sessionCode || !opts.tableNumber) throw new Error('connectClient requer sessionCode e tableNumber');

        var rtdb = opts.rtdb;
        var fm   = opts.fm;
        var sessionCode = opts.sessionCode;
        var tableNumber = opts.tableNumber;
        var heartbeatMs = typeof opts.heartbeatMs === 'number' ? opts.heartbeatMs : 15000;
        var onGameState          = opts.onGameState          || function() {};
        var onSessionLost        = opts.onSessionLost        || function() {};
        var onFbConnectionChange = opts.onFbConnectionChange || function() {};
        var onResume             = opts.onResume             || function() {};

        var alive = true;
        var unsubs = [];
        var heartbeatIv = null;

        var gameStatePath = 'sessions/' + sessionCode + '/gameState';
        var clientPath    = 'sessions/' + sessionCode + '/clients/' + tableNumber;

        // Força um get() do gameState e dispatch para os callbacks. Garante que
        // mesmo que o listener onValue não dispare após reconexão, o cliente recebe
        // a última versão do servidor.
        function forceRefresh() {
            if (!alive) return;
            fm.get(fm.ref(rtdb, gameStatePath)).then(function(snap) {
                if (!alive) return;
                var data = snap.val();
                if (!data) return;
                if (data.active === false) onSessionLost();
                else onGameState(data);
            }).catch(function() {});
            fm.update(fm.ref(rtdb, clientPath), { lastSeen: Date.now() }).catch(function() {});
        }

        // Visibilidade / focus / online → acorda WebSocket + forceRefresh + onResume.
        // Em iOS Safari o socket pode estar morto após background; goOnline acorda-o.
        var visibilityFn = function() {
            if (document.visibilityState !== 'visible') return;
            try { fm.goOnline && fm.goOnline(rtdb); } catch(e) {}
            forceRefresh();
            onResume();
        };
        document.addEventListener('visibilitychange', visibilityFn);
        window.addEventListener('focus',    visibilityFn);
        window.addEventListener('pageshow', visibilityFn);
        window.addEventListener('online',   visibilityFn);

        // .info/connected — quando reconecta, força refresh.
        unsubs.push(fm.onValue(fm.ref(rtdb, '.info/connected'), function(snap) {
            if (!alive) return;
            var ok = !!snap.val();
            onFbConnectionChange(ok);
            if (ok) forceRefresh();
        }));

        // gameState listener — onValue em tempo real.
        unsubs.push(fm.onValue(fm.ref(rtdb, gameStatePath), function(snap) {
            if (!alive) return;
            var data = snap.val();
            if (!data) return;
            if (data.active === false) onSessionLost();
            else onGameState(data);
        }));

        // clients/<n> listener — detecta quando o master remove a mesa.
        // O primeiro callback é ignorado (representa o estado actual, não uma remoção).
        var firstClientCb = true;
        unsubs.push(fm.onValue(fm.ref(rtdb, clientPath), function(snap) {
            if (!alive) return;
            if (firstClientCb) { firstClientCb = false; return; }
            if (!snap.val()) onSessionLost();
        }));

        // Heartbeat — escreve lastSeen para o master saber que estamos vivos.
        function beat() {
            if (!alive) return;
            fm.update(fm.ref(rtdb, clientPath), { lastSeen: Date.now() }).catch(function() {});
        }
        beat();
        heartbeatIv = setInterval(beat, heartbeatMs);

        return {
            disconnect: function() {
                if (!alive) return;
                alive = false;
                document.removeEventListener('visibilitychange', visibilityFn);
                window.removeEventListener('focus',    visibilityFn);
                window.removeEventListener('pageshow', visibilityFn);
                window.removeEventListener('online',   visibilityFn);
                unsubs.forEach(function(u) { try { u(); } catch(e) {} });
                if (heartbeatIv) { clearInterval(heartbeatIv); heartbeatIv = null; }
            },
            forceRefresh: forceRefresh
        };
    }

    /**
     * Adquire o screen wake lock (mantém o ecrã aceso enquanto o cliente está
     * em jogo) e re-adquire automaticamente quando a tab volta ao foreground.
     *
     * Se o browser não suportar `navigator.wakeLock`, falha silenciosamente.
     *
     * @returns {{release: function}}
     *   - release(): liberta o lock e desliga o re-acquire automático
     */
    function attachWakeLock() {
        var wakeLock = null;
        var alive    = true;

        function acquire() {
            if (!alive) return;
            try {
                if ('wakeLock' in navigator) {
                    navigator.wakeLock.request('screen').then(function(lock) {
                        if (!alive) { try { lock.release(); } catch(e) {} return; }
                        wakeLock = lock;
                    }).catch(function() {});
                }
            } catch(e) {}
        }

        function onVisible() {
            if (document.visibilityState === 'visible') acquire();
        }

        document.addEventListener('visibilitychange', onVisible);
        acquire();

        return {
            release: function() {
                if (!alive) return;
                alive = false;
                document.removeEventListener('visibilitychange', onVisible);
                if (wakeLock) {
                    try { wakeLock.release().catch(function() {}); } catch(e) {}
                    wakeLock = null;
                }
            }
        };
    }

    /**
     * Faz "join" a uma sessão multijogador. Lê e valida a sessão, detecta
     * colisões de mesa entre dispositivos (via clientId persistente), e escreve
     * a entrada do cliente em sessions/<code>/clients/<n>.
     *
     * Não modifica estado React — devolve um result `{ok, ...}` que o caller
     * usa para actualizar a sua UI.
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm
     * @param {string} opts.sessionCode    código da sessão (será uppercased + trimmed)
     * @param {number|string} opts.tableNumber  número da mesa (será parsed para int)
     * @param {string} [opts.teamName]     nome da equipa (default 'Mesa <n>')
     * @param {string} [opts.emails]       emails separados por vírgula
     * @param {string} opts.clientId       UUID persistente do dispositivo
     * @param {string} [opts.gameType]     valida gs.gameType — se não bater, falha
     * @param {boolean} [opts.isAuto]      true em auto-reconnect (UX de erro diferente)
     * @returns {Promise<{ok:boolean, error?:string, clearLocal?:boolean,
     *                   code?:string, table?:number, teamName?:string, emails?:string}>}
     */
    async function joinSession(opts) {
        if (!opts || !opts.rtdb || !opts.fm) throw new Error('joinSession requer rtdb e fm');
        if (!opts.clientId) throw new Error('joinSession requer clientId');

        var rtdb = opts.rtdb, fm = opts.fm;
        var code     = String(opts.sessionCode || '').trim().toUpperCase();
        var table    = parseInt(opts.tableNumber, 10);
        var teamName = String(opts.teamName || '').trim();
        var emails   = String(opts.emails || '').trim();
        var clientId = opts.clientId;
        var gameType = opts.gameType || null;
        var isAuto   = !!opts.isAuto;

        // Tradução de erros: I18n é carregado depois de client-core.js, mas joinSession
        // só é chamado após interacção do utilizador, por isso I18n já está disponível.
        var _t = function(key, vars) {
            return (window.I18n && window.I18n.t) ? window.I18n.t(key, vars) : key;
        };

        if (!code || !table || table < 1) {
            return { ok: false, error: _t('err_code_table_required') };
        }
        if (!isAuto && !teamName) {
            return { ok: false, error: _t('err_team_required') };
        }

        try {
            // Ler gameState (one-shot) — verifica se a sessão existe e está válida
            var gsSnap = await new Promise(function(resolve) {
                fm.onValue(fm.ref(rtdb, 'sessions/' + code + '/gameState'), resolve, { onlyOnce: true });
            });
            var gs = gsSnap.val();
            if (!gs) return { ok: false, error: _t('err_session_not_found', { code: code }) };
            if (gs.active === false) return { ok: false, error: _t('err_session_inactive', { code: code }) };
            if (gameType && gs.gameType && gs.gameType !== gameType) {
                return { ok: false, error: _t('err_wrong_game') };
            }

            // Ler clients/<n> (uma vez só) — usado para tablesLocked + deteção de colisão
            var cSnap = await new Promise(function(resolve) {
                fm.onValue(fm.ref(rtdb, 'sessions/' + code + '/clients/' + table), resolve, { onlyOnce: true });
            });
            var existing = cSnap.val();

            // tablesLocked: bloqueia novas entradas manuais; auto-rejoin de mesas existentes é permitido
            if (gs.tablesLocked && !isAuto && !existing) {
                return { ok: false, error: _t('err_tables_locked') };
            }

            // Colisão de clientId: a mesa pertence a outro dispositivo
            if (existing) {
                if (existing.clientId && existing.clientId !== clientId) {
                    if (isAuto) {
                        return {
                            ok: false,
                            error: _t('err_table_taken_auto', { n: table }),
                            clearLocal: true
                        };
                    }
                    return { ok: false, error: _t('err_table_taken', { n: table }) };
                }
                if (!isAuto && !existing.clientId) {
                    // Cliente legacy sem clientId — bloqueia entrada manual por segurança
                    return { ok: false, error: _t('err_table_connected', { n: table }) };
                }
            }

            // Escrever a entrada do cliente
            await fm.set(fm.ref(rtdb, 'sessions/' + code + '/clients/' + table), {
                tableNumber: table,
                teamName:    teamName || ('Mesa ' + table),
                emails:      emails ? emails.split(',').map(function(s) { return s.trim(); }) : [],
                connectedAt: Date.now(),
                lastSeen:    Date.now(),
                clientId:    clientId
            });

            return { ok: true, code: code, table: table, teamName: teamName, emails: emails };
        } catch(e) {
            return { ok: false, error: _t('err_connect_generic') };
        }
    }

    /**
     * Escreve um payload num caminho do RTDB e verifica que o servidor o tem
     * efectivamente — protege contra writes que parecem ter sucesso mas que se
     * perdem em condições de rede instável (WebSocket meio-morto, etc.).
     *
     * Faz set + get em loop até `attempts` tentativas, com timeouts em cada
     * passo e backoff entre tentativas. Considera o write válido só se o get
     * devolver um valor com o mesmo `verifyKey` que o payload e (se fornecido)
     * o mesmo `clientId` — garante que não estamos a ler um write de outro
     * dispositivo no mesmo path.
     *
     * @param {object} opts
     * @param {object} opts.rtdb
     * @param {object} opts.fm
     * @param {string} opts.path           caminho RTDB onde escrever
     * @param {object} opts.payload        objecto a escrever
     * @param {string} [opts.clientId]     se fornecido, exige v.clientId === clientId no verify
     * @param {string} [opts.verifyKey='text']  campo do payload a comparar (ex: 'text', 'value')
     * @param {number} [opts.attempts=3]
     * @param {number} [opts.writeTimeoutMs=6000]
     * @param {number} [opts.readTimeoutMs=5000]
     * @param {number} [opts.backoffMs=400]
     * @returns {Promise<{ok:boolean, error?:Error}>}
     */
    async function submitWithVerify(opts) {
        if (!opts || !opts.rtdb || !opts.fm || !opts.path) throw new Error('submitWithVerify requer rtdb, fm, path');
        var rtdb = opts.rtdb, fm = opts.fm;
        var path     = opts.path;
        var payload  = opts.payload || {};
        var clientId = opts.clientId || null;
        var verifyKey = opts.verifyKey || 'text';
        var attempts        = typeof opts.attempts        === 'number' ? opts.attempts        : 3;
        var writeTimeoutMs  = typeof opts.writeTimeoutMs  === 'number' ? opts.writeTimeoutMs  : 6000;
        var readTimeoutMs   = typeof opts.readTimeoutMs   === 'number' ? opts.readTimeoutMs   : 5000;
        var backoffMs       = typeof opts.backoffMs       === 'number' ? opts.backoffMs       : 400;

        var lastErr = null;
        for (var i = 0; i < attempts; i++) {
            try {
                await withTimeout(fm.set(fm.ref(rtdb, path), payload), writeTimeoutMs);
                var snap = await withTimeout(fm.get(fm.ref(rtdb, path)), readTimeoutMs);
                var v = snap.val();
                if (v && (!clientId || v.clientId === clientId) && v[verifyKey] === payload[verifyKey]) {
                    return { ok: true };
                }
                lastErr = new Error('verify_mismatch');
            } catch(e) {
                lastErr = e;
            }
            if (i < attempts - 1) {
                await new Promise(function(r) { setTimeout(r, backoffMs); });
            }
        }
        return { ok: false, error: lastErr };
    }

    window.ClientCore = {
        getClientId:      getClientId,
        withTimeout:      withTimeout,
        createLocalStore: createLocalStore,
        computeConnState: computeConnState,
        connectClient:    connectClient,
        attachWakeLock:   attachWakeLock,
        joinSession:      joinSession,
        submitWithVerify: submitWithVerify
    };
})();
