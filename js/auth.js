// =====================================================
// GESTION DE l'AUTHENTIFICATION
// =====================================================

// Domaine fictif pour les logins sans format email (requis par Supabase)

// Domaine fictif pour les logins sans format email (requis par Supabase)
const DUMMY_DOMAIN = '@akyf.com';

/**
 * Assure que le login a un format email pour Supabase
 */
function formatLogin(identifier) {
    if (!identifier) return identifier;
    return identifier.includes('@') ? identifier : `${identifier}${DUMMY_DOMAIN}`;
}

/**
 * Connexion de l'utilisateur
 */
async function login(identifier, password) {
    const email = formatLogin(identifier);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Erreur de connexion:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

/**
 * Déconnexion de l'utilisateur
 */
async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Erreur de déconnexion:', error);
        return { success: false, error: error.message };
    }

    // Rediriger vers la page de connexion
    window.location.href = 'index.html';
    return { success: true };
}

/**
 * Inscription d'un nouvel utilisateur (réservé aux admins)
 */
async function register(identifier, password, fullName, role) {
    // Vérifier que l'utilisateur actuel est admin
    const isUserAdmin = await window.supabaseClient.isAdmin();
    if (!isUserAdmin) {
        return { success: false, error: 'Seuls les administrateurs peuvent créer des comptes' };
    }

    const email = formatLogin(identifier);

    // Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role
            }
        }
    });

    if (authError) {
        console.error('Erreur lors de la création du compte:', authError);
        return { success: false, error: authError.message };
    }

    // Note: Le profil est maintenant créé automatiquement par un trigger PostgreSQL
    // (public.handle_new_user) déclenché après l'insertion dans auth.users.

    // On attend un court instant pour laisser le trigger s'exécuter
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true, data: authData };
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
async function checkAuth() {
    const session = await window.supabaseClient.getCurrentSession();
    return session !== null;
}

/**
 * Protéger une page (rediriger si non authentifié)
 */
async function protectPage() {
    const isAuthenticated = await checkAuth();

    if (!isAuthenticated) {
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

/**
 * Rediriger selon le rôle après connexion
 */
async function redirectByRole() {
    const profile = await window.supabaseClient.getCurrentUserProfile();

    if (!profile) {
        window.location.href = 'index.html';
        return;
    }

    // Tous les rôles vont au dashboard
    window.location.href = 'dashboard.html';
}

/**
 * Vérifier les permissions pour une page
 */
async function checkPagePermission(allowedRoles) {
    const profile = await window.supabaseClient.getCurrentUserProfile();

    if (!profile) {
        window.location.href = 'index.html';
        return false;
    }

    if (!allowedRoles.includes(profile.role)) {
        if (typeof showNotification === 'function') {
            showNotification('Vous n\'avez pas les permissions pour accéder à cette page', 'error');
        }
        window.location.href = 'dashboard.html';
        return false;
    }

    return true;
}

/**
 * Récupérer les informations de l'utilisateur connecté pour l'affichage
 */
async function getCurrentUserInfo() {
    const profile = await window.supabaseClient.getCurrentUserProfile();
    return profile;
}

// Écouter les changements d'état d'authentification
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);

    if (event === 'SIGNED_OUT') {
        window.location.href = 'index.html';
    }
});

// Export des fonctions
window.auth = {
    login,
    logout,
    register,
    checkAuth,
    protectPage,
    redirectByRole,
    checkPagePermission,
    getCurrentUserInfo
};

/**
 * Check if current user is admin
 */
async function isAdmin() {
    return await window.supabaseClient.isAdmin();
}

/**
 * Check if current user can write
 */
async function canWrite() {
    return await window.supabaseClient.canWrite();
}

/**
 * Protect admin-only pages
 */
async function requireAdmin() {
    const isAuthenticated = await checkAuth();

    if (!isAuthenticated) {
        window.location.href = 'index.html';
        return false;
    }

    const adminCheck = await isAdmin();
    if (!adminCheck) {
        if (typeof utils !== 'undefined' && typeof utils.showNotification === 'function') {
            utils.showNotification('Accès réservé aux administrateurs', 'error');
        }
        window.location.href = 'dashboard.html';
        return false;
    }

    return true;
}

// Add to exports
window.auth.isAdmin = isAdmin;
window.auth.canWrite = canWrite;
window.auth.requireAdmin = requireAdmin;

