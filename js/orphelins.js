/**
 * Logic for managing orphans (Orphelins)
 */

let currentOrphelins = [];
let orphanPagination = null;
let orphanFilters = {
    search: '',
    ville: '',
    scolarite: '',
    ageMin: '',
    ageMax: ''
};

const orphelinsModule = {
    currentData: [],
    currentFilters: orphanFilters,

    async init() {
        await auth.protectPage();
        await i18n.init();
        await layout.initLayout('orphelins.html');
        await auth.checkPagePermission(['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre']);

        // Hide add button if not allowed to write
        const canWrite = await auth.canWrite();
        const addButton = document.querySelector('button[onclick*="orphelin-form.html"]');
        if (addButton && !canWrite) {
            addButton.classList.add('hidden');
        }

        this.loadOrphelins();
        this.loadVilles();

        // Récupérer la barre de recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', utils.debounce(() => {
                this.handleSearch(searchInput.value);
            }, 500));
        }
    },

    handleSearch(val) {
        this.currentFilters.search = val;
        this.loadOrphelins();
    },

    async loadVilles() {
        try {
            const { data } = await supabase.from('orphelins').select('ville');
            if (data) {
                const villes = [...new Set(data.map(o => o.ville).filter(Boolean))];
                const select = document.getElementById('villeFilter');
                if (select) {
                    // Keep first option
                    select.innerHTML = '<option value="" data-i18n="all_cities">Toutes les villes</option>';
                    villes.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v;
                        opt.textContent = v;
                        select.appendChild(opt);
                    });
                    if (window.i18n) i18n.translatePage();
                }
            }
        } catch (e) {
            console.error('Error loading cities:', e);
        }
    },

    async loadOrphelins() {
        utils.showLoader();
        try {
            let query = supabase.from('orphelins').select('*, veuves(nom_complet)', { count: 'exact' });

            if (this.currentFilters.search) {
                query = query.or(`nom_complet.ilike.%${this.currentFilters.search}%`);
            }
            if (this.currentFilters.ville) query = query.eq('ville', this.currentFilters.ville);
            if (this.currentFilters.scolarite) query = query.eq('niveau_scolaire', this.currentFilters.scolarite);

            const { data, error, count } = await query;
            if (error) throw error;

            // Age filtering (client-side if age field is not perfectly calculated in DB)
            let filteredData = data || [];
            if (this.currentFilters.ageMin || this.currentFilters.ageMax) {
                filteredData = filteredData.filter(o => {
                    const age = o.age || utils.calculateAge(o.date_naissance);
                    const min = this.currentFilters.ageMin ? parseInt(this.currentFilters.ageMin) : 0;
                    const max = this.currentFilters.ageMax ? parseInt(this.currentFilters.ageMax) : 999;
                    return age >= min && age <= max;
                });
            }

            this.currentData = filteredData;

            // Re-calculate count after age filter if needed, 
            // but for pagination we usually want the DB count if we don't filter age in DB.
            // Simplified: use filteredData length for display.

            this.renderTable();
        } catch (e) {
            console.error('Error loading orphans:', e);
            utils.showNotification('Erreur chargement', 'error');
        } finally {
            utils.hideLoader();
        }
    },

    async renderTable() {
        const tbody = document.getElementById('orphelinsTableBody');
        if (!tbody) return;

        if (this.currentData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500" data-i18n="no_orphans_found">Aucun orphelin trouvé</td></tr>`;
            if (window.i18n) i18n.translatePage();
            return;
        }

        const canWrite = await auth.canWrite();

        tbody.innerHTML = this.currentData.map(o => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">${o.nom_complet}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${o.age || utils.calculateAge(o.date_naissance)} ans</td>
                <td class="px-6 py-4 text-sm text-gray-500">${o.sexe}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">${o.niveau_scolaire || '-'}</span>
                </td>
                <td class="px-6 py-4 text-sm">
                    <a href="veuve-detail.html?id=${o.id_mere}" class="text-blue-600 hover:underline">
                        ${o.veuves?.nom_complet || 'Voir Mère'}
                    </a>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${o.ville || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${o.annee_scolaire || '-'}</td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="orphelinsModule.viewOrphelin('${o.id}')" class="text-gray-400 hover:text-blue-600" title="${i18n.t('view')}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>
                        ${canWrite ? `
                        <button onclick="orphelinsModule.editOrphelin('${o.id}')" class="text-gray-400 hover:text-green-600" title="${i18n.t('edit')}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button onclick="orphelinsModule.deleteOrphelin('${o.id}', '${o.nom_complet}')" class="text-gray-400 hover:text-red-600" title="${i18n.t('delete')}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    viewOrphelin(id) {
        window.location.href = `orphelin-detail.html?id=${id}`;
    },

    editOrphelin(id) {
        window.location.href = `orphelin-form.html?id=${id}`;
    },

    async deleteOrphelin(id, nom) {
        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }
        const result = await Swal.fire({
            title: i18n.t('delete_confirmation') || 'Confirmer la suppression',
            text: `${i18n.t('delete_orphan_warning') || 'Voulez-vous supprimer le dossier de'} "${nom}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: i18n.t('delete') || 'Supprimer',
            cancelButtonText: i18n.t('cancel') || 'Annuler'
        });

        if (result.isConfirmed) {
            utils.showLoader();
            try {
                const { error } = await supabase.from('orphelins').delete().eq('id', id);
                if (error) throw error;
                utils.showNotification('Orphelin supprimé avec succès', 'success');
                this.loadOrphelins();
            } catch (e) {
                console.error(e);
                utils.showNotification('Erreur de suppression', 'error');
            } finally {
                utils.hideLoader();
            }
        }
    },

    async exportOrphelinsPDF() {
        if (!this.currentData || this.currentData.length === 0) {
            utils.showNotification(i18n.t('no_data_export'), 'warning');
            return;
        }

        const format = await exportUtils.promptExportFormat();
        if (!format) return;

        if (format === 'excel') return this.exportOrphelinsExcel();
        if (format === 'word') return this.exportOrphelinsWord();

        try {
            utils.showLoader();

            const title = i18n.t('orphans_list_pdf_title') || 'Liste des Orphelins';
            const date = new Date().toLocaleDateString();
            const isArabic = i18n.currentLang === 'ar';
            const align = isArabic ? 'right' : 'left';

            const sortedData = [...this.currentData].sort((a, b) => {
                const nameA = a.veuves?.nom_complet || '';
                const nameB = b.veuves?.nom_complet || '';
                return nameA.localeCompare(nameB);
            });

            // HTML Table Construction
            let htmlTable = `
                <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: sans-serif; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="color: #10b981; font-size: 24px; margin-bottom: 5px;">${title}</h1>
                        <p style="color: #666;">${i18n.t('generated_on')}: ${date}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background-color: #d1fae5;">
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: ${align};">${i18n.t('city')}</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">#</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: ${align};">${i18n.t('mother_widow')}</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: ${align};">${i18n.t('full_name')}</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${i18n.t('gender')}</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${i18n.t('age_column')}</th>
                                <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${i18n.t('level')}</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedData.forEach((o, index) => {
                const bgClass = index % 2 === 0 ? '#fff' : '#f9fafb';
                htmlTable += `
                    <tr style="background-color: ${bgClass};">
                        <td style="border: 1px solid #e5e7eb; padding: 6px;">${o.ville || ''}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${index + 1}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px;">${o.veuves?.nom_complet || '-'}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px;">${o.nom_complet || ''}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${o.sexe || '-'}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${o.age || utils.calculateAge(o.date_naissance)}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${o.niveau_scolaire || '-'}</td>
                    </tr>
                `;
            });

            htmlTable += `
                        </tbody>
                    </table>
                </div>
            `;

            await exportUtils.exportToPdf(htmlTable, 'liste_orphelins', { orientation: 'landscape' });

        } catch (e) {
            console.error("Erreur PDF:", e);
            utils.showNotification("Erreur lors de la génération du PDF", "error");
        } finally {
            utils.hideLoader();
        }
    },

    exportOrphelinsExcel() {
        try {
            const headers = [
                '#',
                i18n.t('full_name') || 'Nom complet',
                i18n.t('mother_widow') || 'Mère',
                i18n.t('age_column') || 'Âge',
                i18n.t('sex_column') || 'Sexe',
                i18n.t('level') || 'Niveau',
                i18n.t('city') || 'Ville'
            ];

            const rows = this.currentData.map((o, index) => [
                index + 1,
                o.nom_complet,
                o.veuves?.nom_complet || '-',
                o.age || utils.calculateAge(o.date_naissance),
                o.sexe || '-',
                o.niveau_scolaire || '-',
                o.ville || '-'
            ]);

            const data = [headers, ...rows];
            exportUtils.exportToExcel(data, 'liste_orphelins', 'Orphelins');
        } catch (e) {
            console.error('Excel export error:', e);
            utils.showNotification('Erreur export Excel', 'error');
        }
    },

    async exportOrphelinsWord() {
        try {
            const headers = [
                '#',
                i18n.t('full_name') || 'Nom complet',
                i18n.t('mother_widow') || 'Mère',
                i18n.t('age_column') || 'Âge',
                i18n.t('sex_column') || 'Sexe',
                i18n.t('level') || 'Niveau',
                i18n.t('city') || 'Ville'
            ];

            const rows = this.currentData.map((o, index) => [
                String(index + 1),
                o.nom_complet,
                o.veuves?.nom_complet || '-',
                String(o.age || utils.calculateAge(o.date_naissance)),
                o.sexe || '-',
                o.niveau_scolaire || '-',
                o.ville || '-'
            ]);

            const data = [headers, ...rows];
            const title = i18n.t('orphans_list_pdf_title') || 'Liste des Orphelins';
            await exportUtils.exportToWord(data, 'liste_orphelins', title);
        } catch (e) {
            console.error('Word export error:', e);
            utils.showNotification('Erreur export Word', 'error');
        }
    },


};

window.orphelinsModule = orphelinsModule;
