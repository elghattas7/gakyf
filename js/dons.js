/**
 * Logic for managing donations and donors (Dons)
 */

const donsModule = {
    allDons: [],

    async init() {
        await auth.protectPage();
        await auth.checkPagePermission(['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre']);
        await layout.initLayout('dons.html');

        // Hide add button if not allowed to write
        const canWrite = await auth.canWrite();
        const addButton = document.querySelector('button[onclick*="don-form.html"]');
        if (addButton && !canWrite) {
            addButton.classList.add('hidden');
        }

        await this.loadDons();

        // Récupérer la barre de recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', utils.debounce(() => {
                this.handleFilter();
            }, 500));
        }

        // Écouter les changements de langue pour rafraîchir les statistiques
        window.addEventListener('languageChanged', () => {
            this.renderStats();
            this.renderDons(this.allDons);
        });
    },

    async loadDons() {
        try {
            const { data, error } = await supabase.from('dons').select('*').order('created_at', { ascending: false });
            if (error) throw error;

            this.allDons = (data || []).map(d => {
                if (!d.annee_don && d.date_don) {
                    d.annee_don = new Date(d.date_don).getUTCFullYear();
                }
                return d;
            });

            this.renderStats();
            this.renderDons(this.allDons);
        } catch (e) {
            console.error('Error loading donations:', e);
            utils.showNotification('Erreur de chargement', 'error');
        }
    },

    renderStats() {
        try {
            if (!this.allDons || !Array.isArray(this.allDons)) return;
            const now = new Date();
            const currentYear = now.getFullYear();
            const lastYear = currentYear - 1;
            const currentMonth = now.getMonth();

            // 1. Total Year & comparison
            const totalYear = this.allDons
                .filter(d => parseInt(d.annee_don) === currentYear)
                .reduce((sum, d) => sum + utils.convertAmount(d.montant, d.devise, 'EUR'), 0);

            const totalLastYear = this.allDons
                .filter(d => parseInt(d.annee_don) === lastYear)
                .reduce((sum, d) => sum + utils.convertAmount(d.montant, d.devise, 'EUR'), 0);

            const totalYearEl = document.getElementById('totalYear');
            if (totalYearEl) totalYearEl.textContent = utils.formatCurrency(totalYear, 'EUR');

            const vsLastYearEl = document.getElementById('vsLastYear');
            if (vsLastYearEl) {
                if (totalLastYear > 0) {
                    const percent = Math.round(((totalYear - totalLastYear) / totalLastYear) * 100);
                    vsLastYearEl.textContent = (i18n.t('vs_last_year_label') || '{percent}% vs last year').replace('{percent}', percent);
                } else {
                    vsLastYearEl.textContent = '';
                }
            }

            // 2. Active Donors & This Month Growth
            const activeDonorsSet = new Set(
                this.allDons
                    .filter(d => (Number(d.montant) || 0) > 0)
                    .map(d => d.nom_donateur)
                    .filter(name => !!name)
            );
            const activeDonors = activeDonorsSet.size;

            const activeDonorsEl = document.getElementById('activeDonors');
            if (activeDonorsEl) activeDonorsEl.textContent = activeDonors;

            const thisMonthNewDonors = new Set(
                this.allDons
                    .filter(d => {
                        const dDate = new Date(d.date_don || d.created_at);
                        return dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth;
                    })
                    .map(d => d.nom_donateur)
            ).size;

            const thisMonthGrowthEl = document.getElementById('thisMonthGrowth');
            if (thisMonthGrowthEl) {
                thisMonthGrowthEl.textContent = (i18n.t('this_month_growth') || '+{n} this month').replace('{n}', thisMonthNewDonors);
            }

            // 3. Last Donation & Days Ago
            if (this.allDons.length > 0) {
                const lastDon = this.allDons[0];
                const lastDonationEl = document.getElementById('lastDonation');
                if (lastDonationEl) {
                    let dev = lastDon.devise || 'EUR';
                    if (dev === '€') dev = 'EUR';
                    lastDonationEl.textContent = utils.formatCurrency(lastDon.montant, dev);
                }

                const lastDonationDateEl = document.getElementById('lastDonationDate');
                if (lastDonationDateEl) {
                    const date = new Date(lastDon.date_don || lastDon.created_at);
                    const diffTime = Math.abs(now - date);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    let text = (i18n.t('days_ago') || '{n} days ago').replace('{n}', diffDays);
                    lastDonationDateEl.textContent = text;
                }
            }
        } catch (err) {
            console.error('Error rendering stats:', err);
        }
    },

    async renderDons(data) {
        const tbody = document.getElementById('donsTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8" data-i18n="no_donations_found">${i18n.t('no_donations_found')}</td></tr>`;
            return;
        }

        const canWrite = await auth.canWrite();

        const donorTotals = this.allDons.reduce((acc, d) => {
            const name = d.nom_donateur || 'Inconnu';
            const curr = d.devise || 'DH';
            if (!acc[name]) acc[name] = {};
            acc[name][curr] = (acc[name][curr] || 0) + (Number(d.montant) || 0);
            return acc;
        }, {});

        data.sort((a, b) => {
            const getWeight = (name) => {
                const totals = donorTotals[name] || {};
                let totalDH = 0;
                Object.keys(totals).forEach(curr => {
                    totalDH += utils.convertAmount(totals[curr], curr, 'DH');
                });
                return totalDH;
            };
            return getWeight(b.nom_donateur || 'Inconnu') - getWeight(a.nom_donateur || 'Inconnu');
        });

        tbody.innerHTML = data.map(d => {
            const name = d.nom_donateur || 'Inconnu';
            const totals = donorTotals[name] || {};

            // Calculer le total cumulé en EUR pour ce donateur
            let totalEUR = 0;
            Object.keys(totals).forEach(curr => {
                totalEUR += utils.convertAmount(totals[curr], curr, 'EUR');
            });

            const cumulHtml = `<span class="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] whitespace-nowrap">${utils.formatCurrency(totalEUR, 'EUR')}</span>`;

            return `
                <tr>
                    <td class="font-medium text-gray-900">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                ${name.substring(0, 2).toUpperCase()}
                            </div>
                            <div class="flex flex-col">
                                <span class="truncate max-w-[150px]">${name}</span>
                                <div class="mt-1 flex gap-1 flex-wrap">${cumulHtml}</div>
                            </div>
                        </div>
                    </td>
                    <td class="text-sm">
                        <div class="text-gray-900">${d.pays || '-'}</div>
                    </td>
                    <td class="font-bold text-gray-900">${utils.formatCurrency(utils.convertAmount(d.montant, d.devise || 'DH', 'EUR'), 'EUR')}</td>
                    <td class="text-gray-500">${d.annee_don || '-'}</td>
                    <td class="max-w-xs truncate">
                        <span class="font-medium text-indigo-600">${d.nature_don || '-'}</span>
                        ${d.description ? `<span class="text-gray-400 text-xs block">${d.description}</span>` : ''}
                    </td>
                    <td>
                        <div class="flex gap-2">
                        ${canWrite ? `
                        <button onclick="donsModule.editDon('${d.id}')" class="text-gray-400 hover:text-blue-600 mr-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                        <button onclick="donsModule.deleteDon('${d.id}')" class="text-gray-400 hover:text-red-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        ` : '-'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    handleFilter() {
        const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const natureVal = document.getElementById('filterNature')?.value || '';

        const filtered = this.allDons.filter(d => {
            const matchesSearch = !searchVal ||
                (d.nom_donateur || '').toLowerCase().includes(searchVal) ||
                (d.email_donateur || '').toLowerCase().includes(searchVal) ||
                (d.telephone_donateur || '').toLowerCase().includes(searchVal);

            const matchesNature = !natureVal || d.nature_don === natureVal;

            return matchesSearch && matchesNature;
        });

        this.renderDons(filtered);
    },

    editDon(id) {
        window.location.href = `don-form.html?id=${id}`;
    },

    async deleteDon(id) {
        if (!await auth.canWrite()) {
            utils.showNotification('Action non autorisée', 'error');
            return;
        }
        if (!await utils.confirmAction()) return;

        try {
            utils.showLoader();
            const { error } = await supabase.from('dons').delete().eq('id', id);
            if (error) throw error;
            utils.showNotification(i18n.t('deleted_successfully'), 'success');
            await this.loadDons();
        } catch (e) {
            console.error(e);
            utils.showNotification('Erreur suppression', 'error');
        } finally {
            utils.hideLoader();
        }
    },

    async promptAndExportAdhesion() {
        const { value: year } = await Swal.fire({
            title: i18n.t('select_year') || 'Sélectionner l\'année',
            input: 'text',
            inputValue: new Date().getFullYear(),
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return 'Veuillez saisir une année';
            }
        });

        if (year) {
            this.exportAdhesionMatrix(year);
        }
    },

    async exportAdhesionMatrix(year) {
        try {
            utils.showLoader();
            const title = `${i18n.t('montant_adhesion_year')}  ${year}`;
            const isArabic = i18n.currentLang === 'ar';

            const targetYear = parseInt(year);
            const filteredDons = this.allDons.filter(d => {
                let nature = (d.nature_don || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (!nature) nature = 'adhesion';
                const natureMatch = nature === 'adhesion';
                const yearMatch = parseInt(d.annee_don) === targetYear;
                return natureMatch && yearMatch;
            });

            if (filteredDons.length === 0) {
                utils.showNotification(`${i18n.t('no_donations_found')} (${targetYear})`, 'warning');
                utils.hideLoader();
                return;
            }

            const donorsMap = {};

            filteredDons.forEach(d => {
                const name = d.nom_donateur || 'Inconnu';
                if (!donorsMap[name]) {
                    donorsMap[name] = Array(12).fill(null).map(() => ({ v: 0, c: 'DH' }));
                }

                let amount = Number(d.montant) || 0;
                let currency = d.devise || 'DH';
                let targetMonths = [];

                const isAnnual = d.adhesion_annuelle === true || d.adhesion_annuelle === "true" || d.adhesion_annuelle === "on";

                if (isAnnual) {
                    for (let i = 0; i < 12; i++) targetMonths.push(i);
                } else {
                    const monthsMap = [
                        'adhesion_jan', 'adhesion_feb', 'adhesion_mar', 'adhesion_apr',
                        'adhesion_may', 'adhesion_jun', 'adhesion_jul', 'adhesion_aug',
                        'adhesion_sep', 'adhesion_oct', 'adhesion_nov', 'adhesion_dec'
                    ];
                    monthsMap.forEach((key, idx) => {
                        if (d[key] === true || d[key] === "true" || d[key] === "on") {
                            targetMonths.push(idx);
                        }
                    });
                }

                if (targetMonths.length === 0) targetMonths.push(0);

                if (targetMonths.length > 0) {
                    const share = amount / targetMonths.length;
                    targetMonths.forEach(idx => {
                        donorsMap[name][idx].v += share;
                        donorsMap[name][idx].c = currency;
                    });
                }
            });

            const matrixData = Object.keys(donorsMap).map((name, index) => {
                const months = donorsMap[name];
                const totalVal = months.reduce((a, b) => a + b.v, 0);
                const usedCurr = months.find(m => m.v > 0)?.c || 'DH';
                return { index: index + 1, name, months, total: totalVal, currency: usedCurr };
            });

            const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthHeaders = monthKeys.map(m => i18n.t('month_' + m) || m);


            let htmlTable = `
                <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: ${isArabic ? 'Amiri, Arial, sans-serif' : 'sans-serif'}; padding: 10px; font-weight: bold;">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
                        table { border-collapse: separate; border-spacing: 1px; width: 100%; page-break-inside: auto; table-layout: fixed; background-color: #e0e0e0; }
                        th, td { padding: 6px 4px; border: none; text-align: center; background-color: #fff; }
                        th { font-weight: bold; font-size: 13px; background-color: #d4edda !important; }
                        tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                        tbody { page-break-inside: auto; }
                        tbody tr:nth-child(even) td { background-color: #f0f9f4; }
                        .donor-col { width: 15%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: ${isArabic ? 'right' : 'left'} !important; }
                        .month-col { width: auto; font-size: 13px; background-color: #d4edda !important; color: #000; font-weight: bold; }
                        .total-header { background-color: #d4edda !important; color: #dc2626 !important; font-weight: bold; font-size: 14px; }
                        .total-cell { font-weight: bold; color: #dc2626; font-size: 14px; }
                    </style>
                    <h2 style="text-align: center; color: #15803d; margin-bottom: 15px; font-size: 30px; font-family: ${isArabic ? 'Amiri, serif' : 'sans-serif'};">${title}</h2>
                    <table style="width: 100%; font-size: 11px;">
                    <thead>
                        <tr>
                            <th style="width: 3%;">#</th>
                            <th class="donor-col" style="color: #8B0000;">${isArabic ? 'اسم المتبرع' : i18n.t('donor_name')}</th>
                            ${monthHeaders.map(m => `<th class="month-col">${m}</th>`).join('')}
                            <th class="total-header">${isArabic ? 'المجموع' : i18n.t('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            matrixData.forEach((row, i) => {
                const totalDisplay = (row.total % 1 === 0 ? row.total : row.total.toFixed(2)) + ' €';

                htmlTable += `
                    <tr>
                        <td>${row.index}</td>
                        <td class="donor-col" style="font-size: 13px; color: #8B0000;">${row.name}</td>
                        ${row.months.map(m => {
                    const val = m.v > 0 ? ((m.v % 1 === 0 ? m.v : m.v.toFixed(1)) + ' €') : '';
                    return `<td style="font-size: 11px;">${val}</td>`;
                }).join('')}
                        <td class="total-cell">${totalDisplay}</td>
                    </tr>
                    `;
            });

            htmlTable += `</tbody></table></div>`;

            const today = new Date();
            const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
            await exportUtils.exportToPdf(htmlTable, `Bienfaiteurs_${year}_${dateStr}`, { orientation: 'landscape' });

        } catch (e) {
            console.error("Erreur PDF Matrix:", e);
            utils.showNotification("Erreur génération PDF: " + (e.message || e), "error");
        } finally {
            utils.hideLoader();
        }
    },

    // Standard Export
    async exportPDF() {
        const nature = document.getElementById('filterNature').value;

        // Si filtre Adhésion -> Rediriger vers matrice
        if (nature === 'Adhésion') {
            return this.promptAndExportAdhesion();
        }

        const format = await exportUtils.promptExportFormat();
        if (!format) return;

        if (format === 'excel') {
            return this.exportDonationsExcel();
        } else if (format === 'word') {
            return this.exportDonationsWord();
        }

        try {
            utils.showLoader();
            const title = i18n.t('transaction_history') || 'Historique des Transactions';
            const date = new Date().toLocaleDateString();
            const isArabic = i18n.currentLang === 'ar';
            const align = isArabic ? 'right' : 'left';


            let htmlTable = `
                <div dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: sans-serif; padding: 20px;">
                    <style>
                        table { border-spacing: 0; width: 100%; border: 1px solid #000; }
                        th, td { padding: 8px; border: 1px solid #000; background-color: #fff; }
                    </style>
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4f46e5; font-size: 24px; margin-bottom: 5px;">${title}</h1>
                        <p style="color: #666;">${nature || i18n.t('all_natures')} - ${date}</p>
                    </div>
                    <table style="width: 100%; font-size: 10px;">
                        <thead>
                            <tr style="background-color: #e0e7ff;">
                                <th style="text-align: ${align};">${i18n.t('donor')}</th>
                                <th style="text-align: ${align};">${i18n.t('pays')}</th>
                                <th style="text-align: right;">${i18n.t('amount')}</th>
                                <th style="text-align: center;">${i18n.t('date')}</th>
                                <th style="text-align: center;">${i18n.t('nature_column')}</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            this.allDons
                .filter(d => !nature || d.nature_don === nature)
                .forEach((d, index) => {
                    const bg = index % 2 === 0 ? '#fff' : '#f5f7ff';
                    const montantEUR = utils.convertAmount(d.montant, d.devise, 'EUR');
                    htmlTable += `
                        <tr style="background-color: ${bg};">
                            <td>${d.nom_donateur || ''}</td>
                            <td>${d.pays || '-'}</td>
                            <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(montantEUR, 'EUR')}</td>
                            <td style="text-align: center;">${utils.formatDate(d.date_don)}</td>
                            <td style="text-align: center;">${d.nature_don || '-'}</td>
                        </tr>
                        `;
                });

            htmlTable += `</tbody></table></div>`;
            await exportUtils.exportToPdf(htmlTable, 'liste_dons');
        } catch (e) {
            console.error("Erreur PDF:", e);
            utils.showNotification("Erreur export PDF", "error");
        } finally {
            utils.hideLoader();
        }
    },

    // Form logic
    async loadDonation(id) {
        utils.showLoader();
        try {
            const { data, error } = await supabase.from('dons').select('*').eq('id', id).single();
            if (error) throw error;

            const form = document.getElementById('donForm');
            form.nom_donateur.value = data.nom_donateur;
            form.montant.value = data.montant;
            form.annee_don.value = data.annee_don;
            form.devise.value = data.devise || 'DH';
            form.description.value = data.description || '';

            if (['Adhésion', 'Zakat', 'Sadaqa'].includes(data.nature_don)) {
                form.nature_don_select.value = data.nature_don;
            } else {
                form.nature_don_select.value = 'Autre';
                form.nature_don_text.value = data.nature_don;
                document.getElementById('autreNatureDiv').classList.remove('hidden');
            }
            this.toggleNatureDon(form.nature_don_select.value);

            // Checkboxes
            if (data.nature_don === 'Adhésion') {
                form.adhesion_annuelle.checked = data.adhesion_annuelle;
                ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].forEach(m => {
                    const key = `adhesion_${m}`;
                    if (form[key]) form[key].checked = data[key];
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            utils.hideLoader();
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        utils.showLoader();

        const formData = new FormData(e.target);
        const rawData = Object.fromEntries(formData.entries());
        const donationId = new URLSearchParams(window.location.search).get('id');

        const data = {
            nom_donateur: rawData.nom_donateur,
            montant: parseFloat(rawData.montant),
            annee_don: parseInt(rawData.annee_don),
            devise: rawData.devise || 'DH',
            description: rawData.description,
            nature_don: rawData.nature_don_select === 'Autre' ? rawData.nature_don_text : rawData.nature_don_select,
            pays: rawData.pays_select === 'Autre' ? rawData.pays_text : rawData.pays_select
        };

        const checkboxNames = ['annuelle', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        checkboxNames.forEach(name => {
            const key = `adhesion_${name}`;
            data[key] = e.target[key] ? e.target[key].checked : false;
        });

        try {
            const result = donationId
                ? await supabase.from('dons').update(data).eq('id', donationId)
                : await supabase.from('dons').insert([data]);

            if (result.error) throw result.error;
            utils.showNotification(i18n.t('donation_success'), 'success');
            setTimeout(() => window.location.href = 'dons.html', 1000);
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'Erreur', text: e.message });
        } finally {
            utils.hideLoader();
        }
    },

    toggleNatureDon(val) {
        const elAdhesion = document.getElementById('adhesionOptions');
        if (elAdhesion) val === 'Adhésion' ? elAdhesion.classList.remove('hidden') : elAdhesion.classList.add('hidden');

        const elAutre = document.getElementById('autreNatureDiv');
        if (elAutre) val === 'Autre' ? elAutre.classList.remove('hidden') : elAutre.classList.add('hidden');
    }
};

window.donsModule = donsModule;
