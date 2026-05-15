/**
 * ====================================================================
 * I18n — internacionalização do Sistema de Pontuação
 * ====================================================================
 * Uso:
 *   I18n.t('key')                     → string na língua activa
 *   I18n.t('key', { n: 5 })           → string com interpolação {{n}}
 *   I18n.setLang('en')                → muda língua, persiste em localStorage,
 *                                        dispara evento 'i18n:change'
 *   I18n.getCurrentLang()             → 'pt' | 'en' | ...
 *   I18n.getFlag()                    → emoji da língua activa
 *   I18n.getFlag('en')               → emoji de língua específica
 *   I18n.getLanguages()               → ['pt', 'en']
 *   I18n.registerStrings('pt', {...}) → chamado pelos ficheiros de língua
 * ====================================================================
 */
(function () {
    'use strict';

    var LANG_KEY  = 'score_lang';
    var LANGUAGES = ['pt', 'en'];
    var FLAGS     = { pt: '🇵🇹', en: '🇬🇧' };

    var _strings = {};

    // Língua inicial: localStorage → 'pt' como fallback
    var _current = (function () {
        try { return localStorage.getItem(LANG_KEY) || 'pt'; } catch (e) { return 'pt'; }
    })();

    /** Regista strings para uma língua (chamado pelos ficheiros i18n-*.js). */
    function registerStrings(lang, data) {
        _strings[lang] = data;
    }

    /**
     * Muda a língua activa, persiste em localStorage e dispara o evento
     * 'i18n:change' (detail: { lang }) para que os componentes React possam
     * actualizar o estado e forçar re-render.
     */
    function setLang(lang) {
        if (LANGUAGES.indexOf(lang) < 0) return;
        _current = lang;
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
        document.documentElement.lang = (lang === 'pt') ? 'pt' : lang;
        window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
    }

    /**
     * Resolve uma chave na língua activa. Interpola variáveis {{name}}.
     * Fallback: língua 'pt' → chave em bruto.
     */
    function t(key, vars) {
        var s = (_strings[_current] || {})[key];
        if (s === undefined) s = (_strings['pt'] || {})[key];
        if (s === undefined) return key;
        if (!vars) return s;
        return s.replace(/\{\{(\w+)\}\}/g, function (_, k) {
            return vars[k] !== undefined ? String(vars[k]) : '{{' + k + '}}';
        });
    }

    function getCurrentLang() { return _current; }
    function getFlag(lang)    { return FLAGS[lang !== undefined ? lang : _current] || '🌐'; }
    function getLanguages()   { return LANGUAGES.slice(); }

    window.I18n = {
        registerStrings : registerStrings,
        setLang         : setLang,
        t               : t,
        getCurrentLang  : getCurrentLang,
        getFlag         : getFlag,
        getLanguages    : getLanguages
    };
})();
