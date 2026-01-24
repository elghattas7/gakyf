/**
 * Logic for managing orphan form (add/edit)
 */

let orphelinId = null;

const anneesParNiveau = {
    "préscolaire": ["petite_section", "moyenne_section", "grande_section"],
    "primaire": ["year_1", "year_2", "year_3", "year_4", "year_5", "year_6"],
    "collège": ["college_1", "college_2", "college_3"],
    "lycée": ["tronc_commun", "bac_1", "bac_2"],
    "autre": ["-"],
    "non scolarisé": ["-"]
};

const orphelinFormModule = {
    async init() {
        await auth.protectPage();

        if (!await auth.canWrite()) {
            utils.showNotification('Accès refusé : permissions insuffisantes', 'error');
            setTimeout(() => window.location.href = 'orphelins.html', 1500);
            return;
        }

        await layout.initLayout('orphelins.html');

        // Charger la liste des veuves pour le select
        await this.loadVeuves();

        const urlParams = new URLSearchParams(window.location.search);
        orphelinId = urlParams.get('id');

        if (orphelinId) {
            document.getElementById('pageTitle').textContent = 'Modifier le Dossier';
            await this.loadOrphelin(orphelinId);
        }

        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('orphelinForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Exposed global functions for onclick handlers in HTML need to be attached to window or handled here
        // Ideally we replace onclick attributes, but for now we might expose helpers globally
        window.toggleField = this.toggleField;
        window.toggleAutreVille = this.toggleAutreVille;
        window.updateAnneeOptions = this.updateAnneeOptions;

        // However, since updateAnneeOptions is called by onchange in HTML, we need to make sure 'this' context is correct or just expose it.
    },

    async loadVeuves() {
        const select = document.getElementById('selectMere');
        try {
            const { data } = await supabase.from('veuves').select('id, nom_complet').order('nom_complet');
            select.innerHTML = `<option value="" data-i18n="select">${i18n.t('select')}</option>`;
            if (data) {
                data.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v.id;
                    opt.textContent = v.nom_complet;
                    select.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadOrphelin(id) {
        utils.showLoader();
        try {
            const { data, error } = await supabase.from('orphelins').select('*').eq('id', id).single();
            if (error) throw error;

            // Store original data for diffing
            this.originalData = data;

            const form = document.getElementById('orphelinForm');

            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && input.type !== 'checkbox' && !key.includes('check')) {
                    if (input.type === 'date') input.value = utils.formatDateForInput(data[key]);
                    else input.value = data[key];
                }
            });

            if (data.maladie_chronique) {
                document.getElementById('checkMaladie').checked = true;
                this.toggleField('maladieDetails', true);
                form.querySelector('[name="type_maladie"]').value = data.type_maladie;
            }

            if (data.handicap) {
                document.getElementById('checkHandicap').checked = true;
                this.toggleField('handicapDetails', true);
                form.querySelector('[name="type_handicap"]').value = data.type_handicap;
            }

            if (data.ville) {
                if (['Bouarfa', 'Tendrara', 'Maatarka'].includes(data.ville)) {
                    form.querySelector('[name="ville_select"]').value = data.ville;
                } else {
                    form.querySelector('[name="ville_select"]').value = 'Autre';
                    this.toggleAutreVille('Autre');
                    form.querySelector('[name="ville_text"]').value = data.ville;
                }
            }

            // Trigger update for Annee Options if level is set
            // We need to wait for the DOM to update with selected value? 
            // The value is set above.
            this.updateAnneeOptions();
            // Then set the year value
            if (data.annee_scolaire) {
                const anneeSelect = document.getElementById('selectAnneeScolaire');
                // Give it a moment or force update? updateAnneeOptions is synchronous.
                setTimeout(() => {
                    anneeSelect.value = data.annee_scolaire;
                }, 0);
            }

        } catch (e) {
            console.error(e);
            utils.showNotification('Erreur chargement', 'error');
        } finally {
            utils.hideLoader();
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();

        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }

        utils.showLoader();

        // Mapping checkboxes
        const formData = new FormData(e.target);
        const data = {};
        data.maladie_chronique = document.getElementById('checkMaladie').checked;
        data.handicap = document.getElementById('checkHandicap').checked;

        for (let [key, value] of formData.entries()) {
            if (key.endsWith('_check')) continue;
            if (key === 'ville_select' || key === 'ville_text') continue;

            data[key] = value;
        }

        const villeSelect = formData.get('ville_select');
        const villeText = formData.get('ville_text');
        data.ville = (villeSelect === 'Autre') ? villeText : villeSelect;

        // Insert/update
        try {
            if (orphelinId) {
                // UPDATE: Only send changed fields
                const changes = {};
                let hasChanges = false;

                Object.keys(data).forEach(key => {
                    let originalValue = this.originalData ? this.originalData[key] : undefined;
                    let newValue = data[key];

                    if (originalValue === undefined || originalValue === null) originalValue = '';
                    if (newValue === undefined || newValue === null) newValue = '';

                    if (originalValue != newValue) {
                        changes[key] = data[key];
                        hasChanges = true;
                    }
                });

                if (!hasChanges) {
                    utils.showNotification('Aucune modification détectée', 'info');
                    utils.hideLoader();
                    return;
                }

                const result = await supabase.from('orphelins').update(changes).eq('id', orphelinId).select();

                if (result.error) {
                    console.error('❌ Supabase Error:', result.error);
                    utils.showNotification(`Erreur: ${result.error.message}`, 'error');
                    throw result.error;
                }
            } else {
                // INSERT
                const result = await supabase.from('orphelins').insert([data]).select();

                if (result.error) {
                    console.error('❌ Supabase Error:', result.error);
                    utils.showNotification(`Erreur: ${result.error.message}`, 'error');
                    throw result.error;
                }
            }

            utils.showNotification('Dossier orphelin enregistré', 'success');
            setTimeout(() => window.location.href = 'orphelins.html', 1000);
        } catch (e) {
            console.error('❌ Error:', e);
            if (!e.code) { // Si pas déjà affiché
                utils.showNotification('Erreur lors de l\'enregistrement', 'error');
            }
        }
        finally { utils.hideLoader(); }
    },

    toggleField(id, show) {
        const el = document.getElementById(id);
        if (show) { el.classList.remove('hidden'); } else { el.classList.add('hidden'); }
    },

    toggleAutreVille(val) {
        const el = document.getElementById('autreVilleDiv');
        if (val === 'Autre') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    },

    updateAnneeOptions() {
        const niveauSelect = document.getElementById('selectNiveauScolaire');
        const anneeSelect = document.getElementById('selectAnneeScolaire');
        const divAutre = document.getElementById('divAutreNiveau');
        const divAnnee = document.getElementById('divAnneeScolaire');
        const niveau = niveauSelect.value;
        const i18n = window.i18n; // Ensure i18n is available

        // Toggle Autre Input
        if (niveau === 'autre') {
            divAutre.classList.remove('hidden');
        } else {
            divAutre.classList.add('hidden');
        }

        // Toggle Annee Scolaire visibility
        const levelsWithAnnee = ["primaire", "collège", "lycée"];
        if (levelsWithAnnee.includes(niveau)) {
            divAnnee.classList.remove('hidden');
        } else {
            divAnnee.classList.add('hidden');
        }

        anneeSelect.innerHTML = `<option value="" data-i18n="select">${i18n ? i18n.t('select') : 'Select'}</option>`;

        if (niveau && anneesParNiveau[niveau]) {
            anneesParNiveau[niveau].forEach(key => {
                const option = document.createElement('option');
                option.value = key === '-' ? '' : key;
                option.textContent = key === '-' ? '-' : (i18n ? i18n.t(key) : key);
                anneeSelect.appendChild(option);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    orphelinFormModule.init();
});
