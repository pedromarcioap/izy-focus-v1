// Carrega configuração das APIs
import APP_CONFIG from './config.js';

const GoogleDriveSync = {
    get CLIENT_ID() { return APP_CONFIG.GOOGLE.CLIENT_ID; },
    get SCOPES() { return APP_CONFIG.GOOGLE.SCOPES; },
    FILE_NAME: 'izy-focus-backup.json',

    async isAuthenticated() {
        const data = await chrome.storage.local.get('accessToken');
        return !!data.accessToken;
    },

    async authenticate() {
        return new Promise((resolve, reject) => {
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(this.CLIENT_ID)}&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}&response_type=token&scope=${encodeURIComponent(this.SCOPES)}&prompt=consent`;

            chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                if (!redirectUrl) {
                    reject(new Error('No redirect URL'));
                    return;
                }

                const params = new URL(redirectUrl.substring(redirectUrl.indexOf('#') + 1)).searchParams;
                const accessToken = params.get('access_token');

                if (accessToken) {
                    chrome.storage.local.set({ accessToken, syncStatus: 'connected' });
                    resolve(accessToken);
                } else {
                    reject(new Error('No access token'));
                }
            });
        });
    },

    async disconnect() {
        await chrome.storage.local.remove(['accessToken', 'syncStatus', 'lastSyncTime']);
    },

    async uploadToDrive(data) {
        const { accessToken } = await chrome.storage.local.get('accessToken');
        if (!accessToken) throw new Error('Not authenticated');

        const fileContent = {
            version: 1,
            lastSync: new Date().toISOString(),
            data: data
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
            name: this.FILE_NAME,
            mimeType: 'application/json'
        };

        const metadataString = JSON.stringify(metadata);
        const contentString = JSON.stringify(fileContent);

        const multipartBody = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            metadataString + delimiter +
            'Content-Type: application/json\r\n\r\n' +
            contentString + closeDelimiter;

        const fileId = await this.getFileId(accessToken);

        if (fileId) {
            return new Promise((resolve, reject) => {
                fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary="${boundary}"`
                    },
                    body: multipartBody
                })
                .then(response => response.json())
                .then(result => {
                    chrome.storage.local.set({ lastSyncTime: Date.now() });
                    resolve(result);
                })
                .catch(reject);
            });
        } else {
            return new Promise((resolve, reject) => {
                fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary="${boundary}"`
                    },
                    body: multipartBody
                })
                .then(response => response.json())
                .then(result => {
                    chrome.storage.local.set({ lastSyncTime: Date.now() });
                    resolve(result);
                })
                .catch(reject);
            });
        }
    },

    async downloadFromDrive() {
        const { accessToken } = await chrome.storage.local.get('accessToken');
        if (!accessToken) throw new Error('Not authenticated');

        const fileId = await this.getFileId(accessToken);
        if (!fileId) return null;

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to download');
        }

        const content = await response.json();
        
        if (content.data) {
            return content;
        }
        
        return null;
    },

    async getFileId(accessToken) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${this.FILE_NAME}'`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            return data.files[0].id;
        }
        
        return null;
    },

    async sync() {
        try {
            const localData = await chrome.storage.local.get(null);
            
            const cloudData = await this.downloadFromDrive();

            if (cloudData && cloudData.data) {
                const localModified = localData.lastSyncTime || 0;
                const cloudModified = new Date(cloudData.lastSync || 0).getTime();

                if (cloudModified > localModified) {
                    await chrome.storage.local.set(cloudData.data);
                    return { action: 'import', timestamp: Date.now() };
                }
            }

            await this.uploadToDrive(localData);
            return { action: 'export', timestamp: Date.now() };
        } catch (error) {
            console.error('[IzyFocus] Sync failed:', error);
            throw error;
        }
    }
};

const ExportImport = {
    async exportToJSON() {
        const data = await chrome.storage.local.get(null);
        
        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            data: data
        };

        return JSON.stringify(exportData, null, 2);
    },

    downloadJSON(data, filename) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `izy-focus-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    },

    async importFromJSON(jsonString) {
        try {
            const importData = JSON.parse(jsonString);
            
            if (!importData.data) {
                throw new Error('Invalid format');
            }

            if (importData.version !== 1) {
                console.warn('[IzyFocus] Unknown version format');
            }

            await chrome.storage.local.set(importData.data);
            return true;
        } catch (error) {
            console.error('[IzyFocus] Import failed:', error);
            throw error;
        }
    },

    async exportToCSV() {
        const { focusLog = [], interruptLog = [] } = await chrome.storage.local.get(['focusLog', 'interruptLog']);

        let csv = 'Data,Hora,Lista,Tipo,Duração,Status\n';

        const allLogs = [...focusLog, ...interruptLog].sort((a, b) => b.timestamp - a.timestamp);

        allLogs.forEach(entry => {
            const date = new Date(entry.timestamp);
            const dateStr = date.toLocaleDateString('pt-BR');
            const timeStr = date.toLocaleTimeString('pt-BR');
            const listName = entry.listName || 'N/A';
            const duration = entry.focusTime || entry.breakTime || '-';
            
            csv += `${dateStr},${timeStr},${listName},Foco,${duration},${entry.hasOwnProperty('interrupt') ? 'Interrompido' : 'Concluído'}\n`;
        });

        return csv;
    },

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `izy-focus-historico-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GoogleDriveSync, ExportImport };
}
