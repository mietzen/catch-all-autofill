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
            [CONFIG.STORAGE_KEYS.GITHUB_BRANCH]: branch = 'main'
        } = await StorageUtils.get([
            CONFIG.STORAGE_KEYS.GITHUB_PAT,
            CONFIG.STORAGE_KEYS.GITHUB_REPOSITORY,
            CONFIG.STORAGE_KEYS.GITHUB_BRANCH
        ]);

        return { pat, repository, branch };
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
                return null;
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

    getBackupFilename() {
        return 'catch-all-email-backup.json';
    },

    async uploadBackup(config, backupData, filename = null) {
        try {
            const backupFilename = filename || this.getBackupFilename();
            const content = btoa(JSON.stringify(backupData, null, 2));
            const message = `Catch-All Email Backup: ${new Date().toISOString()}`;

            const existingFile = await this.getFileInfo(config, backupFilename);

            const requestBody = {
                message,
                content,
                branch: config.branch
            };

            if (existingFile) {
                requestBody.sha = existingFile.sha;
            }

            const response = await fetch(
                `https://api.github.com/repos/${config.repository}/contents/${backupFilename}`,
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
                const errorText = await response.text();
                throw new Error(errorText);
            }

            const result = await response.json();
            return {
                success: true,
                url: result.content.html_url,
                sha: result.content.sha,
                filename: backupFilename
            };
        } catch (error) {
            console.error('Error uploading backup:', error);
            throw error;
        }
    },

    async performAutoBackup() {
        try {
            const config = await this.getConfig();

            if (!await this.isConfigured()) {
                return;
            }

            const backupData = await ExportUtils.generateBackupData();
            const result = await this.uploadBackup(config, backupData);

            console.log('Auto-backup successful:', result.url);

            await StorageUtils.set({
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE]: new Date().toISOString(),
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_URL]: result.url,
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_ERROR]: null
            });

            return result;
        } catch (error) {
            console.error('Auto-backup failed:', error);

            await StorageUtils.set({
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_ERROR]: error.message,
                [CONFIG.STORAGE_KEYS.LAST_BACKUP_DATE]: new Date().toISOString()
            });

            throw error;
        }
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