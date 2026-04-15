document.addEventListener('DOMContentLoaded', async () => {
    localizeHtmlPage();
    await loadDarkMode();
    await loadVolumeSettings();
    await loadPerformanceLog();
    setupEventListeners();
    setupVolumeControl();
    await renderAll();
    setupSyncUI();
    setupBackupUI();
    setupSoundSyncUI();

    function localizeHtmlPage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18n);
            if (msg) el.textContent = msg;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
            if (msg) el.placeholder = msg;
        });
        const titleMsg = chrome.i18n.getMessage('options_title');
        if (titleMsg) document.title = titleMsg;
    }

    async function loadDarkMode() {
        try {
            const data = await chrome.storage.local.get('darkMode');
            if (data.darkMode) {
                document.documentElement.classList.add('dark');
            }
        } catch (e) {
            console.warn('[IzyFocus] Failed to load dark mode:', e);
        }
    }

    async function loadVolumeSettings() {
        try {
            const data = await chrome.storage.local.get('soundVolume');
            const slider = document.getElementById('volume-slider');
            const valueDisplay = document.getElementById('volume-value');
            
            if (slider && valueDisplay) {
                const volume = data.soundVolume !== undefined ? data.soundVolume : 50;
                slider.value = volume;
                valueDisplay.textContent = `${volume}%`;
            }

            const notificationSounds = document.getElementById('notification-sounds');
            const systemNotifications = document.getElementById('system-notifications');
            
            const soundData = await chrome.storage.local.get(['soundEnabled', 'systemNotificationsEnabled']);
            if (notificationSounds) notificationSounds.checked = soundData.soundEnabled !== false;
            if (systemNotifications) systemNotifications.checked = soundData.systemNotificationsEnabled !== false;
        } catch (e) {
            console.warn('[IzyFocus] Failed to load volume settings:', e);
        }
    }

    async function loadPerformanceLog() {
        try {
            const data = await chrome.storage.local.get(['focusLog', 'interruptLog', 'currentSessionIntention']);
            const focusLog = data.focusLog || [];
            const interruptLog = data.interruptLog || [];
            
            const logContainer = document.getElementById('performance-log');
            if (!logContainer) return;
            
            if (focusLog.length === 0 && interruptLog.length === 0) {
                logContainer.innerHTML = '<div class="log-empty">Nenhuma sessão registrada ainda.</div>';
                return;
            }
            
            const allLogs = [];
            
            focusLog.forEach(entry => {
                allLogs.push({
                    timestamp: entry.timestamp,
                    type: 'completed',
                    listName: entry.listName,
                    focusTime: entry.focusTime
                });
            });
            
            interruptLog.forEach(entry => {
                allLogs.push({
                    timestamp: entry.timestamp,
                    type: 'interrupted',
                    listName: entry.listName
                });
            });
            
            allLogs.sort((a, b) => b.timestamp - a.timestamp);
            
            const recentLogs = allLogs.slice(0, 10);
            
            logContainer.innerHTML = recentLogs.map(log => {
                const date = new Date(log.timestamp);
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const statusClass = log.type === 'completed' ? 'status-completed' : 'status-interrupted';
                const statusText = log.type === 'completed' ? 'Concluído' : 'Interrompido';
                
                const intentionHtml = log.dayIntention 
                    ? `<div class="log-intention">"${log.dayIntention}"</div>` 
                    : '';
                
                return `
                    <div class="log-entry">
                        <div class="log-info">
                            <span class="log-date">${dateStr} ${timeStr}</span>
                            <span class="log-list">${log.listName || 'Sessão'}</span>
                            ${intentionHtml}
                        </div>
                        <div class="log-details">
                            ${log.focusTime ? `<span class="log-duration">${log.focusTime} min</span>` : ''}
                            <span class="log-status ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (e) {
            console.warn('[IzyFocus] Failed to load performance log:', e);
        }
    }

    function setupVolumeControl() {
        const slider = document.getElementById('volume-slider');
        const valueDisplay = document.getElementById('volume-value');
        
        if (!slider || !valueDisplay) return;

        slider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            valueDisplay.textContent = `${volume}%`;
        });

        slider.addEventListener('change', async (e) => {
            const volume = parseInt(e.target.value);
            await chrome.storage.local.set({ soundVolume: volume });
            chrome.runtime.sendMessage({ command: 'setVolume', volume: volume / 100 });
        });

        const notificationSounds = document.getElementById('notification-sounds');
        notificationSounds?.addEventListener('change', async (e) => {
            await chrome.storage.local.set({ soundEnabled: e.target.checked });
        });

        const systemNotifications = document.getElementById('system-notifications');
        systemNotifications?.addEventListener('change', async (e) => {
            await chrome.storage.local.set({ systemNotificationsEnabled: e.target.checked });
        });
    }

    function setupEventListeners() {
        const darkModeBtn = document.getElementById('dark-mode-btn');
        darkModeBtn?.addEventListener('click', async () => {
            const isDark = document.documentElement.classList.toggle('dark');
            await chrome.storage.local.set({ darkMode: isDark });
        });

        const blockModeRadios = document.querySelectorAll('input[name="block-mode"]');
        blockModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const blockSection = document.getElementById('blocklist-section');
                const whiteSection = document.getElementById('whitelist-section');
                if (e.target.value === 'whitelist') {
                    blockSection.style.display = 'none';
                    whiteSection.style.display = 'block';
                } else {
                    blockSection.style.display = 'block';
                    whiteSection.style.display = 'none';
                }
            });
        });

        document.getElementById('cancel-edit-focus-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('cancel-edit-block-btn')?.addEventListener('click', cancelEditing);
        document.getElementById('cancel-edit-white-btn')?.addEventListener('click', cancelEditing);

        const focusForm = document.getElementById('add-focus-list-form');
        focusForm?.addEventListener('submit', handleFocusFormSubmit);

        const blockForm = document.getElementById('add-block-list-form');
        blockForm?.addEventListener('submit', (e) => handleListForm(e, 'block'));

        const whiteForm = document.getElementById('add-white-list-form');
        whiteForm?.addEventListener('submit', (e) => handleListForm(e, 'white'));
    }

    let editingState = { type: null, id: null };

    async function renderAll() {
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);
        const focusLists = data.focusLists || [];
        const blockLists = data.blockLists || [];
        const whitelists = data.whitelists || [];

        renderFocusLists(focusLists, whitelists, blockLists);
        renderBlockLists(blockLists);
        renderWhiteLists(whitelists);
        populateAssociationSelects(blockLists, whitelists);
    }

    function renderFocusLists(focusLists, whitelists, blockLists) {
        const container = document.getElementById('focus-lists-container');
        container.innerHTML = '';

        focusLists.forEach(list => {
            let associationName = chrome.i18n.getMessage('options_association_none');
            if (list.blockMode === 'whitelist') {
                const associated = whitelists.find(l => l.id === list.associatedListId);
                if (associated) associationName = chrome.i18n.getMessage('options_association_allowing', [associated.name]);
            } else {
                const associated = blockLists.find(l => l.id === list.associatedListId);
                if (associated) associationName = chrome.i18n.getMessage('options_association_blocking', [associated.name]);
            }

            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="info">
                    <strong>${list.name}</strong><br>
                    <span>${list.focusTime}m Foco / ${list.breakTime}m Pausa • ${associationName}</span>
                </div>
                <div class="list-item-actions">
                    <button class="action-btn edit-btn" title="${chrome.i18n.getMessage('options_edit_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9-9z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="${chrome.i18n.getMessage('options_delete_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;

            item.querySelector('.edit-btn')?.addEventListener('click', () => startEditing('focus', list.id));
            item.querySelector('.delete-btn')?.addEventListener('click', () => deleteList('focus', list.id));
            container.appendChild(item);
        });

        if (focusLists.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma lista de foco encontrada.</div>';
        }
    }

    function renderBlockLists(blockLists) {
        const container = document.getElementById('block-lists-container');
        container.innerHTML = '';

        blockLists.forEach(list => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="info">
                    <strong>${list.name}</strong><br>
                    <span>${list.sites.length} site(s)</span>
                </div>
                <div class="list-item-actions">
                    <button class="action-btn edit-btn" title="${chrome.i18n.getMessage('options_edit_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9-9z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="${chrome.i18n.getMessage('options_delete_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;

            item.querySelector('.edit-btn')?.addEventListener('click', () => startEditing('block', list.id));
            item.querySelector('.delete-btn')?.addEventListener('click', () => deleteList('block', list.id));
            container.appendChild(item);
        });
    }

    function renderWhiteLists(whitelists) {
        const container = document.getElementById('white-lists-container');
        container.innerHTML = '';

        whitelists.forEach(list => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="info">
                    <strong>${list.name}</strong><br>
                    <span>${list.sites.length} site(s)</span>
                </div>
                <div class="list-item-actions">
                    <button class="action-btn edit-btn" title="${chrome.i18n.getMessage('options_edit_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9-9z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="${chrome.i18n.getMessage('options_delete_btn_tooltip')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            `;

            item.querySelector('.edit-btn')?.addEventListener('click', () => startEditing('white', list.id));
            item.querySelector('.delete-btn')?.addEventListener('click', () => deleteList('white', list.id));
            container.appendChild(item);
        });
    }

    function populateAssociationSelects(blockLists, whitelists) {
        const blockSelect = document.getElementById('block-list-association');
        const whiteSelect = document.getElementById('white-list-association');

        blockSelect.innerHTML = '';
        whiteSelect.innerHTML = '';

        if (blockLists.length === 0) {
            blockSelect.innerHTML = '<option>Crie uma blocklist primeiro</option>';
        } else {
            blockLists.forEach(list => {
                const opt = document.createElement('option');
                opt.value = list.id;
                opt.textContent = list.name;
                blockSelect.appendChild(opt);
            });
        }

        if (whitelists.length === 0) {
            whiteSelect.innerHTML = '<option>Crie uma whitelist primeiro</option>';
        } else {
            whitelists.forEach(list => {
                const opt = document.createElement('option');
                opt.value = list.id;
                opt.textContent = list.name;
                whiteSelect.appendChild(opt);
            });
        }
    }

    async function startEditing(type, id) {
        editingState = { type, id };
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);

        if (type === 'focus') {
            const list = data.focusLists.find(l => l.id === id);
            document.getElementById('focus-list-name').value = list.name;
            document.getElementById('focus-time').value = list.focusTime;
            document.getElementById('break-time').value = list.breakTime;

            const radio = document.getElementById(list.blockMode === 'whitelist' ? 'mode-whitelist' : 'mode-blocklist');
            if (radio) radio.checked = true;
            
            const blockSection = document.getElementById('blocklist-section');
            const whiteSection = document.getElementById('whitelist-section');
            if (list.blockMode === 'whitelist') {
                blockSection.style.display = 'none';
                whiteSection.style.display = 'block';
                if (whiteSelect) whiteSelect.value = list.associatedListId;
            } else {
                blockSection.style.display = 'block';
                whiteSection.style.display = 'none';
                if (blockSelect) blockSelect.value = list.associatedListId;
            }

            const form = document.getElementById('add-focus-list-form');
            form.classList.add('active');
            document.getElementById('focus-form-title').textContent = chrome.i18n.getMessage('options_editing_focus_list');
            document.getElementById('submit-focus-form-btn').textContent = chrome.i18n.getMessage('options_save_changes');
        } else if (type === 'block') {
            const list = data.blockLists.find(l => l.id === id);
            document.getElementById('block-list-name').value = list.name;
            document.getElementById('block-list-sites').value = list.sites.join('\n');

            const form = document.getElementById('add-block-list-form');
            form.classList.add('active');
            document.getElementById('block-form-title').textContent = chrome.i18n.getMessage('options_editing_blocklist');
            document.getElementById('submit-block-form-btn').textContent = chrome.i18n.getMessage('options_save_changes');
        } else if (type === 'white') {
            const list = data.whitelists.find(l => l.id === id);
            document.getElementById('white-list-name').value = list.name;
            document.getElementById('white-list-sites').value = list.sites.join('\n');

            const form = document.getElementById('add-white-list-form');
            form.classList.add('active');
            document.getElementById('white-form-title').textContent = chrome.i18n.getMessage('options_editing_whitelist');
            document.getElementById('submit-white-form-btn').textContent = chrome.i18n.getMessage('options_save_changes');
        }
    }

    function cancelEditing() {
        document.getElementById('add-focus-list-form').classList.remove('active');
        document.getElementById('add-focus-list-form').reset();
        
        document.getElementById('add-block-list-form').classList.remove('active');
        document.getElementById('add-block-list-form').reset();
        
        document.getElementById('add-white-list-form').classList.remove('active');
        document.getElementById('add-white-list-form').reset();

        document.getElementById('focus-form-title').textContent = chrome.i18n.getMessage('options_add_focus_list');
        document.getElementById('submit-focus-form-btn').textContent = chrome.i18n.getMessage('options_submit_focus_list');

        editingState = { type: null, id: null };
        
        document.getElementById('blocklist-section').style.display = 'block';
        document.getElementById('whitelist-section').style.display = 'none';
    }

    async function handleFocusFormSubmit(e) {
        e.preventDefault();
        
        const blockMode = document.querySelector('input[name="block-mode"]:checked').value;
        const selectElement = blockMode === 'whitelist' 
            ? document.getElementById('white-list-association') 
            : document.getElementById('block-list-association');
        
        const associatedListId = parseInt(selectElement?.value, 10);

        if (isNaN(associatedListId)) {
            alert('Por favor, crie e selecione uma lista primeiro.');
            return;
        }

        const { focusLists, nextListId = 1 } = await chrome.storage.local.get(['focusLists', 'nextListId']);
        
        const updatedList = {
            id: editingState.id,
            name: document.getElementById('focus-list-name').value,
            focusTime: parseInt(document.getElementById('focus-time').value, 10),
            breakTime: parseInt(document.getElementById('break-time').value, 10),
            blockMode,
            associatedListId
        };

        let newFocusLists = [];
        let newNextListId = nextListId;

        if (editingState.type === 'focus') {
            newFocusLists = focusLists.map(list => list.id === editingState.id ? updatedList : list);
        } else {
            updatedList.id = nextListId;
            newFocusLists = [...(focusLists || []), updatedList];
            newNextListId = nextListId + 1;
        }

        await chrome.storage.local.set({ focusLists: newFocusLists, nextListId: newNextListId });
        cancelEditing();
        await renderAll();
    }

    async function handleListForm(e, type) {
        e.preventDefault();
        
        const isBlock = type === 'block';
        const storageKey = isBlock ? 'blockLists' : 'whitelists';
        const nextIdKey = isBlock ? 'nextBlockListId' : 'nextWhiteListId';
        
        const { [storageKey]: lists, [nextIdKey]: nextId = 1 } = await chrome.storage.local.get([storageKey, nextIdKey]);
        
        const sites = document.getElementById(isBlock ? 'block-list-sites' : 'white-list-sites')
            .value.split('\n')
            .map(s => s.trim().replace(/^(https?:\/\/)?(www\.)?/, ''))
            .filter(s => s.length > 0 && s.includes('.'));

        const updatedList = {
            id: editingState.id,
            name: document.getElementById(isBlock ? 'block-list-name' : 'white-list-name').value,
            sites
        };

        let newLists = [];
        let newNextId = nextId;

        if (editingState.type === type) {
            newLists = lists.map(list => list.id === editingState.id ? updatedList : list);
        } else {
            updatedList.id = nextId;
            newLists = [...(lists || []), updatedList];
            newNextId = nextId + 1;
        }

        await chrome.storage.local.set({ [storageKey]: newLists, [nextIdKey]: newNextId });
        cancelEditing();
        await renderAll();
    }

    async function deleteList(type, id) {
        let key;
        if (type === 'focus') key = 'focusLists';
        else if (type === 'block') key = 'blockLists';
        else key = 'whitelists';

        const confirmMsg = type === 'focus' 
            ? chrome.i18n.getMessage('options_confirm_delete_focus')
            : type === 'block' 
                ? chrome.i18n.getMessage('options_confirm_delete_blocklist')
                : chrome.i18n.getMessage('options_confirm_delete_whitelist');

        if (!confirm(confirmMsg)) return;

        const { [key]: lists } = await chrome.storage.local.get(key);
        const updatedLists = lists.filter(list => list.id !== id);
        await chrome.storage.local.set({ [key]: updatedLists });
        await renderAll();
    }

    function setupSyncUI() {
        const syncToggleBtn = document.getElementById('sync-toggle-btn');
        const syncNowBtn = document.getElementById('sync-now-btn');
        const syncStatusText = document.getElementById('sync-status-text');
        const syncLastTime = document.getElementById('sync-last');
        const autoSyncCheckbox = document.getElementById('auto-sync');

        chrome.storage.local.get(['syncStatus', 'lastSyncTime', 'autoSync'], (data) => {
            if (data.syncStatus === 'connected') {
                syncStatusText.textContent = 'Conectado';
                syncStatusText.className = 'sync-state connected';
                syncToggleBtn.innerHTML = '<span>Desconectar</span>';
                syncNowBtn.style.display = 'flex';
                syncLastTime.style.display = data.lastSyncTime ? 'flex' : 'none';
                if (data.lastSyncTime) {
                    document.getElementById('sync-last-time').textContent = formatTimeAgo(data.lastSyncTime);
                }
            }
            autoSyncCheckbox.checked = data.autoSync || false;
        });

        syncToggleBtn.addEventListener('click', async () => {
            const data = await chrome.storage.local.get('syncStatus');
            
            if (data.syncStatus === 'connected') {
                await chrome.storage.local.set({ syncStatus: 'disconnected', accessToken: null });
                syncStatusText.textContent = 'Não conectado';
                syncStatusText.className = 'sync-state disconnected';
                syncToggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg><span>Conectar Google Drive</span>';
                syncNowBtn.style.display = 'none';
                syncLastTime.style.display = 'none';
            } else {
                syncStatusText.textContent = 'Conectando...';
                syncStatusText.className = 'sync-state syncing';
                
                const CLIENT_ID = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.GOOGLE.CLIENT_ID : null;
                const SCOPES = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.GOOGLE.SCOPES : 'https://www.googleapis.com/auth/drive.file';
                
                if (!CLIENT_ID || CLIENT_ID.includes('SEU_CLIENT_ID')) {
                    alert('Configure o GOOGLE_CLIENT_ID no arquivo utils/config.js antes de usar a sincronização.');
                    syncStatusText.textContent = 'Configuração necessária';
                    syncStatusText.className = 'sync-state disconnected';
                    return;
                }
                
                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
                
                chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
                    if (chrome.runtime.lastError || !redirectUrl) {
                        syncStatusText.textContent = 'Erro na conexão';
                        syncStatusText.className = 'sync-state disconnected';
                        return;
                    }

                    const params = new URL(redirectUrl.substring(redirectUrl.indexOf('#') + 1)).searchParams;
                    const accessToken = params.get('access_token');

                    if (accessToken) {
                        await chrome.storage.local.set({ 
                            syncStatus: 'connected', 
                            accessToken,
                            lastSyncTime: Date.now()
                        });
                        syncStatusText.textContent = 'Conectado';
                        syncStatusText.className = 'sync-state connected';
                        syncToggleBtn.innerHTML = '<span>Desconectar</span>';
                        syncNowBtn.style.display = 'flex';
                        syncLastTime.style.display = 'flex';
                        document.getElementById('sync-last-time').textContent = 'Agora mesmo';
                    }
                });
            }
        });

        syncNowBtn?.addEventListener('click', async () => {
            syncStatusText.textContent = 'Sincronizando...';
            syncStatusText.className = 'sync-state syncing';
            
            await new Promise(r => setTimeout(r, 1000));
            
            await chrome.storage.local.set({ lastSyncTime: Date.now() });
            syncStatusText.textContent = 'Conectado';
            syncStatusText.className = 'sync-state connected';
            syncLastTime.style.display = 'flex';
            document.getElementById('sync-last-time').textContent = 'Agora mesmo';
        });

        autoSyncCheckbox?.addEventListener('change', async (e) => {
            await chrome.storage.local.set({ autoSync: e.target.checked });
        });
    }

    function setupBackupUI() {
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');

        exportBtn?.addEventListener('click', async () => {
            const data = await chrome.storage.local.get(null);
            
            const exportData = {
                version: 1,
                exportDate: new Date().toISOString(),
                data: data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `izy-focus-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        });

        importBtn?.addEventListener('click', () => {
            importFile.click();
        });

        importFile?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importData = JSON.parse(text);

                if (importData.data) {
                    await chrome.storage.local.set(importData.data);
                    alert('Dados importados com sucesso!');
                    window.location.reload();
                } else {
                    alert('Formato de arquivo inválido.');
                }
            } catch (error) {
                alert('Erro ao importar arquivo: ' + error.message);
            }

            importFile.value = '';
        });
    }

    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Agora mesmo';
        if (seconds < 3600) return `Há ${Math.floor(seconds / 60)} minutos`;
        if (seconds < 86400) return `Há ${Math.floor(seconds / 3600)} horas`;
        return `Há ${Math.floor(seconds / 86400)} dias`;
    }

    const GITHUB_API_URL = 'https://api.github.com/repos/pedromarcioap/izy-focus-assets/contents/public';
    const CACHE_KEY = 'soundInventory';
    const CACHE_TIMESTAMP_KEY = 'soundInventoryTimestamp';

    async function setupSoundSyncUI() {
        const syncBtn = document.getElementById('sync-sounds-btn');
        const countDisplay = document.getElementById('sound-count-display');
        
        if (!syncBtn || !countDisplay) {
            console.warn('[IzyFocus] Sound sync UI elements not found');
            return;
        }
        
        await loadSoundSyncStatus();

        syncBtn.addEventListener('click', async () => {
            syncBtn.disabled = true;
            syncBtn.querySelector('span').textContent = 'Sincronizando...';
            
            try {
                const remoteSounds = await fetchGitHubSounds();
                console.log('[IzyFocus] Fetched sounds:', remoteSounds);
                
                if (remoteSounds && remoteSounds.length > 0) {
                    await chrome.storage.local.set({
                        [CACHE_KEY]: remoteSounds,
                        [CACHE_TIMESTAMP_KEY]: Date.now()
                    });
                    countDisplay.textContent = `${remoteSounds.length} trilhas disponíveis`;
                    syncBtn.querySelector('span').textContent = 'Sincronizado!';
                    setTimeout(() => {
                        syncBtn.querySelector('span').textContent = 'Sincronizar Sons';
                    }, 2000);
                } else {
                    countDisplay.textContent = 'Nenhuma trilha encontrada no repositório';
                    syncBtn.querySelector('span').textContent = 'Repositório vazio';
                }
            } catch (e) {
                console.error('[IzyFocus] Sound sync failed:', e);
                countDisplay.textContent = 'Erro: repositório indisponível';
                syncBtn.querySelector('span').textContent = 'Erro - Tente novamente';
            }
            
            syncBtn.disabled = false;
        });
    }

    async function loadSoundSyncStatus() {
        const countDisplay = document.getElementById('sound-count-display');
        if (!countDisplay) return;
        
        const cached = await chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
        
        if (cached[CACHE_KEY] && cached[CACHE_KEY].length > 0) {
            const count = cached[CACHE_KEY].length;
            const lastSync = cached[CACHE_TIMESTAMP_KEY];
            const date = new Date(lastSync).toLocaleDateString('pt-BR');
            countDisplay.textContent = `${count} trilhas disponíveis (${date})`;
        } else {
            countDisplay.textContent = 'Nenhuma trilha sincronizada';
        }
    }

    async function fetchGitHubSounds() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(GITHUB_API_URL, {
                signal: controller.signal,
                headers: { 
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const files = await response.json();
            console.log('[IzyFocus] GitHub files response:', files);
            
            return files
                .filter(f => f.name && f.name.toLowerCase().endsWith('.mp3'))
                .map(f => ({
                    file: f.name,
                    name: f.name.replace('.mp3', '').replace(/-/g, ' '),
                    emoji: '🎵',
                    isLocal: false,
                    sourceUrl: f.download_url
                }));
        } catch (e) {
            clearTimeout(timeoutId);
            console.error('[IzyFocus] fetchGitHubSounds error:', e.message);
            throw e;
        }
    }
});
