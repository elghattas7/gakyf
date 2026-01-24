/**
 * Système de gestion multilingue
 */
const i18n = {
    currentLang: 'ar',
    translations: {},

    /**
     * Initialiser le système i18n
     */
    init: async function () {
        // Charger les préférences utilisateur
        const savedLang = localStorage.getItem('app_language');
        this.currentLang = savedLang || 'ar';

        // Charger les traductions globales
        if (window.translations) {
            this.translations = window.translations;
        } else {
            console.error("Traductions non trouvées ! Assurez-vous que translations.js est chargé.");
        }

        // Appliquer la langue initiale
        this.applyLanguage(this.currentLang);

        console.log(`i18n initialisé avec la langue: ${this.currentLang}`);
    },

    /**
     * Changer la langue
     * @param {string} lang Code langue (fr, en, es, de, ar)
     */
    setLanguage: function (lang) {
        if (!this.translations[lang]) {
            console.warn(`Langue non supportée: ${lang}`);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('app_language', lang);
        this.applyLanguage(lang);
    },

    /**
     * Appliquer les changements de langue au DOM
     * @param {string} lang 
     */
    applyLanguage: function (lang) {
        // 1. Mettre à jour la direction (RTL pour arabe)
        const isRtl = lang === 'ar';
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

        // Ajuster Tailwind pour RTL si nécessaire (ajouter classe spécifique)
        if (isRtl) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }

        // 2. Traduire les éléments avec data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // Si c'est un input placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // 3. Traduire les titres (tooltips) avec data-i18n-title
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                el.title = translation;
            }
        });

        // 4. Mettre à jour le selecteur de langue si présent
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) {
            langSelect.value = lang;
        }

        // Déclencher un événement pour que d'autres scripts puissent réagir
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },

    /**
     * Obtenir une traduction
     * @param {string} key Clé de traduction
     * @returns {string} Texte traduit
     */
    t: function (key) {
        if (!this.translations[this.currentLang]) return key;
        return this.translations[this.currentLang][key] || key;
    }
};

// Exposer globalement
window.i18n = i18n;

// Auto-init si chargé
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser i18n directement
    i18n.init();
});
