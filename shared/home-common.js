/**
 * Lógica partilhada pelas páginas de entrada (masters.html, jogar.html).
 *
 * Lê o código de sessão da própria URL (?sessao= ou ?session=) e propaga-o
 * para os links dos jogos via ?session=, que é o parâmetro que client.html,
 * client-hitster.html e client-diamant.html já sabem ler.
 */
(function () {
    'use strict';

    function getSessionCode() {
        var params = new URLSearchParams(window.location.search);
        var code = params.get('sessao') || params.get('session');
        return code ? code.toUpperCase() : null;
    }

    function withParam(href, key, value) {
        var url = new URL(href, window.location.href);
        url.searchParams.set(key, value);
        return url.pathname + url.search;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var code = getSessionCode();
        if (!code) return;

        document.querySelectorAll('[data-game-link]').forEach(function (a) {
            a.setAttribute('href', withParam(a.getAttribute('href'), 'session', code));
        });

        var crossLink = document.getElementById('cross-hub-link');
        if (crossLink) {
            crossLink.setAttribute('href', withParam(crossLink.getAttribute('href'), 'sessao', code));
        }

        var badge = document.getElementById('session-badge');
        if (badge) {
            badge.textContent = 'Sessão: ' + code;
            badge.classList.remove('hidden');
        }
    });
})();
