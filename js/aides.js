/**
 * Logic for managing aid programs and attributions (Aides)
 */

const aidesModule = {
    allAttributions: [],

    async init() {
        await auth.protectPage();
        await auth.checkPagePermission(['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre']);
        await layout.initLayout('aides.html');

        const canWrite = await auth.canWrite();
        const addButtons = document.querySelectorAll('button[onclick*="aide-form.html"], button[onclick*="addNewProgram()"]');
        addButtons.forEach(btn => {
            if (!canWrite) btn.classList.add('hidden');
        });

        this.loadProgrammes();
        this.loadAttributions();
        this.loadStats();
    },

    async loadProgrammes() {
        try {
            const { data, error } = await supabase.from('programmes_aide')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.renderProgrammes(data);
        } catch (e) {
            console.error(e);
        }
    },

    async renderProgrammes(programmes) {
        const container = document.getElementById('programmesContainer');
        if (!container) return;

        if (programmes.length === 0) {
            container.innerHTML = `<div class="col-span-4 text-center text-gray-500" data-i18n="no_active_programs">${i18n.t('no_active_programs') || 'Aucun programme actif'}</div>`;
            return;
        }

        const canWrite = await auth.canWrite();

        container.innerHTML = programmes.map(p => `
            <div class="card p-5 hover:shadow-lg cursor-pointer group hover:-translate-y-1 transition-all relative">
                <div class="flex justify-between items-start mb-3">
                    <div class="bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <span class="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">${utils.formatCurrency(p.montant_standard)}</span>
                </div>
                <h4 class="font-bold text-gray-900 mb-1">${p.nom_programme}</h4>
                <p class="text-sm text-gray-500 line-clamp-2">${p.description || '-'}</p>
                ${canWrite ? `
                <div class="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="event.stopPropagation(); aidesModule.deleteProgramme('${p.id}', '${p.nom_programme}')" class="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
                ` : ''}
            </div>
        `).join('');
    },

    async loadAttributions() {
        utils.showLoader();
        try {
            const { data, error } = await supabase
                .from('aides')
                .select('*, veuves(nom_complet), orphelins(nom_complet), programmes_aide(nom_programme)')
                .order('date_aide', { ascending: false });

            if (error) throw error;
            this.allAttributions = data || [];
            this.renderAttributions(this.allAttributions);
        } catch (e) {
            console.error(e);
            utils.showNotification('Erreur chargement attributions', 'error');
        } finally {
            utils.hideLoader();
        }
    },

    async renderAttributions(data) {
        const tbody = document.getElementById('attributionsTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500" data-i18n="no_recent_activity">${i18n.t('no_recent_activity') || 'Aucune activité récente'}</td></tr>`;
            return;
        }

        const canWrite = await auth.canWrite();

        // Only show first 10 on dashboard view or full list? 
        // aides.html typically shows a limited history or has pagination.
        const displayData = data.slice(0, 50);

        tbody.innerHTML = displayData.map(a => {
            const beneficiaire = a.veuves?.nom_complet || a.orphelins?.nom_complet || '-';
            const type = a.id_veuve ? 'Veuve' : 'Orphelin';

            return `
                <tr class="hover:bg-gray-50">
                    <td class="font-medium text-gray-900">${a.nature_aide || a.programmes_aide?.nom_programme || 'Inconnu'}</td>
                    <td>
                        ${a.veuves ? `<div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">V</span> ${a.veuves.nom_complet}</div>` : ''}
                        ${a.orphelins ? `<div class="flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">O</span> ${a.orphelins.nom_complet}</div>` : ''}
                    </td>
                    <td class="text-xs uppercase tracking-wide text-gray-500">${i18n.t(a.id_veuve ? 'widow' : 'orphan')}</td>
                    <td class="font-semibold text-gray-900">${utils.formatCurrency(a.montant, 'EUR')}</td>
                    <td class="text-gray-500">${utils.formatDate(a.date_aide)}</td>
                    <td class="text-right">
                        ${canWrite ? `
                        <button onclick="aidesModule.deleteAttribution('${a.id}')" class="text-gray-400 hover:text-red-500 transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    async loadStats() {
        try {
            const currentYear = new Date().getFullYear();
            const { data, error } = await supabase.from('aides').select('*');
            if (error) throw error;

            const allAttributions = data || [];

            // 1. Total Attribué (Année) EUR
            const totalYearEUR = allAttributions
                .filter(a => {
                    const date = a.date_aide || a.created_at;
                    return date && new Date(date).getFullYear() === currentYear;
                })
                .reduce((sum, a) => sum + utils.convertAmount(a.montant, 'EUR', 'EUR'), 0);

            const totalYearEl = document.getElementById('totalYearAides');
            if (totalYearEl) totalYearEl.textContent = utils.formatCurrency(totalYearEUR, 'EUR');

            // 2. Bénéficiaires Actifs
            const uniqueBeneficiaries = new Set(
                allAttributions
                    .filter(a => (Number(a.montant) || 0) > 0)
                    .map(a => a.id_veuve || a.id_orphelin)
                    .filter(id => !!id)
            ).size;

            const activeBeneficiariesEl = document.getElementById('activeBeneficiaries');
            if (activeBeneficiariesEl) activeBeneficiariesEl.textContent = uniqueBeneficiaries;

            // 3. Dernière Aide
            if (allAttributions.length > 0) {
                const sorted = [...allAttributions].sort((a, b) => new Date(b.date_aide || b.created_at) - new Date(a.date_aide || a.created_at));
                const lastAid = sorted[0];

                const lastAidAmountEl = document.getElementById('lastAidAmount');
                if (lastAidAmountEl) lastAidAmountEl.textContent = utils.formatCurrency(lastAid.montant);

                const lastAidDateEl = document.getElementById('lastAidDate');
                if (lastAidDateEl) {
                    const date = lastAid.date_aide || lastAid.created_at;
                    lastAidDateEl.textContent = utils.formatDate(date);
                }
            }
        } catch (e) {
            console.error(e);
        }
    },

    async addNewProgram() {
        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }
        const { value: formValues } = await Swal.fire({
            title: i18n.t('new_program') || 'Nouveau Programme',
            html: `
                <div class="space-y-4">
                    <input id="swal-input1" class="swal2-input w-full" placeholder="${i18n.t('prog_nature') || 'Nature du programme'}">
                    <select id="swal-input2" class="swal2-input w-full">
                        <option value="financier">Financier</option>
                        <option value="materiel">Matériel</option>
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: i18n.t('save') || 'Enregistrer',
            cancelButtonText: i18n.t('cancel') || 'Annuler',
            preConfirm: () => {
                const nom = document.getElementById('swal-input1').value;
                const type = document.getElementById('swal-input2').value;
                if (!nom) {
                    Swal.showValidationMessage(i18n.t('name_required') || 'Nom requis');
                    return false;
                }
                return { nom_programme: nom, type_aide: type };
            }
        });

        if (formValues) {
            utils.showLoader();
            try {
                const { error } = await supabase.from('programmes_aide').insert([{
                    ...formValues,
                    statut: 'actif'
                }]);
                if (error) throw error;
                utils.showNotification('Programme ajouté', 'success');
                this.loadProgrammes();
            } catch (e) {
                console.error(e);
                utils.showNotification('Erreur de création', 'error');
            } finally {
                utils.hideLoader();
            }
        }
    },

    async deleteProgramme(id, nom) {
        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }
        const result = await Swal.fire({
            title: i18n.t('delete_confirmation'),
            text: `Voulez-vous supprimer le programme "${nom}" ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: i18n.t('delete'),
            cancelButtonText: i18n.t('cancel')
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from('programmes_aide').delete().eq('id', id);
                if (error) throw error;
                utils.showNotification('Programme supprimé', 'success');
                this.loadProgrammes();
            } catch (e) {
                console.error(e);
                utils.showNotification('Erreur suppression', 'error');
            }
        }
    },

    async deleteAttribution(id) {
        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }
        const result = await Swal.fire({
            title: i18n.t('delete_confirmation'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: i18n.t('delete'),
            cancelButtonText: i18n.t('cancel')
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from('aides').delete().eq('id', id);
                if (error) throw error;
                utils.showNotification('Attribution supprimée', 'success');
                this.loadAttributions();
                this.loadStats();
            } catch (e) {
                console.error(e);
                utils.showNotification('Erreur suppression', 'error');
            }
        }
    },

    async exportList() {
        if (this.allAttributions.length === 0) {
            utils.showNotification(i18n.t('no_data_export'), 'warning');
            return;
        }

        const format = await exportUtils.promptExportFormat();
        if (!format) return;

        if (format === 'excel') return this.exportExcel();
        if (format === 'word') return this.exportWord();
        if (format === 'pdf') return this.exportPDF();
    },

    exportExcel() {
        const rows = this.allAttributions.map((a, i) => [
            i + 1,
            utils.formatDate(a.date_aide),
            a.veuves?.nom_complet || a.orphelins?.nom_complet || '-',
            a.programmes_aide?.nom_programme || '-',
            a.montant,
            a.statut
        ]);
        exportUtils.exportToExcel([headers, ...rows], 'liste_attributions', 'Attributions');
    },

    async exportWord() {
        const rows = this.allAttributions.map((a, i) => [
            String(i + 1),
            utils.formatDate(a.date_aide),
            a.veuves?.nom_complet || a.orphelins?.nom_complet || '-',
            a.programmes_aide?.nom_programme || '-',
            utils.formatCurrency(a.montant)
        ]);
        await exportUtils.exportToWord([headers, ...rows], 'liste_attributions', 'Historique des Attributions');
    },

    async exportPDF() {
        try {
            utils.showLoader();
            const isArabic = i18n.currentLang === 'ar';
            const align = isArabic ? 'right' : 'left';
            const title = i18n.t('history_attributions') || 'Historique des Attributions';
            const dateStr = new Date().toLocaleDateString();

            const letterSpacing = isArabic ? 'letter-spacing: 0.5px;' : '';

            let htmlTable = `
                <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: sans-serif; padding: 20px; ${letterSpacing}">
                    <style>
                        table { border-collapse: collapse; width: 100%; }
                        th, td { padding: 8px; border: 1px solid #c7d2fe; text-align: ${align}; }
                    </style>
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4f46e5; font-size: 24px; margin-bottom: 5px;">${title}</h1>
                        <p style="color: #666;">${dateStr}</p>
                    </div>
                    <table style="width: 100%; font-size: 10px;">
                        <thead>
                            <tr style="background-color: #e0e7ff;">
                                <th style="width: 5%">#</th>
                                <th style="width: 25%">${i18n.t('prog_nature') || 'Nature'}</th>
                                <th style="width: 30%">${i18n.t('beneficiary') || 'Bénéficiaire'}</th>
                                <th style="width: 15%">${i18n.t('amount') || 'Montant'} (€)</th>
                                <th style="width: 25%">${i18n.t('date') || 'Date'}</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            this.allAttributions.forEach((a, index) => {
                const bg = index % 2 === 0 ? '#fff' : '#f5f7ff';
                const beneficiaire = a.veuves?.nom_complet || a.orphelins?.nom_complet || '-';
                const nature = a.nature_aide || a.programmes_aide?.nom_programme || '-';
                const montantEUR = utils.convertAmount(a.montant, 'EUR', 'EUR');

                htmlTable += `
                    <tr style="background-color: ${bg};">
                        <td>${index + 1}</td>
                        <td>${nature}</td>
                        <td>${beneficiaire}</td>
                        <td>${utils.formatCurrency(montantEUR, 'EUR')}</td>
                        <td>${utils.formatDate(a.date_aide)}</td>
                    </tr>
                `;
            });

            htmlTable += `</tbody></table></div>`;
            await exportUtils.exportToPdf(htmlTable, 'liste_attributions');
        } catch (e) {
            console.error("Erreur export PDF:", e);
            utils.showNotification("Erreur export PDF", "error");
        } finally {
            utils.hideLoader();
        }
    },

    // Form logic
    async loadBeneficiaries(type, selectId) {
        const table = type === 'veuve' ? 'veuves' : 'orphelins';
        const select = document.getElementById(selectId);
        if (!select) return;

        const loadingText = (window.i18n && window.i18n.t('loading')) || 'Chargement...';
        select.innerHTML = `<option value="">${loadingText}</option>`;

        try {
            const { data, error } = await supabase.from(table).select('id, nom_complet').order('nom_complet');

            if (error) {
                console.error('Data load error:', error);
                utils.showNotification('Erreur chargement: ' + error.message, 'error');
                select.innerHTML = '<option value="">Erreur</option>';
                return;
            }

            const placeholderKey = type === 'veuve' ? 'select_widow' : 'select_orphan';
            const placeholder = (window.i18n && window.i18n.t(placeholderKey)) || 'Sélectionner...';

            if (!data || data.length === 0) {
                // Determine user-friendly table name
                const tableName = type === 'veuve' ? 'Veuves' : 'Orphelins';
                utils.showNotification(`Aucun enregistrement trouvé dans "${tableName}"`, 'warning');
                select.innerHTML = `<option value="">(Aucun résultat)</option>`;
                return;
            }

            select.innerHTML = `<option value="">${placeholder}</option>`;
            data.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.nom_complet;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Critical error:', e);
            utils.showNotification('Erreur critique: ' + e.message, 'error');
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();

        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }

        utils.showLoader();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const type = data.beneficiary_type;
        const beneficiaryId = data.beneficiary_id || null;

        if (!beneficiaryId) {
            utils.showNotification('Veuillez sélectionner un bénéficiaire', 'warning');
            utils.hideLoader();
            return;
        }

        const finalData = {
            id_programme: null, // Legacy field or for future use
            nature_aide: data.nature_aide === 'Autre' ? data.autre_nature_aide : data.nature_aide,
            montant: parseFloat(data.montant) || 0,
            date_aide: data.date_attribution,
            commentaire: data.remarques,
            id_veuve: type === 'veuve' ? beneficiaryId : null,
            id_orphelin: type === 'orphelin' ? beneficiaryId : null
        };

        try {
            const { error } = await supabase.from('aides').insert([finalData]);
            if (error) throw error;
            utils.showNotification('Aide attribuée avec succès', 'success');
            setTimeout(() => window.location.href = 'aides.html', 1000);
        } catch (e) {
            console.error(e);
            utils.showNotification(`Erreur: ${e.message || e.details || 'Erreur inconnue'}`, 'error');
        } finally {
            utils.hideLoader();
        }
    },

    async toggleBeneficiaryType(type) {
        const label = document.getElementById('beneficiaryLabel');
        const labelKey = type === 'veuve' ? 'select_widow' : 'select_orphan';
        if (label) {
            label.textContent = i18n.t(labelKey);
            label.setAttribute('data-i18n', labelKey);
        }
        await this.loadBeneficiaries(type, 'beneficiarySelect');
    },

    toggleAutreAide(val) {
        const el = document.getElementById('autreAideDiv');
        if (!el) return;
        if (val === 'Autre') el.classList.remove('hidden');
        else el.classList.add('hidden');
    },

    async initForm() {
        await auth.protectPage();
        if (!await auth.canWrite()) {
            utils.showNotification('Accès refusé', 'error');
            setTimeout(() => window.location.href = 'aides.html', 1500);
            return;
        }
        await layout.initLayout('aides.html');

        // Date par défaut aujourd'hui
        const dateInput = document.querySelector('[name="date_attribution"]');
        if (dateInput) dateInput.valueAsDate = new Date();

        // Load default beneficiaries (veuve is checked by default)
        await this.loadBeneficiaries('veuve', 'beneficiarySelect');

        // Form submit listener
        const form = document.getElementById('aideForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }
};

window.aidesModule = aidesModule;
window.addNewProgram = () => aidesModule.addNewProgram();
window.toggleBeneficiaryType = (t) => aidesModule.toggleBeneficiaryType(t);
window.toggleAutreAide = (v) => aidesModule.toggleAutreAide(v);

// Auto-init based on page content
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('attributionsTableBody')) {
        aidesModule.init();
    } else if (document.getElementById('aideForm')) {
        aidesModule.initForm();
    }
});
