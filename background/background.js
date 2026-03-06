const STORAGE_KEYS = { TIMER_STATE: 'timerState', FOCUS_LISTS: 'focusLists', BLOCK_LISTS: 'blockLists', WHITELISTS: 'whitelists' };
const ALARM_NAME = 'izyFocusTimer';
const BLOCK_RULE_ID = 1;

// URLs que sempre devem ser permitidas (não bloqueadas)
function isUrlAlwaysAllowed(url) {
    if (!url) return false;
    
    // URLs do Chrome extension atual
    const extensionUrl = `chrome-extension://${chrome.runtime.id}`;
    if (url.startsWith(extensionUrl)) return true;
    
    // Notificações de extensões do Chrome (qualquer página da extensão específica)
    if (url.startsWith('chrome-extension://hkhggnncdpfibdhinjiegagmopldibha/')) return true;
    
    // Novas abas e páginas internas do navegador
    try {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol;
        
        // Permitir todas as URLs chrome://
        if (protocol === 'chrome:') return true;
        
        // Permitir todas as URLs about:
        if (protocol === 'about:') return true;
        
        // Permitir chrome-extension:// (já coberto acima, mas como fallback)
        if (protocol === 'chrome-extension:') {
            // Já permitimos extensões específicas acima
            // Por segurança, permitir qualquer extensão? Não, apenas as já permitidas.
            // Retornar false para outras extensões
        }
        
        // URLs específicas comuns
        if (url === 'about:blank' || url === 'about:newtab' || url === 'about:new-tab-page') return true;
        if (urlObj.hostname === 'newtab' || urlObj.hostname === 'blank') return true;
    } catch (e) {
        // URL inválida, não permitir
    }
    
    return false;
}

// --- LÓGICA DE BLOQUEIO ATIVA ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;
    const { [STORAGE_KEYS.TIMER_STATE]: timerState, [STORAGE_KEYS.WHITELISTS]: whitelists } = await chrome.storage.local.get([STORAGE_KEYS.TIMER_STATE, STORAGE_KEYS.WHITELISTS]);
    if (!timerState || !timerState.isActive || timerState.currentPhase !== 'focus' || timerState.blockMode !== 'whitelist') return;
    const list = whitelists.find(l => l.id === timerState.associatedListId);
    if (!list || !list.sites || list.sites.length === 0) return;
    
    // Verificar se a URL deve ser sempre permitida
    if (isUrlAlwaysAllowed(tab.url)) return;
    
    const tabHostname = new URL(tab.url).hostname.replace(/^www\./, '');
    if (!list.sites.includes(tabHostname)) {
        try { await chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked/blocked.html') }); } catch (error) { console.warn(`Error updating tab: ${error.message}`); }
    }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
    if (!timerState || !timerState.isActive || timerState.currentPhase !== 'focus') return;
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (!tab.url) return;
        
        // Verificar se a URL deve ser sempre permitida
        if (isUrlAlwaysAllowed(tab.url)) return;
        
        // Apenas verificar URLs HTTP/HTTPS para bloqueio
        if (!tab.url.startsWith('http')) return;
        
        const data = await chrome.storage.local.get([STORAGE_KEYS.BLOCK_LISTS, STORAGE_KEYS.WHITELISTS]);
        const tabHostname = new URL(tab.url).hostname.replace(/^www\./, '');
        let shouldBlock = false;
        if (timerState.blockMode === 'whitelist') {
            const whitelists = data[STORAGE_KEYS.WHITELISTS] || [];
            const list = whitelists.find(l => l.id === timerState.associatedListId);
            const sitesToAllow = list ? list.sites : [];
            if (sitesToAllow.length > 0 && !sitesToAllow.includes(tabHostname)) shouldBlock = true;
        } else {
            const blockLists = data[STORAGE_KEYS.BLOCK_LISTS] || [];
            const list = blockLists.find(l => l.id === timerState.associatedListId);
            const sitesToBlock = list ? list.sites : [];
            if (sitesToBlock.some(blockedSite => tabHostname.includes(blockedSite))) shouldBlock = true;
        }
        if (shouldBlock) await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked/blocked.html') });
    } catch (error) { console.warn(`Could not check activated tab: ${error.message}`); }
});
async function synchronizeBlockingState() {
    try {
    const data = await chrome.storage.local.get([STORAGE_KEYS.TIMER_STATE, STORAGE_KEYS.BLOCK_LISTS]);
    const timerState = data[STORAGE_KEYS.TIMER_STATE];
    if (!timerState || !timerState.isActive || timerState.currentPhase === 'break' || timerState.blockMode === 'whitelist') {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
        return;
    }
    const blockLists = data[STORAGE_KEYS.BLOCK_LISTS] || [];
    const list = blockLists.find(l => l.id === timerState.associatedListId);
    if (!list || !list.sites || list.sites.length === 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID] });
        return;
    }
    const newRule = { id: BLOCK_RULE_ID, priority: 1, action: { type: 'redirect', redirect: { extensionPath: '/blocked/blocked.html' } }, condition: { requestDomains: list.sites, resourceTypes: ['main_frame'] } };
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_RULE_ID], addRules: [newRule] });
    } catch (error) {
        console.warn('[IzyFocus] synchronizeBlockingState falhou:', error.message);
    }
}

