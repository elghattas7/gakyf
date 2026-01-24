// =====================================================
// SCRIPT DE DIAGNOSTIC - Vérifier les noms dans la BD
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = 'https://kirwstsxpzwuuujtagea.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpcndzdHN4cHp3dXV1anRhZ2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Mjk1ODEsImV4cCI6MjA4NDIwNTU4MX0.CEAPaKHwO01Y0RGjnyQ1XEf0uMxMxX5SRww7VVprMwc';

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
    try {
        console.log('🔍 Vérification de la base de données...\n');

        // Récupérer toutes les veuves
        const { data: veuves, error } = await supabase
            .from('veuves')
            .select('id, nom_complet, adresse_residence')
            .order('nom_complet');

        if (error) {
            console.error('❌ Erreur:', error);
            return;
        }

        console.log(`📊 Nombre total de veuves dans la BD: ${veuves.length}\n`);

        if (veuves.length > 0) {
            console.log('📋 Premiers 10 enregistrements:\n');
            veuves.slice(0, 10).forEach((veuve, index) => {
                console.log(`${index + 1}. Nom: "${veuve.nom_complet}"`);
                console.log(`   Adresse actuelle: ${veuve.adresse_residence || '(vide)'}`);
                console.log('');
            });

            // Vérifier si des adresses sont déjà remplies
            const withAddress = veuves.filter(v => v.adresse_residence);
            const withoutAddress = veuves.filter(v => !v.adresse_residence);

            console.log(`✅ Veuves avec adresse: ${withAddress.length}`);
            console.log(`⚠️  Veuves sans adresse: ${withoutAddress.length}\n`);
        } else {
            console.log('⚠️  Aucune veuve trouvée dans la base de données!\n');
        }

    } catch (error) {
        console.error('❌ Erreur fatale:', error);
    }
}

checkDatabase();
