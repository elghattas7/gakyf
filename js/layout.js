// =====================================================
// COMPOSANTS DE LAYOUT
// =====================================================

/**
 * Créer le header
 */
function createHeader(userInfo) {
    return `
        <header class="bg-white shadow-md px-6 py-4 flex items-center justify-between no-print">
            <div class="flex items-center gap-4">
                <button id="toggleSidebar" class="xl:hidden text-gray-600 hover:text-gray-900">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
                <h1 class="text-xl font-bold tracking-tight text-blue-600 hidden"></h1>
            </div>
            
            <div class="flex items-center gap-4">
                <select id="languageSelect" onchange="i18n.setLanguage(this.value)" class="mr-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                    <option value="fr">Français</option>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                </select>

                <div class="text-right">
                    <p class="text-sm font-semibold text-gray-800">${userInfo.full_name || userInfo.email}</p>
                    <p class="text-xs text-gray-600 capitalize">${i18n.t('role_' + userInfo.role)}</p>
                </div>
                <button onclick="window.location.href='profile.html'" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition" data-i18n="profile">
                    Profil
                </button>
                <button onclick="auth.logout()" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition" data-i18n="logout">
                    Déconnexion
                </button>
            </div>
        </header>
    `;
}

/**
 * Créer la sidebar
 */
function createSidebar(currentPage, userRole) {
    const menuItems = getMenuItemsByRole(userRole);

    let menuHTML = '';
    menuItems.forEach(item => {
        const isActive = currentPage === item.page ? 'active' : '';
        menuHTML += `
            <a href="${item.page}" class="sidebar-link ${isActive}">
                ${item.icon}
                <span data-i18n="${item.label}">${i18n.t ? i18n.t(item.label) : item.label}</span>
            </a>
        `;
    });

    return `
        <aside id="sidebar" class="sidebar">
            <div class="p-6 border-b border-gray-800">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 flex items-center justify-center">
                        <img src="img/logo.png" alt="Logo" class="w-full h-full object-contain">
                    </div>
                    <div>
                    </div>
                </div>
            </div>
            
            <nav class="p-4">
                ${menuHTML}
            </nav>
        </aside>
    `;
}

/**
 * Obtenir les éléments de menu selon le rôle
 */
function getMenuItemsByRole(role) {
    const dashboardIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>';
    const veuvesIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>';
    const orphelinsIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>';
    const aidesIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    const donsIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>';
    const usersIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>';
    const chartIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
    const reportIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
    const auditIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>';
    const settingsIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';

    const allMenuItems = [
        { page: 'dashboard.html', label: 'dashboard', icon: dashboardIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'veuves.html', label: 'widows', icon: veuvesIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'orphelins.html', label: 'orphans', icon: orphelinsIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'aides.html', label: 'aids', icon: aidesIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'dons.html', label: 'donations', icon: donsIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'annual-reports.html', label: 'annual_reports', icon: reportIcon, roles: ['admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre'] },
        { page: 'audit-trail.html', label: 'audit_trail', icon: auditIcon, roles: ['admin'] },
        { page: 'settings.html', label: 'settings', icon: settingsIcon, roles: ['admin'] },
        { page: 'register.html', label: 'users', icon: usersIcon, roles: ['admin'] }
    ];

    return allMenuItems.filter(item => item.roles.includes(role));
}

/**
 * Obtenir le label du rôle en français
 */
function getRoleLabel(role) {
    return i18n.t('role_' + role);
}

/**
 * Initialiser le layout de la page
 */
async function initLayout(currentPage) {
    const userInfo = await auth.getCurrentUserInfo();

    if (!userInfo) {
        window.location.href = 'index.html';
        return;
    }

    // Créer le header
    const headerContainer = document.getElementById('header');
    if (headerContainer) {
        headerContainer.innerHTML = createHeader(userInfo);
    }

    // Créer la sidebar
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = createSidebar(currentPage, userInfo.role);
    }

    // Toggle sidebar sur mobile
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Fermer la sidebar en cliquant en dehors sur mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024) {
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // Appliquer la traduction maintenant que le layout est injecté
    if (window.i18n) {
        window.i18n.applyLanguage(window.i18n.currentLang);
    }

    return userInfo;
}

// Export des fonctions
window.layout = {
    createHeader,
    createSidebar,
    getMenuItemsByRole,
    getRoleLabel,
    initLayout
};
