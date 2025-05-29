/**
 * GitHub backup utilities
 */
const GitHubBackup = {
    async isConfigured() {
        const {
            [CONFIG.STORAGE_KEYS.GITHUB_PAT]: pat,
            [CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY]: repository
        } = await StorageUtils.get([
            CONFIG.STORAGE_KEYS.GITHUB_PAT,
            CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY
        ]);

        return !!(pat && repository);
    },

    async getConfig() {
        const {
            [CONFIG.STORAGE_KEYS.GITHUB_PAT]: pat = '',
            [CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY]: repository = '',
            [CONFIG.STORAGE_KEYS.GITHUB_BRANCH]: branch = 'main',
            [CONFIG.STORAGE_KEYS.GITHUB_AUTO_BACKUP]: autoBackup = false
        } = await StorageUtils.get([
            CONFIG.STORAGE_KEYS.GITHUB_PAT,
            CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY,
            CONFIG.STORAGE_KEYS.GITHUB_BRANCH,
            CONFIG.STORAGE_KEYS.GITHUB_AUTO_BACKUP
        ]);

        return { pat, repository, branch, autoBackup };
    },

    async validateConfig(config) {
        const errors = [];

        if (!config.pat) {
            errors.push('Personal Access Token is required');
        }

        if (!config.repository) {
            errors.push('Repository is required');
        } else if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(config.repository)) {
            errors.push('Repository must be in format "owner/repo"');
        }

        if (!config.branch) {
            errors.push('Branch is required');
        }

        return errors;
    },

    async testConnection(config) {
        try {
            const response = await fetch(`https://api.github.com/repos/${config.repository}`, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${config.pat}`,
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getFileInfo(config, filename) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${config.repository}/contents/${filename}?ref=${config.branch}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${config.pat}`,
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                }
            );

            if (response.status === 404) {
                return null; // File doesn't exist
            }

            if (!response.ok) {
                throw new Error(`Failed to get file info: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                sha: data.sha,
                content: atob(data.content.replace(/\s/g, ''))
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    },

    async uploadBackup(config, backupData, filename) {
        try {
            const content = btoa(JSON.stringify(backupData, null, 2));
            const message = `Auto-backup: ${new Date().toISOString()}`;

            // Check if file exists to get SHA for update
            const existingFile = await this.getFileInfo(config, filename);

            const requestBody = {
                message,
                content,
                branch: config.branch
            };

            // Add SHA if file exists (for update)
            if (existingFile) {
                requestBody.sha = existingFile.sha;
            }

            const response = await fetch(
                `https://api.github.com/repos/${config.repository}/contents/${filename}`,
                {
                    method: 'PUT',
                    headers: {
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${config.pat}`,
                        'X-GitHub-Api-Version': '2022-11-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
            }

            const result = await response.json();
            return {
                success: true,
                url: result.content.html_url,
                sha: result.content.sha
            };
        } catch (error) {
            console.error('Error uploading backup:', error);
            throw error;
        }
    },

    async performAutoBackup() {
        try {
            const config = await this.getConfig();

            if (!config.autoBackup || !await this.isConfigured()) {
                return; // Auto-backup disabled or not configured
            }

            // Generate backup data (excluding PAT)
            const backupData = await ExportUtils.generateBackupData();

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `catch-all-email-backup-${timestamp}.json`;

            const result = await this.uploadBackup(config, backupData, filename);

            console.log('Auto-backup successful:', result.url);

            // Store last backup info
            await StorageUtils.set({
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE]: new Date().toISOString(),
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_URL]: result.url
            });

            return result;
        } catch (error) {
            console.error('Auto-backup failed:', error);

            // Store last backup error
            await StorageUtils.set({
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_ERROR]: error.message,
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE]: new Date().toISOString()
            });

            throw error;
        }
    },

    async manualBackup() {
        const config = await this.getConfig();

        if (!await this.isConfigured()) {
            throw new Error('GitHub backup not configured');
        }

        const backupData = await ExportUtils.generateBackupData();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `catch-all-email-manual-backup-${timestamp}.json`;

        return await this.uploadBackup(config, backupData, filename);
    },

    async getLastBackupInfo() {
        const {
            [CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE]: lastDate,
            [CONFIG.STORAGE_KEYS.LAST_BACKUP_URL]: lastUrl,
            [CONFIG.STORAGE_KEYS.LAST_BACKUP_ERROR]: lastError
        } = await StorageUtils.get([
            CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE,
            CONFIG.STORAGE_KEYS.LAST_BACKUP_URL,
            CONFIG.STORAGE_KEYS.LAST_BACKUP_ERROR
        ]);

        return { lastDate, lastUrl, lastError };
    }
};