// --- INICIALIZAÇÃO E CICLO DE VIDA ---
synchronizeBlockingState();
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(null).then((result) => {
        if (!result.focusLists) {
            chrome.storage.local.set({
                focusLists: [{ id: 1, name: "Estudo Profundo", focusTime: 45, breakTime: 10, blockMode: 'blocklist', associatedListId: 1 }],
                blockLists: [{ id: 1, name: "Redes Sociais", sites: ["facebook.com", "twitter.com", "instagram.com", "youtube.com", "x.com"] }],
                whitelists: [{ id: 1, name: "Ferramentas de Trabalho", sites: ["docs.google.com", "github.com"] }],
                nextListId: 2, nextBlockListId: 2, nextWhiteListId: 2,
                gardenInventory: { seeds: 0, stones: 0 }, gardenLayout: {},
                focusLog: [], interruptLog: [], breakLog: []
            });
        }
    }).catch(error => console.warn('[IzyFocus] onInstalled init falhou:', error.message));
});
chrome.runtime.onStartup.addListener(async () => {
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        if (timerState && timerState.isActive) {
            const alarm = await chrome.alarms.get(ALARM_NAME);
            if (!alarm) await stopFocusSession(false);
        }
    } catch (error) {
        console.warn('[IzyFocus] onStartup falhou:', error.message);
    }
});

// --- OUVINTES DE MENSAGENS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'startFocus') startFocusSession(request.listId);
    else if (request.command === 'interruptFocus') stopFocusSession(true);
    else if (request.command === 'startNextSession') {
        const { sessionData } = request;
        if (sessionData && sessionData.listId) {
            startFocusSession(sessionData.listId);
        }
    }
    else if (request.command === 'finishSession') {
        stopFocusSession(false);
    }
    else if (request.command === 'getState') sendStateToPopup();
    else if (request.command === 'playSound') {
        playAudioInBackground(request.source);
    }
    else if (request.command === 'stopSound') {
        stopAudioInBackground();
    }
    else if (request.command === 'witherPlant') {
        handleWitherPlant();
    }
    return true; 
});

async function handleWitherPlant() {
    try {
    const data = await chrome.storage.local.get(['gardenLayout']);
    const gardenLayout = data.gardenLayout || {};

    // Encontrar a planta saudável mais recente
    let targetId = null;
    let latestTimestamp = 0;

    for (const [id, item] of Object.entries(gardenLayout)) {
        // Suporta formato antigo (string) e novo (objeto)
        const isTree = (typeof item === 'string' && item === 'tree') || (typeof item === 'object' && item.type === 'tree');
        const isHealthy = typeof item === 'object' ? (item.status !== 'withered') : true; // String antiga assume saudável
        const timestamp = typeof item === 'object' ? (item.plantedAt || 0) : 0;

        if (isTree && isHealthy) {
            if (timestamp >= latestTimestamp) {
                latestTimestamp = timestamp;
                targetId = id;
            }
        }
    }

    if (targetId !== null) {
        // Atualizar para formato de objeto se necessário e marcar como withered
        const item = gardenLayout[targetId];
        const newItem = typeof item === 'string'
            ? { type: 'tree', stage: 3, status: 'withered', plantedAt: Date.now() } // Migração fallback
            : { ...item, status: 'withered' };

        gardenLayout[targetId] = newItem;
        await chrome.storage.local.set({ gardenLayout });
        createNotification('Jardim Afetado!', 'Uma de suas plantas murchou devido à falta de foco. 🥀');
    }
    } catch (error) {
        console.warn('[IzyFocus] handleWitherPlant falhou:', error.message);
    }
}

async function sendStateToPopup() {
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        await chrome.runtime.sendMessage({ command: 'updateState', state: timerState });
    } catch (error) { /* Ignora se popup fechado */ }
}

// --- LÓGICA DO TIMER E SESSÃO ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        if (!timerState || !timerState.isActive) return;
        if (timerState.currentPhase === 'focus') {
            playNotificationSound('focus_complete.mp3');
            await startBreak(timerState);
        } else if (timerState.currentPhase === 'break') {
            playNotificationSound('break_complete.mp3');
            await logBreakCompletion(timerState);
            await chrome.alarms.clear(ALARM_NAME);
            await processCompletedSession(timerState);
            const completedState = { ...timerState, currentPhase: 'completed' };
            await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: completedState });
            sendStateToPopup();
        }
    } catch (error) {
        console.warn('[IzyFocus] onAlarm falhou:', error.message);
    }
});

