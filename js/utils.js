// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Afficher une notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
        }`;

    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Formater une date au format français
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formater une date pour les inputs
 */
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Convert amount to a target currency (default DH)
 * Logic: 1 EUR = 10 DH
 */
function convertAmount(amount, fromCurrency, toCurrency = 'DH') {
    if (!amount) return 0;
    const from = String(fromCurrency || 'DH').toUpperCase();
    const to = String(toCurrency || 'DH').toUpperCase();

    if (from === to) return amount;

    // EUR to DH conversion (x10)
    if ((from === 'EUR' || from === '€') && to === 'DH') {
        return amount * 10;
    }

    // DH to EUR conversion (/10)
    if (from === 'DH' && (to === 'EUR' || to === '€')) {
        return amount / 10;
    }

    return amount;
}

/**
 * Formater un montant en devise
 */
function formatCurrency(amount, currency = 'DH') {
    if (!amount && amount !== 0) return '';
    const curr = String(currency || 'DH').toUpperCase();

    if (curr === 'DH') {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ' DH';
    }

    // Si EUR ou symbole €, utiliser le format monétaire standard
    const isoCurrency = (curr === 'EUR' || curr === '€') ? 'EUR' : curr;

    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: isoCurrency
        }).format(amount);
    } catch (e) {
        return amount.toFixed(2) + ' ' + curr;
    }
}

/**
 * Calculer l'âge à partir de la date de naissance
 */
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Valider un email
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Valider un numéro de téléphone
 */
function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/\s/g, ''));
}

/**
 * Afficher un modal de confirmation
 */
function showConfirmModal(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="flex gap-3 justify-end">
                <button id="cancelBtn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                    Annuler
                </button>
                <button id="confirmBtn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Confirmer
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('cancelBtn').onclick = () => modal.remove();
    document.getElementById('confirmBtn').onclick = () => {
        modal.remove();
        onConfirm();
    };

    // Fermer en cliquant en dehors
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

/**
 * Afficher un loader
 */
function showLoader() {
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loader.innerHTML = `
        <div class="bg-white rounded-lg p-6">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    `;
    document.body.appendChild(loader);
}

/**
 * Masquer le loader
 */
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.remove();
}

/**
 * Débounce pour les recherches
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Pagination helper
 */
class Pagination {
    constructor(totalItems, itemsPerPage = 10) {
        this.totalItems = totalItems;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
    }

    get totalPages() {
        return Math.ceil(this.totalItems / this.itemsPerPage);
    }

    get offset() {
        return (this.currentPage - 1) * this.itemsPerPage;
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    renderPagination(containerId, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = '<div class="flex items-center justify-center gap-2 mt-6">';

        // Bouton précédent
        html += `
            <button 
                onclick="pagination.prevPage(); ${onPageChange}()" 
                ${this.currentPage === 1 ? 'disabled' : ''}
                class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Précédent
            </button>
        `;

        // Numéros de pages
        for (let i = 1; i <= this.totalPages; i++) {
            if (
                i === 1 ||
                i === this.totalPages ||
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                html += `
                    <button 
                        onclick="pagination.goToPage(${i}); ${onPageChange}()" 
                        class="px-3 py-1 rounded ${i === this.currentPage
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }"
                    >
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="px-2">...</span>';
            }
        }

        // Bouton suivant
        html += `
            <button 
                onclick="pagination.nextPage(); ${onPageChange}()" 
                ${this.currentPage === this.totalPages ? 'disabled' : ''}
                class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Suivant
            </button>
        `;

        html += '</div>';
        container.innerHTML = html;
    }
}

/**
 * Exporter des données en CSV
 */
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification('Aucune donnée à exporter', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Échapper les virgules et guillemets
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Export des fonctions
window.utils = {
    showNotification,
    formatDate,
    formatDateForInput,
    formatCurrency,
    convertAmount,
    calculateAge,
    validateEmail,
    validatePhone,
    showConfirmModal,
    showLoader,
    hideLoader,
    debounce,
    Pagination,
    exportToCSV
};
