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

    window.ClientCore = {
        getClientId:      getClientId,
        withTimeout:      withTimeout,
        createLocalStore: createLocalStore,
        computeConnState: computeConnState
    };
})();
