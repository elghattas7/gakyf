// =====================================================
// GÉNÉRATEUR DE SCRIPT SQL POUR L'IMPORTATION
// Convertit adresses.xlsx en script SQL
// =====================================================

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function generateSQL() {
    try {
        console.log('🚀 Génération du script SQL...\n');

        // 1. Lire le fichier Excel
        const filePath = path.join(__dirname, 'adresses.xlsx');
        console.log(`📂 Lecture du fichier: ${filePath}`);

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convertir en JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log(`✅ ${data.length} lignes trouvées dans le fichier Excel\n`);

        // 2. Générer le SQL
        let sqlContent = `-- =====================================================
-- SCRIPT D'IMPORTATION DES ADRESSES DES VEUVES
-- Généré automatiquement depuis adresses.xlsx
-- Date: ${new Date().toLocaleString('fr-FR')}
-- =====================================================

-- Mise à jour des adresses des veuves
-- Utilise le nom complet pour identifier chaque veuve

`;

        let updateCount = 0;
        const notFound = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            const nomComplet = row['الاسم الكامل للأرملة'];
            const adresse = row['عنوان السكنى'];

            if (!nomComplet || !adresse) {
                console.log(`⚠️  Ligne ${i + 1}: Données manquantes, ignorée`);
                continue;
            }

            // Échapper les apostrophes pour SQL
            const nomCompletEscaped = nomComplet.replace(/'/g, "''");
            const adresseEscaped = adresse.replace(/'/g, "''");

            // Générer la requête UPDATE
            sqlContent += `-- Ligne ${i + 1}: ${nomComplet}\n`;
            sqlContent += `UPDATE veuves SET adresse_residence = '${adresseEscaped}' WHERE nom_complet = '${nomCompletEscaped}';\n\n`;

            updateCount++;
        }

        sqlContent += `-- =====================================================
-- FIN DU SCRIPT
-- Total de ${updateCount} mises à jour
-- =====================================================
`;

        // 3. Écrire le fichier SQL
        const outputPath = path.join(__dirname, 'import-adresses.sql');
        fs.writeFileSync(outputPath, sqlContent, 'utf8');

        console.log('✅ Script SQL généré avec succès!\n');
        console.log(`📄 Fichier créé: ${outputPath}`);
        console.log(`📝 Nombre de requêtes UPDATE: ${updateCount}\n`);
        console.log('🔧 Pour exécuter ce script:');
        console.log('   1. Ouvrez le SQL Editor dans Supabase');
        console.log('   2. Copiez-collez le contenu de import-adresses.sql');
        console.log('   3. Exécutez le script\n');

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

generateSQL();
