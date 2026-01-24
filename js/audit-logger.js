/**
 * Audit Logger Utility
 * Logs all user actions for audit trail
 */

const auditLogger = {
    /**
     * Log an action to the audit trail
     * @param {string} actionType - Type of action (CREATE, UPDATE, DELETE, EXPORT, LOGIN, LOGOUT, etc.)
     * @param {string} entityType - Type of entity (donation, orphan, widow, aide, user, etc.)
     * @param {object} details - Additional details about the action
     */
    async logAction(actionType, entityType, details = {}) {
        try {
            // Get current user
            const session = await window.supabaseClient.getCurrentSession();
            if (!session || !session.user) {
                console.warn('Cannot log action: No user session');
                return;
            }

            // Prepare log entry
            const logEntry = {
                user_email: session.user.email,
                action_type: actionType,
                entity_type: entityType,
                entity_id: details.id || null,
                details: details,
                ip_address: await this.getClientIP(),
                created_at: new Date().toISOString()
            };

            // Insert into audit_logs table
            const { error } = await supabase
                .from('audit_logs')
                .insert([logEntry]);

            if (error) {
                console.error('Error logging action:', error);
            }
        } catch (e) {
            console.error('Audit logging failed:', e);
        }
    },

    /**
     * Get client IP address (best effort)
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (e) {
            return 'unknown';
        }
    },

    /**
     * Convenience methods for common actions
     */
    async logCreate(entityType, details) {
        return this.logAction('CREATE', entityType, details);
    },

    async logUpdate(entityType, details) {
        return this.logAction('UPDATE', entityType, details);
    },

    async logDelete(entityType, details) {
        return this.logAction('DELETE', entityType, details);
    },

    async logExport(entityType, details) {
        return this.logAction('EXPORT', entityType, details);
    },

    async logLogin(details = {}) {
        return this.logAction('LOGIN', 'auth', details);
    },

    async logLogout(details = {}) {
        return this.logAction('LOGOUT', 'auth', details);
    },

    async logView(entityType, details) {
        return this.logAction('VIEW', entityType, details);
    }
};

// Export
window.auditLogger = auditLogger;