async function startFocusSession(listId) {
    try {
        const { focusLists } = await chrome.storage.local.get('focusLists');
        const list = focusLists.find(l => l.id == listId);
        if (!list) return;

        const endTime = Date.now() + list.focusTime * 60 * 1000;
        const newState = { 
            isActive: true, listId: list.id, listName: list.name, 
            focusTime: list.focusTime, breakTime: list.breakTime, 
            blockMode: list.blockMode, associatedListId: list.associatedListId, 
            endTime, currentPhase: 'focus', startTime: Date.now()
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: newState });
        chrome.alarms.create(ALARM_NAME, { when: endTime });
        await synchronizeBlockingState();
        sendStateToPopup();
    } catch (error) {
        console.warn('[IzyFocus] startFocusSession falhou:', error.message);
    }
}

async function startBreak(prevState) {
    const endTime = Date.now() + prevState.breakTime * 60 * 1000;
    const breakState = { ...prevState, endTime, currentPhase: 'break' };
    await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: breakState });
    chrome.alarms.create(ALARM_NAME, { when: endTime });
    await synchronizeBlockingState();
    sendStateToPopup();
    createNotification('Hora da Pausa!', `Bom trabalho! Descanse por ${prevState.breakTime} minutos.`);
}

async function stopFocusSession(wasInterrupted) {
    try {
        if (wasInterrupted) {
            const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
            if (timerState && timerState.isActive) await logInterruption(timerState);
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: { isActive: false } });
        await synchronizeBlockingState();
        await stopAudioInBackground();
        await closeOffscreenDocument();
        chrome.alarms.clear(ALARM_NAME);
        sendStateToPopup();
    } catch (error) {
        console.warn('[IzyFocus] stopFocusSession falhou:', error.message);
    }
}

// --- LÓGICA DE GAMIFICAÇÃO E LOGS ---
async function processCompletedSession(sessionData) {
    try {
    const data = await chrome.storage.local.get(['focusLog', 'gardenInventory', 'userStats', 'achievements']);
    const newLogEntry = { id: Date.now(), timestamp: Date.now(), listName: sessionData.listName, focusTime: sessionData.focusTime };
    const updatedFocusLog = [...(data.focusLog || []), newLogEntry];

    // Update Inventory
    const updatedInventory = data.gardenInventory || { seeds: 0, stones: 0, xp: 0, pendingGrowth: 0 };
    updatedInventory.seeds = (updatedInventory.seeds || 0) + 1;
    updatedInventory.xp = (updatedInventory.xp || 0) + 50;
    updatedInventory.pendingGrowth = (updatedInventory.pendingGrowth || 0) + 1;

    // Update Stats
    const stats = data.userStats || { totalFocusMinutes: 0, totalSessions: 0, lastSessionDate: null, currentStreak: 0, maxStreak: 0 };
    stats.totalFocusMinutes = (stats.totalFocusMinutes || 0) + sessionData.focusTime;
    stats.totalSessions = (stats.totalSessions || 0) + 1;

    // Streak Logic
    const today = new Date().toDateString();
    if (stats.lastSessionDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (stats.lastSessionDate === yesterday) {
            stats.currentStreak++;
        } else {
            stats.currentStreak = 1; // Reset or Start
        }
        stats.lastSessionDate = today;
    }
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;

    // Check Achievements
    const unlockedAchievements = data.achievements || [];
    const newUnlocks = checkAchievements(stats, updatedInventory, unlockedAchievements);

    await chrome.storage.local.set({
        focusLog: updatedFocusLog,
        gardenInventory: updatedInventory,
        userStats: stats,
        achievements: newUnlocks.all
    });

    // Notify
    if (newUnlocks.new.length > 0) {
        newUnlocks.new.forEach(ach => {
            createNotification('🏆 Conquista Desbloqueada!', ach.title);
        });
    } else {
        createNotification(`Ciclo Concluído!`, `Você ganhou 1 Semente 🌱 e 50 XP ✨.`);
    }
    } catch (error) {
        console.warn('[IzyFocus] processCompletedSession falhou:', error.message);
    }
}

