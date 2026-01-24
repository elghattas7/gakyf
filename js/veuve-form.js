/**
 * Logic for managing widow form (add/edit)
 */

let veuveId = null;

const veuveFormModule = {
    async init() {
        await auth.protectPage();

        if (!await auth.canWrite()) {
            utils.showNotification('Accès refusé : permissions insuffisantes', 'error');
            setTimeout(() => window.location.href = 'veuves.html', 1500);
            return;
        }

        await layout.initLayout('veuves.html');

        const urlParams = new URLSearchParams(window.location.search);
        veuveId = urlParams.get('id');

        if (veuveId) {
            const titleKey = 'edit_widow';
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.textContent = i18n.t(titleKey);
                pageTitle.setAttribute('data-i18n', titleKey);
            }
            await this.loadVeuve(veuveId);
        }

        this.setupEventListeners();
    },

    setupEventListeners() {
        const form = document.getElementById('veuveForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    },

    async loadVeuve(id) {
        utils.showLoader();
        try {
            const { data, error } = await supabase.from('veuves').select('*').eq('id', id).single();
            if (error) throw error;

            // Store original data for diffing on submit
            this.originalData = data;

            const form = document.getElementById('veuveForm');

            // Standard fill
            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && input.type !== 'checkbox' && key !== 'pension_retraite' && key !== 'soutien_social_direct') {
                    if (input.type === 'date') input.value = utils.formatDateForInput(data[key]);
                    else input.value = data[key];
                }
            });

            // Manual mapping for custom checkboxes
            if (data.pension_retraite) {
                const checkPension = document.getElementById('checkPension');
                if (checkPension) checkPension.checked = true;
                this.toggleField('pensionAmount', true);
                const pensionInput = form.querySelector('[name="montant_pension_retraite"]');
                if (pensionInput) pensionInput.value = data.montant_pension_retraite;
            }

            if (data.soutien_social_direct) {
                const checkSoutien = document.getElementById('checkSoutien');
                if (checkSoutien) checkSoutien.checked = true;
                this.toggleField('soutienAmount', true);
                const soutienInput = form.querySelector('[name="montant_soutien_social"]');
                if (soutienInput) soutienInput.value = data.montant_soutien_social;
            }

            // City handling
            if (data.ville) {
                if (['Bouarfa', 'Tendrara', 'Maatarka'].includes(data.ville)) {
                    const villeSelect = form.querySelector('[name="ville_select"]');
                    if (villeSelect) villeSelect.value = data.ville;
                } else {
                    const villeSelect = form.querySelector('[name="ville_select"]');
                    if (villeSelect) villeSelect.value = 'Autre';
                    this.toggleAutreVille('Autre');
                    const villeText = form.querySelector('[name="ville_text"]');
                    if (villeText) villeText.value = data.ville;
                }
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

        try {
            const formData = new FormData(e.target);
            const data = {};

            // Manual mapping for booleans via visual checkboxes
            const checkPension = document.getElementById('checkPension');
            data.pension_retraite = checkPension ? checkPension.checked : false;

            const checkSoutien = document.getElementById('checkSoutien');
            data.soutien_social_direct = checkSoutien ? checkSoutien.checked : false;

            // City handling
            const villeSelect = formData.get('ville_select');
            const villeText = formData.get('ville_text');
            data.ville = (villeSelect === 'Autre') ? villeText : villeSelect;

            for (let [key, value] of formData.entries()) {
                if (key.endsWith('_check')) continue; // Skip helper checkboxes
                if (key === 'ville_select' || key === 'ville_text') continue; // Skip city helpers
                
                // Exclusions pour les champs booléens gérés manuellement ci-dessus
                if (key === 'pension_retraite') continue;
                if (key === 'soutien_social_direct') continue;

                if (value === '') {
                    data[key] = null;
                } else if (key.includes('nombre_') || key.includes('montant_') || key === 'revenu_mensuel') {
                    data[key] = parseFloat(value) || 0;
                } else {
                    data[key] = value;
                }
            }

            if (veuveId) {
                // UPDATE: Only send changed fields
                const changes = {};
                let hasChanges = false;

                Object.keys(data).forEach(key => {
                    // Compare new value with original value (handle type differences lightly)
                    // Use loose equality or strict? Supabase returns specific types. Form ensures types.
                    // Careful with null vs empty string.
                    let originalValue = this.originalData ? this.originalData[key] : undefined;
                    let newValue = data[key];

                    // Normalize null/undefined
                    if (originalValue === undefined || originalValue === null) originalValue = '';
                    if (newValue === undefined || newValue === null) newValue = '';

                    if (originalValue != newValue) {
                        changes[key] = data[key]; // Send the actual typed value
                        hasChanges = true;
                    }
                });

                if (!hasChanges) {
                    utils.showNotification('Aucune modification détectée', 'info');
                    utils.hideLoader();
                    return;
                }

                // Perform UPDATE with only changes
                const result = await supabase.from('veuves').update(changes).eq('id', veuveId).select();

                if (result.error) {
                    console.error('❌ Supabase Error:', result.error);
                    utils.showNotification(`Erreur: ${result.error.message}`, 'error');
                    throw result.error;
                }
            } else {
                // INSERT: Send all data
                const result = await supabase.from('veuves').insert([data]).select();

                if (result.error) {
                    console.error('❌ Supabase Error:', result.error);
                    utils.showNotification(`Erreur: ${result.error.message}`, 'error');
                    throw result.error;
                }
            }

            utils.showNotification('Dossier enregistré avec succès', 'success');
            setTimeout(() => window.location.href = 'veuves.html', 1000);

        } catch (error) {
            console.error('❌ Error:', error);
            if (!error.code) { // Si pas déjà affiché
                utils.showNotification('Erreur enregistrement', 'error');
            }
        } finally {
            utils.hideLoader();
        }
    },

    toggleField(id, show) {
        const el = document.getElementById(id);
        if (!el) return;
        if (show) {
            el.classList.remove('hidden');
            setTimeout(() => el.classList.add('opacity-100'), 10);
        } else {
            el.classList.add('hidden');
            el.classList.remove('opacity-100');
        }
    },

    toggleAutreVille(val) {
        const el = document.getElementById('autreVilleDiv');
        if (!el) return;
        if (val === 'Autre') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
};

// Expose helper functions globally for HTML event handlers
window.toggleField = (id, show) => veuveFormModule.toggleField(id, show);
window.toggleAutreVille = (val) => veuveFormModule.toggleAutreVille(val);

document.addEventListener('DOMContentLoaded', () => {
    veuveFormModule.init();
});
