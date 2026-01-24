// =====================================================
// CONFIGURATION SUPABASE
// =====================================================

// IMPORTANT: Remplacer ces valeurs par vos vraies credentials Supabase
// 1. Aller sur https://supabase.com
// 2. Créer un projet (ou utiliser un existant)
// 3. Aller dans Settings > API
// 4. Copier l'URL du projet et la clé "anon public"

const SUPABASE_URL = 'https://kirwstsxpzwuuujtagea.supabase.co'; // Ex: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcndzdHN4cHp3dXV1anRhZ2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mjk1ODEsImV4cCI6MjA4NDIwNTU4MX0.CEAPaKHwO01Y0RGjnyQ1XEf0uMxMxX5SRww7VVprMwc'; // La clé publique "anon"

// Créer le client Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exposer globalement
window.supabase = supabaseClient;

// =====================================================
// WRAPPER POUR COMPATIBILITÉ AVEC LE CODE EXISTANT
// =====================================================

window.supabaseClient = {
    /**
     * Récupérer la session actuelle
     */
    async getCurrentSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session;
    },

    /**
     * Récupérer le profil de l'utilisateur connecté
     */
    async getCurrentUserProfile() {
        const session = await this.getCurrentSession();
        if (!session) return null;

        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            // DEBUG: Show detailed error to user
            alert('Debug Error: Failed to fetch profile. ' + error.message + ' (' + error.code + ')');
            return null;
        }

        if (!data) {
            alert('Debug Error: Profile fetch returned no data (and no specific error error).');
        }

        return data;
    },

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     */
    async hasRole(roles) {
        const profile = await this.getCurrentUserProfile();
        if (!profile) return false;

        if (Array.isArray(roles)) {
            return roles.includes(profile.role);
        }
        return profile.role === roles;
    },

    /**
     * Vérifier si l'utilisateur est admin
     */
    async isAdmin() {
        return await this.hasRole('admin');
    },

    /**
     * Vérifier si l'utilisateur peut écrire
     */
    async canWrite() {
        return await this.hasRole(['admin', 'président', 'vice-président', 'secrétaire', 'trésorier']);
    }
};

console.log('✅ Supabase configuré et prêt');
alert('DEBUG: js/supabase-config.js LOADED. Supabase URL: ' + SUPABASE_URL);
