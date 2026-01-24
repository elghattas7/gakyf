// =====================================================
// CLIENT SUPABASE
// Initialisation et export du client Supabase
// =====================================================

// Créer le client Supabase
const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

// =====================================================
// FONCTIONS UTILITAIRES POUR LA BASE DE DONNÉES
// =====================================================

/**
 * Récupère la session utilisateur actuelle
 */
async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        return null;
    }
    return session;
}

/**
 * Récupère le profil de l'utilisateur connecté
 */
async function getCurrentUserProfile() {
    const session = await getCurrentSession();
    if (!session) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        return null;
    }

    return data;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 */
async function hasRole(roles) {
    const profile = await getCurrentUserProfile();
    if (!profile) return false;

    if (Array.isArray(roles)) {
        return roles.includes(profile.role);
    }
    return profile.role === roles;
}

/**
 * Vérifie si l'utilisateur est admin
 */
async function isAdmin() {
    return await hasRole('admin');
}

/**
 * Vérifie si l'utilisateur est gestionnaire ou admin
 */
async function canManage() {
    return await hasRole(['admin', 'gestionnaire']);
}

/**
 * Vérifie si l'utilisateur a le droit d'écriture (ajout, modification, suppression)
 */
async function canWrite() {
    return await hasRole(['admin', 'président', 'vice-président', 'secrétaire', 'trésorier']);
}

// Export des fonctions pour utilisation globale
window.supabaseClient = {
    supabase,
    getCurrentSession,
    getCurrentUserProfile,
    hasRole,
    isAdmin,
    canManage,
    canWrite
};
