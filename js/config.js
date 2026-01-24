// =====================================================
// CONFIGURATION SUPABASE
// =====================================================
// IMPORTANT: Remplacez ces valeurs par vos propres credentials Supabase
// Vous pouvez les trouver dans: Supabase Dashboard > Settings > API

const SUPABASE_CONFIG = {
    url: 'VOTRE_URL_SUPABASE', // Ex: https://xxxxx.supabase.co
    anonKey: 'VOTRE_CLE_PUBLIQUE_SUPABASE' // Clé publique (anon/public)
};

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
