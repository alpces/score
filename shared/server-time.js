/**
 * server-time.js — relógio corrigido pelo offset do servidor Firebase, partilhado
 * por todas as apps deste sistema de pontuação multijogador.
 *
 * Qualquer temporizador sincronizado entre dispositivos (master, projetor, clientes)
 * funciona comparando timestamps absolutos (`Date.now() + duração`) escritos por um
 * dispositivo e lidos por outro. Se os relógios dos dispositivos não estiverem
 * alinhados — o que é comum entre telemóveis/portáteis — essa comparação fica
 * desfasada: um temporizador pode aparecer já a meio, ou uma animação cronometrada
 * (ex: a roleta de categoria do Hitster) pode saltar logo para o fim.
 *
 * O Firebase Realtime Database expõe um nó especial, `.info/serverTimeOffset`, com
 * a diferença (em ms) entre o relógio do servidor e o relógio local deste
 * dispositivo. `ServerTime.now()` soma esse offset a `Date.now()`, dando uma
 * estimativa do "tempo verdadeiro" que é consistente entre todos os dispositivos
 * ligados à mesma sessão — cada um mede o seu próprio desvio, sem precisar de se
 * coordenar entre si.
 *
 * Como usar: carregar como <script>, depois de `firebase-config.js`, e chamar
 * `ServerTime.init(rtdb, fm)` assim que o Firebase estiver pronto (uma vez, no
 * arranque da app). A partir daí, usar `ServerTime.now()` em vez de `Date.now()`
 * em qualquer sítio que calcule ou compare timestamps de temporizadores partilhados.
 *
 * Disponível em window.ServerTime.
 */

(function() {
    'use strict';

    var offset = 0;
    var ready = false;
    var listeners = [];

    /**
     * Liga a subscrição ao offset do servidor. Idempotente — chamar mais do que
     * uma vez (ex: em master.html e no separador do projetor, que são a mesma
     * app) não cria subscrições duplicadas.
     *
     * @param {Object} rtdb - instância da Realtime Database (window.rtdb)
     * @param {Object} fm   - módulos Firebase modular SDK { ref, onValue, ... }
     */
    var initialized = false;
    function init(rtdb, fm) {
        if (initialized) return;
        initialized = true;
        fm.onValue(fm.ref(rtdb, '.info/serverTimeOffset'), function(snap) {
            var val = snap.val();
            offset = typeof val === 'number' ? val : 0;
            var wasReady = ready;
            ready = true;
            if (!wasReady) listeners.forEach(function(cb) { try { cb(); } catch (e) {} });
        });
    }

    /**
     * @returns {number} estimativa do tempo atual do servidor, em ms desde epoch —
     *   usar exactamente onde se usaria Date.now() para qualquer temporizador que
     *   precise de estar sincronizado entre dispositivos. Antes do primeiro valor
     *   chegar do Firebase (offset ainda 0), degrada de forma segura para o relógio
     *   local do dispositivo — nunca bloqueia nem atira erro.
     */
    function now() {
        return Date.now() + offset;
    }

    /**
     * Regista um callback a correr assim que o primeiro offset real chegar do
     * servidor (opcional — a maioria do código pode simplesmente usar now() desde
     * o início, já que o offset inicial de 0 é uma aproximação razoável até lá).
     */
    function onReady(cb) {
        if (ready) { cb(); return; }
        listeners.push(cb);
    }

    window.ServerTime = {
        init: init,
        now: now,
        onReady: onReady
    };
})();