function checkAchievements(stats, inventory, unlockedIds) {
    const ACHIEVEMENTS = [
        { id: 'first_bloom', title: 'Primeiro Broto', desc: 'Complete 1 sessão', condition: () => stats.totalSessions >= 1 },
        { id: 'apprentice', title: 'Jardineiro Aprendiz', desc: 'Plante 5 sementes', condition: () => false }, // Logic needs gardenLayout access, skipping for simplicity or check inventory.seeds used? Let's use totalSessions for now.
        { id: 'consistency_3', title: 'Raízes Firmes', desc: '3 dias seguidos', condition: () => stats.currentStreak >= 3 },
        { id: 'deep_focus', title: 'Mestre do Tempo', desc: 'Acumule 500 min', condition: () => stats.totalFocusMinutes >= 500 },
        { id: 'level_5', title: 'Especialista', desc: 'Alcance o Nível 5', condition: () => (inventory.xp / 250) >= 4 } // Level 1 is 0xp, Level 5 is 1000xp? Formula is 1 + floor(xp/250). So Level 5 needs 1000xp.
    ];

    const currentIds = new Set(unlockedIds);
    const newUnlocks = [];

    ACHIEVEMENTS.forEach(ach => {
        if (!currentIds.has(ach.id) && ach.condition()) {
            currentIds.add(ach.id);
            newUnlocks.push(ach);
        }
    });

    return { all: Array.from(currentIds), new: newUnlocks };
}

async function logInterruption(sessionData) {
    try {
        const data = await chrome.storage.local.get(['interruptLog', 'gardenInventory']);
        const interruptLog = data.interruptLog || [];
        const newEntry = { timestamp: Date.now(), listName: sessionData.listName };
        const updatedInventory = data.gardenInventory || { seeds: 0, stones: 0 };
        updatedInventory.stones++;
        await chrome.storage.local.set({ interruptLog: [...interruptLog, newEntry], gardenInventory: updatedInventory });
        createNotification(`Ciclo Interrompido.`, `Você ganhou 1 Pedra 🪨.`);
    } catch (error) {
        console.warn('[IzyFocus] logInterruption falhou:', error.message);
    }
}

async function logBreakCompletion(sessionData) {
    try {
        const { breakLog = [] } = await chrome.storage.local.get('breakLog');
        const newEntry = { timestamp: Date.now(), breakTime: sessionData.breakTime };
        await chrome.storage.local.set({ breakLog: [...breakLog, newEntry] });
    } catch (error) {
        console.warn('[IzyFocus] logBreakCompletion falhou:', error.message);
    }
}

// --- UTILITÁRIOS DE ÁUDIO ---
async function playAudioInBackground(source) {
    try {
        await setupOffscreenDocument('offscreen.html');
        await new Promise(resolve => setTimeout(resolve, 100));
        await chrome.runtime.sendMessage({ command: 'offscreenPlay', source: source });
    } catch (error) {
        console.warn('[IzyFocus] playAudioInBackground falhou:', error.message);
    }
}
async function stopAudioInBackground() {
    try {
        if (await hasOffscreenDocument()) {
            await chrome.runtime.sendMessage({ command: 'offscreenStop' });
        }
    } catch (error) {
        console.warn('[IzyFocus] stopAudioInBackground falhou:', error.message);
    }
}
async function playNotificationSound(file) {
    try {
        await setupOffscreenDocument('offscreen.html');
        await chrome.runtime.sendMessage({ command: 'offscreenPlayNotification', source: `assets/sounds/${file}` });
    } catch (error) {
        console.warn('[IzyFocus] playNotificationSound falhou:', error.message);
    }
}
let creatingOffscreen;
async function hasOffscreenDocument() {
    try {
        if (chrome.runtime.getContexts) {
            const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
            return contexts.length > 0;
        }
    } catch (error) {
        console.warn('[IzyFocus] hasOffscreenDocument falhou:', error.message);
    }
    return false;
}
async function setupOffscreenDocument(path) {
    if (!chrome.offscreen) return;
    if (await hasOffscreenDocument()) return;
    if (creatingOffscreen) { await creatingOffscreen; return; }
    try {
        creatingOffscreen = chrome.offscreen.createDocument({ url: path, reasons: ['AUDIO_PLAYBACK'], justification: 'Tocar sons de notificação e áudio ambiente durante sessões de foco.' });
        await creatingOffscreen;
    } catch (error) {
        console.warn('[IzyFocus] setupOffscreenDocument falhou:', error.message);
    } finally {
        creatingOffscreen = null;
    }
}
async function closeOffscreenDocument() {
    if (!chrome.offscreen) return;
    try {
        if (await hasOffscreenDocument()) {
            await chrome.offscreen.closeDocument();
        }
    } catch (error) {
        console.warn('[IzyFocus] closeOffscreenDocument falhou:', error.message);
    }
}
function createNotification(title, message) {
    try {
        chrome.notifications.create({ type: 'basic', iconUrl: '/assets/icons/icon128.png', title, message });
    } catch (error) {
        console.warn('[IzyFocus] createNotification falhou:', error.message);
    }
}