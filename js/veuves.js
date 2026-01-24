// =====================================================
// GESTION DES VEUVES
// =====================================================

let currentVeuves = [];
let pagination = null;
let currentFilters = {
    search: '',
    ville: '',
    sortBy: 'note',
    sortOrder: 'desc'
};

/**
 * Charger toutes les veuves
 */
async function loadVeuves() {
    showLoader();

    try {
        let query = supabase
            .from('veuves')
            .select('*', { count: 'exact' });

        // Appliquer les filtres
        if (currentFilters.search) {
            query = query.or(`nom_complet.ilike.%${currentFilters.search}%,numero_identification.ilike.%${currentFilters.search}%,telephone.ilike.%${currentFilters.search}%`);
        }

        if (currentFilters.ville) {
            query = query.eq('ville', currentFilters.ville);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        // Récupérer les orphelins pour le calcul de la note
        const { data: orphans } = await supabase.from('orphelins').select('id_mere, date_naissance, maladie_chronique, handicap');

        // Grouper les orphelins par mère
        const orphansByMother = {};
        if (orphans) {
            orphans.forEach(o => {
                if (!orphansByMother[o.id_mere]) orphansByMother[o.id_mere] = [];
                orphansByMother[o.id_mere].push(o);
            });
        }

        // Calculer la note
        currentVeuves = (data || []).map(v => ({
            ...v,
            note: calculateNote(v, orphansByMother[v.id] || [])
        }));

        // Tri manuel si par note
        if (currentFilters.sortBy === 'note') {
            currentVeuves.sort((a, b) => currentFilters.sortOrder === 'asc' ? a.note - b.note : b.note - a.note);
        } else {
            // Si tri standard (nom, ville...), on applique le tri localement pour être sûr
            // car le mock db a déjà fait le tri db-side mais on a reconstruit l'array.
            // On re-trie si nécessaire.
            const field = currentFilters.sortBy;
            const order = currentFilters.sortOrder === 'asc' ? 1 : -1;
            if (field !== 'note') {
                currentVeuves.sort((a, b) => {
                    let valA = a[field] ?? '';
                    let valB = b[field] ?? '';

                    // Handle boolean sorting
                    if (typeof valA === 'boolean') valA = valA ? 1 : 0;
                    if (typeof valB === 'boolean') valB = valB ? 1 : 0;

                    if (field === 'revenu_mensuel') {
                        valA = Number(valA) || 0;
                        valB = Number(valB) || 0;
                        return (valA - valB) * order;
                    }

                    if (valA < valB) return -1 * order;
                    if (valA > valB) return 1 * order;
                    return 0;
                });
            }
        }

        // Initialiser la pagination
        if (!pagination || pagination.totalItems !== count) {
            pagination = new utils.Pagination(count, 10);
        }

        displayVeuves();
    } catch (error) {
        console.error('Erreur lors du chargement des veuves:', error);
        showNotification('Erreur lors du chargement des veuves', 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Afficher les veuves dans le tableau
 */
async function displayVeuves() {
    const tbody = document.getElementById('veuvesTableBody');

    if (!currentVeuves || currentVeuves.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-8 text-gray-500">
                    Aucune veuve trouvée
                </td>
            </tr>
        `;
        document.getElementById('paginationContainer').innerHTML = '';
        return;
    }

    // Pagination
    const start = pagination.offset;
    const end = start + pagination.itemsPerPage;
    const paginatedData = currentVeuves.slice(start, end);

    const canWrite = await auth.canWrite();

    let html = '';
    paginatedData.forEach(veuve => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-3">
                    <div class="font-medium text-gray-900 text-sm">${veuve.nom_complet || '-'}</div>
                    <div class="text-xs text-gray-500">${veuve.numero_identification || '-'}</div>
                </td>
                <td class="px-2 py-3 text-center text-sm">${veuve.telephone || '-'}</td>
                <td class="px-2 py-3 text-center text-sm">${veuve.ville || '-'}</td>
                <td class="px-2 py-3 text-center text-xs">
                    ${veuve.type_logement ? `<span class="px-2 py-1 rounded-full bg-gray-100 text-gray-700">${veuve.type_logement.substring(0, 4)}</span>` : '-'}
                </td>
                <td class="px-2 py-3 text-center">
                    ${veuve.soutien_social_direct ? '<span class="inline-flex w-5 h-5 rounded-full bg-green-100 items-center justify-center"><svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg></span>' : '<span class="inline-flex w-5 h-5 rounded-full bg-gray-100 items-center justify-center"><svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg></span>'}
                </td>
                <td class="px-2 py-3 text-center text-sm font-medium">${veuve.nombre_enfants_orphelins || 0}</td>
                <td class="px-2 py-3 text-center">
                    <span class="inline-flex px-2 py-1 text-xs font-bold rounded-full ${veuve.note >= 40 ? 'bg-red-100 text-red-700' : veuve.note >= 25 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}">${veuve.note}</span>
                </td>
                <td class="px-2 py-3 text-center text-xs">${utils.formatCurrency(veuve.revenu_mensuel)}</td>
                <td class="px-2 py-3 text-center no-print">
                    <div class="flex gap-1 justify-center">
                        <button onclick="viewVeuve('${veuve.id}')" class="p-1 text-blue-600 hover:bg-blue-50 rounded" title="${i18n.t('view')}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        ${canWrite ? `
                        <button onclick="editVeuve('${veuve.id}')" class="p-1 text-green-600 hover:bg-green-50 rounded" title="${i18n.t('edit')}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="deleteVeuve('${veuve.id}', '${veuve.nom_complet}')" class="p-1 text-red-600 hover:bg-red-50 rounded" title="${i18n.t('delete')}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Afficher la pagination
    pagination.renderPagination('paginationContainer', 'loadVeuves');
}

/**
 * Voir les détails d'une veuve
 */
function viewVeuve(id) {
    window.location.href = `veuve-detail.html?id=${id}`;
}

/**
 * Modifier une veuve
 */
function editVeuve(id) {
    window.location.href = `veuve-form.html?id=${id}`;
}

/**
 * Supprimer une veuve
 */
async function deleteVeuve(id, nom) {
    if (!await auth.canWrite()) {
        showNotification('Action non autorisée', 'error');
        return;
    }
    showConfirmModal(
        'Confirmer la suppression',
        `Êtes-vous sûr de vouloir supprimer la veuve "${nom}" ? Cette action est irréversible.`,
        async () => {
            showLoader();

            try {
                const { error } = await supabase
                    .from('veuves')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                showNotification('Veuve supprimée avec succès', 'success');
                await loadVeuves();
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                showNotification('Erreur lors de la suppression', 'error');
            } finally {
                hideLoader();
            }
        }
    );
}

/**
 * Charger les villes pour le filtre
 */
async function loadVillesFilter() {
    try {
        const { data } = await supabase
            .from('veuves')
            .select('ville');

        if (data) {
            const villes = [...new Set(data.map(v => v.ville).filter(v => v))];
            const select = document.getElementById('villeFilter');

            villes.forEach(ville => {
                const option = document.createElement('option');
                option.value = ville;
                option.textContent = ville;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des villes:', error);
    }
}

/**
 * Calculer la note selon le barème officiel
 */
function calculateNote(v, myOrphans) {
    let score = 0;

    // 1. Revenu Mensuel (0-10)
    const revenu = parseFloat(v.revenu_mensuel) || 0;
    if (revenu === 0) score += 10;
    else if (revenu < 1000) score += 8;
    else if (revenu >= 1000 && revenu < 2000) score += 6;
    else if (revenu >= 2000 && revenu <= 3000) score += 2;
    else score += 0; // > 3000

    // 2. Travail (0-5)
    const emploi = v.situation_professionnelle;
    if (emploi === 'Sans emploi') score += 5;
    else if (emploi === 'Emploi occasionnelle') score += 3;
    else score += 0; // Permanent

    // 3. Logement (0-10)
    const logement = v.type_logement;
    if (logement === 'Locataire') score += 10;
    else if (logement === 'Précaire') score += 8;
    else if (logement === 'Logement familial') score += 6;
    else if (logement === 'Propriétaire') score += 0;
    else score += 0;

    // 4. Soutien Social (0-10)
    // Table: "Benefits" = 0, "Does not benefit" = 10
    // DB Column: soutien_social_direct
    if (v.soutien_social_direct || (v.montant_soutien_social > 0)) {
        score += 0;
    } else {
        score += 10;
    }

    // 5. Orphelins (Age)
    // Table: 0-2 (10), 2-6 (8), 6-12 (6), 12-15 (4)
    if (myOrphans && myOrphans.length > 0) {
        myOrphans.forEach(o => {
            if (o.date_naissance) {
                const age = calculateAge(o.date_naissance);
                if (age < 2) score += 10;
                else if (age < 6) score += 8;
                else if (age < 12) score += 6;
                else if (age <= 15) score += 4; // Inclure 15 ans
            }
        });
    }

    // 6. Maladies ou Handicaps (0-2)
    // Table: "Chronic disease or one disability = 2"
    let hasHealthIssue = false;
    if (myOrphans) {
        hasHealthIssue = myOrphans.some(o => o.maladie_chronique || o.handicap);
    }
    if (hasHealthIssue) score += 2;

    return Math.max(0, score);
}

function calculateAge(dateString) {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

/**
 * Exporter les veuves en PDF
 */
async function exportVeuvesPDF() {
    if (!currentVeuves || currentVeuves.length === 0) {
        showNotification('Aucune donnée à exporter', 'warning');
        return;
    }

    // Select format
    const format = await exportUtils.promptExportFormat();
    if (!format) return;

    if (format === 'excel') {
        return exportVeuvesExcel();
    } else if (format === 'word') {
        return exportVeuvesWord();
    }

    // PDF generation using html2pdf
    try {
        utils.showLoader();

        const title = i18n.t('widows_list_pdf_title') || 'Liste des Veuves';
        const date = new Date().toLocaleDateString();
        const isArabic = i18n.currentLang === 'ar';
        const align = isArabic ? 'right' : 'left';

        // Define columns
        let htmlTable = `
            <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: sans-serif; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 10px;">${title}</h1>
                    <p style="color: #666;">${i18n.t('generated_on')}: ${date}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('full_name')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('cin_label')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('husband')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('phone')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('city')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('address')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('housing')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('support')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${i18n.t('orphans_count')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">${i18n.t('note_priority')}</th>
                            <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: ${align};">${i18n.t('income_column')}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        currentVeuves.forEach((v, index) => {
            const bgClass = index % 2 === 0 ? '#fff' : '#f9fafb';
            htmlTable += `
                <tr style="background-color: ${bgClass};">
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.nom_complet || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.numero_identification || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.nom_mari_decede || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.telephone || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.ville || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.adresse_residence || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.type_logement || '-'}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${v.soutien_social_direct ? i18n.t('yes') : i18n.t('no')}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${v.nombre_enfants_orphelins || 0}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center; font-weight: bold; color: #2563eb;">${v.note}</td>
                    <td style="border: 1px solid #e5e7eb; padding: 8px;">${utils.formatCurrency(v.revenu_mensuel)}</td>
                </tr>
            `;
        });

        htmlTable += `
                    </tbody>
                </table>
            </div>
        `;

        await exportUtils.exportToPdf(htmlTable, 'liste_veuves', { orientation: 'landscape' });

    } catch (e) {
        console.error("Erreur PDF:", e);
        utils.showNotification("Erreur lors de la génération du PDF", "error");
    } finally {
        utils.hideLoader();
    }
}

function exportVeuvesExcel() {
    try {
        const headers = [
            '#',
            i18n.t('full_name') || 'Nom',
            i18n.t('cin_label') || 'CIN',
            i18n.t('husband') || 'Mari',
            i18n.t('phone') || 'Téléphone',
            i18n.t('city') || 'Ville',
            i18n.t('address') || 'Adresse',
            i18n.t('housing') || 'Logement',
            i18n.t('support') || 'Soutien',
            i18n.t('orphans_count') || 'Orphelins',
            i18n.t('note_priority') || 'Note',
            i18n.t('income_column') || 'Revenu'
        ];

        const rows = currentVeuves.map((v, index) => [
            index + 1,
            v.nom_complet,
            v.numero_identification || '-',
            v.nom_mari_decede || '-',
            v.telephone || '-',
            v.ville || '-',
            v.adresse_residence || '-',
            v.type_logement || '-',
            v.soutien_social_direct ? (i18n.t('yes') || 'Oui') : (i18n.t('no') || 'Non'),
            v.nombre_enfants_orphelins || 0,
            v.note,
            `${v.revenu_mensuel || 0} DH`
        ]);

        const data = [headers, ...rows];
        exportUtils.exportToExcel(data, 'liste_veuves', 'Veuves');
    } catch (e) {
        console.error('Excel export error:', e);
        utils.showNotification('Erreur export Excel', 'error');
    }
}

async function exportVeuvesWord() {
    try {
        const headers = [
            '#',
            i18n.t('full_name') || 'Nom',
            i18n.t('cin_label') || 'CIN',
            i18n.t('husband') || 'Mari',
            i18n.t('phone') || 'Téléphone',
            i18n.t('city') || 'Ville',
            i18n.t('address') || 'Adresse',
            i18n.t('housing') || 'Logement',
            i18n.t('support') || 'Soutien',
            i18n.t('orphans_count') || 'Orphelins',
            i18n.t('note_priority') || 'Note',
            i18n.t('income_column') || 'Revenu'
        ];

        const rows = currentVeuves.map((v, index) => [
            String(index + 1),
            v.nom_complet,
            v.numero_identification || '-',
            v.nom_mari_decede || '-',
            v.telephone || '-',
            v.ville || '-',
            v.adresse_residence || '-',
            v.type_logement || '-',
            v.soutien_social_direct ? (i18n.t('yes') || 'Oui') : (i18n.t('no') || 'Non'),
            String(v.nombre_enfants_orphelins || 0),
            String(v.note),
            `${v.revenu_mensuel || 0} DH`
        ]);

        const data = [headers, ...rows];
        const title = i18n.t('widows_list_pdf_title') || 'Liste des Veuves';
        await exportUtils.exportToWord(data, 'liste_veuves', title);
    } catch (e) {
        console.error('Word export error:', e);
        utils.showNotification('Erreur export Word', 'error');
    }
}

// Export des fonctions
window.veuvesModule = {
    loadVeuves,
    displayVeuves,
    viewVeuve,
    editVeuve,
    deleteVeuve,
    loadVillesFilter,
    exportVeuvesPDF,
    currentFilters
};
