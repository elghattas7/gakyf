/**
 * Logic for orphan details page
 */

let orphanId = null;

const orphelinDetailModule = {
    async init() {
        await auth.protectPage();
        await layout.initLayout('orphelins.html');

        const urlParams = new URLSearchParams(window.location.search);
        orphanId = urlParams.get('id');

        if (!orphanId) {
            utils.showNotification('ID manquant', 'error');
            setTimeout(() => window.location.href = 'orphelins.html', 1500);
            return;
        }

        document.getElementById('editBtn').onclick = () => window.location.href = `orphelin-form.html?id=${orphanId}`;

        this.loadDetails();
        this.loadAides();
    },

    async loadDetails() {
        try {
            const { data, error } = await supabase
                .from('orphelins')
                .select('*, veuves(id, nom_complet, telephone, ville)')
                .eq('id', orphanId)
                .single();

            if (error) throw error;

            document.getElementById('orphanName').textContent = data.nom_complet;

            // Identity info
            document.getElementById('identityInfo').innerHTML = `
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="full_name">${i18n.t('full_name')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.nom_complet}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="gender">${i18n.t('gender')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.sexe || '-'}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="birth_date">${i18n.t('birth_date')}</span>
                    <p class="text-lg font-medium text-gray-900">${utils.formatDate(data.date_naissance)}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="age_column">${i18n.t('age_column')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.age || utils.calculateAge(data.date_naissance)} ${i18n.t('years_old')}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="city">${i18n.t('city')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.ville || '-'}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="registration_date">${i18n.t('registration_date') || 'Date d\'inscription'}</span>
                    <p class="text-lg font-medium text-gray-900">${utils.formatDate(data.date_inscription)}</p>
                </div>
            `;

            // Education info
            document.getElementById('educationInfo').innerHTML = `
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="level">${i18n.t('level')}</span>
                    <p class="text-lg font-medium text-gray-900">${i18n.t(data.niveau_scolaire) || data.niveau_scolaire || '-'}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="school_year">${i18n.t('school_year')}</span>
                    <p class="text-lg font-medium text-gray-900">${i18n.t(data.annee_scolaire) || data.annee_scolaire || '-'}</p>
                </div>
            `;

            // Health info
            document.getElementById('healthInfo').innerHTML = `
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="chronic_disease">${i18n.t('chronic_disease')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.maladie_chronique ? `<span class="text-red-600">${data.type_maladie || 'Oui'}</span>` : i18n.t('no')}</p>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase font-semibold" data-i18n="disability">${i18n.t('disability')}</span>
                    <p class="text-lg font-medium text-gray-900">${data.handicap ? `<span class="text-red-600">${data.type_handicap || 'Oui'}</span>` : i18n.t('no')}</p>
                </div>
            `;

            // Family link
            if (data.veuves) {
                document.getElementById('familyLink').innerHTML = `
                    <div class="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <p class="text-xs text-indigo-600 font-bold uppercase mb-1" data-i18n="mother_widow">${i18n.t('mother_widow')}</p>
                        <p class="font-bold text-gray-900">${data.veuves.nom_complet}</p>
                        <p class="text-sm text-gray-600 mb-2">${data.veuves.telephone || '-'}</p>
                        <a href="veuve-detail.html?id=${data.veuves.id}" class="text-indigo-600 text-sm font-semibold hover:underline" data-i18n="view_profile">${i18n.t('view_profile') || 'Voir le profil'} →</a>
                    </div>
                `;
            } else {
                document.getElementById('familyLink').innerHTML = `<p class="text-gray-500 text-sm">Aucun lien parent-enfant.</p>`;
            }

        } catch (e) {
            console.error(e);
            utils.showNotification('Erreur de chargement', 'error');
        }
    },

    async loadAides() {
        try {
            const { data, error } = await supabase
                .from('aides')
                .select('*, programmes_aide(nom_programme)')
                .eq('id_orphelin', orphanId)
                .order('date_aide', { ascending: false });

            if (error) throw error;

            const container = document.getElementById('aidesList');
            if (!data || data.length === 0) {
                container.innerHTML = `<p class="text-gray-500 text-sm" data-i18n="no_aid_received">${i18n.t('no_aid_received')}</p>`;
                return;
            }

            container.innerHTML = data.map(aide => `
                <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p class="font-bold text-gray-800 text-sm">${aide.programmes_aide?.nom_programme || 'Aide'}</p>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-indigo-600 font-bold">${utils.formatCurrency(aide.montant, 'EUR')}</span>
                        <span class="text-xs text-gray-500">${utils.formatDate(aide.date_aide)}</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error(e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    orphelinDetailModule.init();
});
