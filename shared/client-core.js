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

    window.ClientCore = {
        getClientId:      getClientId,
        withTimeout:      withTimeout,
        createLocalStore: createLocalStore,
        computeConnState: computeConnState,
        connectClient:    connectClient
    };
})();
