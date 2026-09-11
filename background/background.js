const STORAGE_KEYS = { TIMER_STATE: 'timerState', FOCUS_LISTS: 'focusLists', BLOCK_LISTS: 'blockLists', WHITELISTS: 'whitelists' };
const ALARM_NAME = 'izyFocusTimer';
const BLOCK_RULE_ID = 1;
let lastPlayedSound = 'rain.mp3';

// --- MENU DE CONTEXTO ESTADOS E CONSTANTES ---
const CONTEXT_MENU_IDS = {
    PARENT: 'izy_focus_parent',
    BLOCK_PARENT: 'izy_focus_block_parent',
    WHITE_PARENT: 'izy_focus_white_parent',
    NEW_BLOCK: 'izy_focus_new_block',
    NEW_WHITE: 'izy_focus_new_white',
    BLOCK_ITEM_PREFIX: 'izy_focus_block_',
    WHITE_ITEM_PREFIX: 'izy_focus_white_'
};
let isSettingUpMenus = false;
let pendingMenuSetup = false;

const AUDIO_BASE_URL = 'https://izy-focus-assets.vercel.app';
const LOCAL_AUDIO_BASE = 'assets/sounds';

function getRemoteAudioUrl(source) {
    if (source.startsWith('http')) {
        return source;
    }
    const filename = source.split('/').pop();
    return `${AUDIO_BASE_URL}/${filename}`;
}

function getAudioSource(source) {
    if (!source) return '';
    if (source.startsWith('http') || source.startsWith('https')) return source;
    return source;
}

function isTimerCounting(timerState) {
    if (!timerState || !timerState.isActive) return false;
    if (timerState.currentPhase !== 'focus') return false;
    if (timerState.endTime && Date.now() >= timerState.endTime) return false;
    return true;
}

async function checkTimerExpiration(timerState) {
    if (!timerState || !timerState.isActive) return timerState;
    if (timerState.endTime && Date.now() >= timerState.endTime) {
        if (timerState.currentPhase === 'focus') {
            playNotificationSound('focus_complete.mp3');
            await startBreak(timerState);
            const { [STORAGE_KEYS.TIMER_STATE]: newState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
            return newState;
        } else if (timerState.currentPhase === 'break') {
            playNotificationSound('break_complete.mp3');
            await logBreakCompletion(timerState);
            await chrome.alarms.clear(ALARM_NAME);
            await processCompletedSession(timerState);
            const completedState = { ...timerState, currentPhase: 'completed' };
            await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: completedState });
            await synchronizeBlockingState();
            sendStateToPopup();
            return completedState;
        }
    }
    return timerState;
}

// URLs que sempre devem ser permitidas (não bloqueadas)
function isUrlAlwaysAllowed(url) {
    if (!url) return false;
    
    // URLs do Chrome extension atual
    const extensionUrl = `chrome-extension://${chrome.runtime.id}`;
    if (url.startsWith(extensionUrl)) return true;
    
    // Notificações de extensões do Chrome (qualquer página da extensão específica)
    if (url.startsWith('chrome-extension://hkhggnncdpfibdhinjiegagmopldibha/')) return true;
    
    // Arquivos locais (file://)
    if (url.startsWith('file://')) return true;
    
    // Arquivos PDF locais
    if (url.toLowerCase().endsWith('.pdf')) return true;
    
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
    let { [STORAGE_KEYS.TIMER_STATE]: timerState, [STORAGE_KEYS.WHITELISTS]: whitelists } = await chrome.storage.local.get([STORAGE_KEYS.TIMER_STATE, STORAGE_KEYS.WHITELISTS]);
    timerState = await checkTimerExpiration(timerState);
    if (!isTimerCounting(timerState) || timerState.blockMode !== 'whitelist') return;
    const list = (whitelists || []).find(l => l.id === timerState.associatedListId);
    if (!list || !list.sites || list.sites.length === 0) return;
    
    // Verificar se a URL deve ser sempre permitida
    if (isUrlAlwaysAllowed(tab.url)) return;
    
    const tabHostname = new URL(tab.url).hostname.replace(/^www\./, '');
    if (!list.sites.includes(tabHostname)) {
        try { await chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked/blocked.html') }); } catch (error) { console.warn(`Error updating tab: ${error.message}`); }
    }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
    timerState = await checkTimerExpiration(timerState);
    if (!isTimerCounting(timerState)) return;
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
    let timerState = data[STORAGE_KEYS.TIMER_STATE];
    timerState = await checkTimerExpiration(timerState);
    if (!isTimerCounting(timerState) || timerState.blockMode === 'whitelist') {
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
setupContextMenus();
chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus();
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
        setupContextMenus();
        let { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        timerState = await checkTimerExpiration(timerState);
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
    if (!request || !request.command) return false;

    if (request.command === 'getState') {
        chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE).then(data => {
            let timerState = data[STORAGE_KEYS.TIMER_STATE];
            sendResponse({ state: timerState });
            if (timerState) {
                checkTimerExpiration(timerState).catch(err => console.warn('[IzyFocus] checkTimerExpiration error:', err));
            }
        }).catch(err => {
            sendResponse({ state: null, error: err.message });
        });
        return true;
    }
    
    if (request.command === 'getSoundState') {
        chrome.storage.local.get('soundEnabled').then(data => {
            sendResponse({ command: 'updateSoundState', enabled: data.soundEnabled !== false });
        }).catch(err => {
            sendResponse({ command: 'updateSoundState', enabled: true, error: err.message });
        });
        return true;
    }

    if (request.command === 'startFocus') {
        startFocusSession(request.listId, request.dayIntention);
    } else if (request.command === 'interruptFocus') {
        console.log('[IzyFocus] interruptFocus received');
        stopFocusSession(true);
    } else if (request.command === 'startNextSession') {
        const { sessionData } = request;
        if (sessionData && sessionData.listId) {
            startFocusSession(sessionData.listId);
        }
    } else if (request.command === 'finishSession') {
        stopFocusSession(false);
    } else if (request.command === 'playSound') {
        playAudioInBackground(request.source);
    } else if (request.command === 'stopSound') {
        stopAudioInBackground();
    } else if (request.command === 'toggleSound') {
        toggleSound();
    } else if (request.command === 'witherPlant') {
        console.log('[IzyFocus] Handling witherPlant command');
        handleWitherPlant();
    } else if (request.command === 'setVolume') {
        setAudioVolume(request.volume);
    }

    return false;
});

async function handleWitherPlant() {
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        if (!isTimerCounting(timerState)) {
            console.log('[IzyFocus] handleWitherPlant skipped because timer is not counting');
            return;
        }
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
            createNotification(chrome.i18n.getMessage('notif_wither_title'), chrome.i18n.getMessage('notif_wither_message'));
        }
    } catch (error) {
        console.warn('[IzyFocus] handleWitherPlant falhou:', error.message);
    }
}

async function sendStateToPopup() {
    try {
        const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
        console.log('[IzyFocus] sendStateToPopup:', timerState);
        chrome.runtime.sendMessage({ command: 'updateState', state: timerState }).catch(() => {});
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
            await synchronizeBlockingState();
            sendStateToPopup();
        }
    } catch (error) {
        console.warn('[IzyFocus] onAlarm falhou:', error.message);
    }
});

async function startFocusSession(listId, dayIntention = '') {
    try {
        const { focusLists } = await chrome.storage.local.get('focusLists');
        const list = focusLists.find(l => l.id == listId);
        if (!list) return;

        const endTime = Date.now() + list.focusTime * 60 * 1000;
        const newState = { 
            isActive: true, listId: list.id, listName: list.name, 
            focusTime: list.focusTime, breakTime: list.breakTime, 
            blockMode: list.blockMode, associatedListId: list.associatedListId, 
            endTime, currentPhase: 'focus', startTime: Date.now(),
            dayIntention: dayIntention
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.TIMER_STATE]: newState });
        
        if (dayIntention) {
            await chrome.storage.local.set({ currentSessionIntention: dayIntention });
        }
        
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
    createNotification(chrome.i18n.getMessage('notif_break_title'), chrome.i18n.getMessage('notif_break_message', [String(prevState.breakTime)]));
}

async function stopFocusSession(wasInterrupted) {
    console.log('[IzyFocus] stopFocusSession called, interrupted:', wasInterrupted);
    try {
        if (wasInterrupted) {
            const { [STORAGE_KEYS.TIMER_STATE]: timerState } = await chrome.storage.local.get(STORAGE_KEYS.TIMER_STATE);
            if (timerState && timerState.isActive) await logInterruption(timerState);
        }
        await chrome.storage.local.set({ 
            [STORAGE_KEYS.TIMER_STATE]: { isActive: false },
            currentSessionIntention: ''
        });
        await synchronizeBlockingState();
        
        try { await stopAudioInBackground(); } catch(e) {}
        try { await closeOffscreenDocument(); } catch(e) {}
        
        chrome.alarms.clear(ALARM_NAME);
        
        console.log('[IzyFocus] Calling sendStateToPopup');
        sendStateToPopup();
        
        console.log('[IzyFocus] stopFocusSession complete');
    } catch (error) {
        console.error('[IzyFocus] stopFocusSession error:', error.message);
    }
}

// --- LÓGICA DE GAMIFICAÇÃO E LOGS ---
async function processCompletedSession(sessionData) {
    try {
    const data = await chrome.storage.local.get(['focusLog', 'gardenInventory', 'userStats', 'achievements', 'gardenLayout', 'currentSessionIntention']);
    const newLogEntry = { 
        id: Date.now(), 
        timestamp: Date.now(), 
        listName: sessionData.listName, 
        focusTime: sessionData.focusTime,
        dayIntention: data.currentSessionIntention || ''
    };
    const updatedFocusLog = [...(data.focusLog || []), newLogEntry];

    // Update Inventory
    const updatedInventory = data.gardenInventory || { seeds: 0, stones: 0, xp: 0, pendingGrowth: 0, spentSeeds: 0 };
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
    const newUnlocks = checkAchievements(stats, updatedInventory, unlockedAchievements, data.gardenLayout || {});

    await chrome.storage.local.set({
        focusLog: updatedFocusLog,
        gardenInventory: updatedInventory,
        userStats: stats,
        achievements: newUnlocks.all
    });

    // Notify
    if (newUnlocks.new.length > 0) {
        newUnlocks.new.forEach(ach => {
            createNotification(chrome.i18n.getMessage('notif_achievement_title'), ach.title);
        });
    } else {
        createNotification(chrome.i18n.getMessage('notif_cycle_completed_title'), chrome.i18n.getMessage('notif_cycle_completed_message'));
    }
    } catch (error) {
        console.warn('[IzyFocus] processCompletedSession falhou:', error.message);
    }
}

function checkAchievements(stats, inventory, unlockedIds, gardenLayout = {}) {
    let floweringTrees = 0;
    for (const item of Object.values(gardenLayout)) {
        if (item.type === 'tree' && item.stage >= 4) floweringTrees++;
    }

    const ACHIEVEMENTS = [
        { id: 'first_bloom', title: chrome.i18n.getMessage('achievement_first_bloom_title'), desc: chrome.i18n.getMessage('achievement_first_bloom_desc'), condition: () => stats.totalSessions >= 1 },
        { id: 'apprentice', title: chrome.i18n.getMessage('achievement_first_bloom_title'), desc: chrome.i18n.getMessage('achievement_first_bloom_desc'), condition: () => false },
        { id: 'consistency_3', title: chrome.i18n.getMessage('achievement_consistency_3_title'), desc: chrome.i18n.getMessage('achievement_consistency_3_desc'), condition: () => stats.currentStreak >= 3 },
        { id: 'deep_focus', title: chrome.i18n.getMessage('achievement_deep_focus_title'), desc: chrome.i18n.getMessage('achievement_deep_focus_desc'), condition: () => stats.totalFocusMinutes >= 500 },
        { id: 'level_5', title: chrome.i18n.getMessage('achievement_level_5_title'), desc: chrome.i18n.getMessage('achievement_level_5_desc'), condition: () => (inventory.xp / 250) >= 4 },
        { id: 'seed_collector_10', title: chrome.i18n.getMessage('achievement_seed_collector_10_title'), desc: chrome.i18n.getMessage('achievement_seed_collector_10_desc'), condition: () => (inventory.seeds || 0) + (inventory.spentSeeds || 0) >= 10 },
        { id: 'seed_collector_50', title: chrome.i18n.getMessage('achievement_seed_collector_50_title'), desc: chrome.i18n.getMessage('achievement_seed_collector_50_desc'), condition: () => (inventory.seeds || 0) + (inventory.spentSeeds || 0) >= 50 },
        { id: 'seed_collector_100', title: chrome.i18n.getMessage('achievement_seed_collector_100_title'), desc: chrome.i18n.getMessage('achievement_seed_collector_100_desc'), condition: () => (inventory.seeds || 0) + (inventory.spentSeeds || 0) >= 100 },
        { id: 'xp_500', title: chrome.i18n.getMessage('achievement_xp_500_title'), desc: chrome.i18n.getMessage('achievement_xp_500_desc'), condition: () => (inventory.xp || 0) >= 500 },
        { id: 'xp_1000', title: chrome.i18n.getMessage('achievement_xp_1000_title'), desc: chrome.i18n.getMessage('achievement_xp_1000_desc'), condition: () => (inventory.xp || 0) >= 1000 },
        { id: 'xp_2500', title: chrome.i18n.getMessage('achievement_xp_2500_title'), desc: chrome.i18n.getMessage('achievement_xp_2500_desc'), condition: () => (inventory.xp || 0) >= 2500 },
        { id: 'streak_7', title: chrome.i18n.getMessage('achievement_streak_7_title'), desc: chrome.i18n.getMessage('achievement_streak_7_desc'), condition: () => stats.currentStreak >= 7 },
        { id: 'streak_14', title: chrome.i18n.getMessage('achievement_streak_14_title'), desc: chrome.i18n.getMessage('achievement_streak_14_desc'), condition: () => stats.currentStreak >= 14 },
        { id: 'streak_30', title: chrome.i18n.getMessage('achievement_streak_30_title'), desc: chrome.i18n.getMessage('achievement_streak_30_desc'), condition: () => stats.currentStreak >= 30 },
        { id: 'garden_bloom', title: chrome.i18n.getMessage('achievement_garden_bloom_title'), desc: chrome.i18n.getMessage('achievement_garden_bloom_desc'), condition: () => floweringTrees >= 10 }
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
        const data = await chrome.storage.local.get(['interruptLog', 'gardenInventory', 'currentSessionIntention']);
        const interruptLog = data.interruptLog || [];
        const newEntry = { 
            timestamp: Date.now(), 
            listName: sessionData.listName,
            dayIntention: data.currentSessionIntention || ''
        };
        const updatedInventory = data.gardenInventory || { seeds: 0, stones: 0 };
        updatedInventory.stones++;
        await chrome.storage.local.set({ interruptLog: [...interruptLog, newEntry], gardenInventory: updatedInventory });
        createNotification(chrome.i18n.getMessage('notif_interrupted_title'), chrome.i18n.getMessage('notif_interrupted_message'));
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
async function playAudioInBackground(source, volume) {
    lastPlayedSound = source;
    try {
        const data = await chrome.storage.local.get(['soundEnabled', 'soundVolume']);
        if (data.soundEnabled === false) {
            console.log('[IzyFocus] Sound disabled');
            return;
        }
        const savedVolume = data.soundVolume !== undefined ? data.soundVolume / 100 : (volume || 0.5);
        
        const audioSource = getAudioSource(source);
        console.log('[IzyFocus] playAudio source:', source, '-> resolved:', audioSource);
        
        await setupOffscreenDocument('offscreen.html');
        
        const offscreenSource = (source.startsWith('http') || source.startsWith('chrome-extension://')) 
            ? source 
            : `assets/sounds/${source}`;
        console.log('[IzyFocus] sending to offscreen:', offscreenSource);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        await chrome.runtime.sendMessage({ command: 'offscreenPlay', source: offscreenSource, volume: savedVolume }).catch(() => {});
        
        await chrome.storage.local.set({ audioPlaybackState: { isPlaying: true, source: audioSource } });
        chrome.runtime.sendMessage({ command: 'updatePlaybackState', isPlaying: true }).catch(() => {});
    } catch (error) {
        console.warn('[IzyFocus] playAudioInBackground falhou:', error.message);
    }
}

async function stopAudioInBackground() {
    try {
        if (await hasOffscreenDocument()) {
            await chrome.runtime.sendMessage({ command: 'offscreenStop' }).catch(() => {});
        }
        await chrome.storage.local.set({ audioPlaybackState: { isPlaying: false, source: null } });
        chrome.runtime.sendMessage({ command: 'updatePlaybackState', isPlaying: false }).catch(() => {});
    } catch (error) {
        console.warn('[IzyFocus] stopAudioInBackground falhou:', error.message);
    }
}

async function setAudioVolume(volume) {
    try {
        if (await hasOffscreenDocument()) {
            await chrome.runtime.sendMessage({ command: 'offscreenSetVolume', volume }).catch(() => {});
        }
    } catch (error) {
        console.warn('[IzyFocus] setAudioVolume falhou:', error.message);
    }
}

async function toggleSound() {
    try {
        const data = await chrome.storage.local.get('soundEnabled');
        const currentlyEnabled = data.soundEnabled !== false;
        const newState = !currentlyEnabled;
        
        await chrome.storage.local.set({ soundEnabled: newState });
        
        if (!newState && lastPlayedSound) {
            await stopAudioInBackground();
        } else if (newState && lastPlayedSound) {
            await playAudioInBackground(lastPlayedSound);
        }
        
        console.log('[IzyFocus] Sound toggled:', newState ? 'ON' : 'OFF');
    } catch (error) {
        console.warn('[IzyFocus] toggleSound falhou:', error.message);
    }
}

async function playNotificationSound(file) {
    try {
        const remoteSource = getAudioSource(`assets/sounds/${file}`);
        console.log('[IzyFocus] Playing remote notification:', remoteSource);
        
        await setupOffscreenDocument('offscreen.html');
        await chrome.runtime.sendMessage({ command: 'offscreenPlayNotification', source: remoteSource, volume: 0.8 }).catch(() => {});
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

// --- MENU DE CONTEXTO (CLIQUE DIREITO) ---
async function setupContextMenus() {
    if (!chrome.contextMenus) return;

    if (isSettingUpMenus) {
        pendingMenuSetup = true;
        return;
    }

    isSettingUpMenus = true;
    try {
        await new Promise(resolve => {
            chrome.contextMenus.removeAll(() => {
                if (chrome.runtime.lastError) {}
                resolve();
            });
        });

        const { blockLists = [], whitelists = [] } = await chrome.storage.local.get(['blockLists', 'whitelists']);

        const createMenuSafe = (createProperties) => {
            return new Promise(resolve => {
                chrome.contextMenus.create(createProperties, () => {
                    if (chrome.runtime.lastError) {}
                    resolve();
                });
            });
        };

        // Item Pai: Izy Focus
        const parentTitle = chrome.i18n.getMessage('context_menu_parent') || 'Izy Focus';
        await createMenuSafe({
            id: CONTEXT_MENU_IDS.PARENT,
            title: parentTitle,
            contexts: ['page', 'link']
        });

        // Submenu: Adicionar a Blocklist
        const blockTitle = chrome.i18n.getMessage('context_menu_add_blocklist') || '🚫 Adicionar a Blocklist';
        await createMenuSafe({
            id: CONTEXT_MENU_IDS.BLOCK_PARENT,
            parentId: CONTEXT_MENU_IDS.PARENT,
            title: blockTitle,
            contexts: ['page', 'link']
        });

        // Listar Blocklists existentes
        for (const list of blockLists) {
            await createMenuSafe({
                id: `${CONTEXT_MENU_IDS.BLOCK_ITEM_PREFIX}${list.id}`,
                parentId: CONTEXT_MENU_IDS.BLOCK_PARENT,
                title: list.name,
                contexts: ['page', 'link']
            });
        }

        // Item: + Nova Blocklist...
        const newBlockTitle = chrome.i18n.getMessage('context_menu_new_blocklist') || '➕ Nova Blocklist...';
        await createMenuSafe({
            id: CONTEXT_MENU_IDS.NEW_BLOCK,
            parentId: CONTEXT_MENU_IDS.BLOCK_PARENT,
            title: newBlockTitle,
            contexts: ['page', 'link']
        });

        // Submenu: Adicionar a Whitelist
        const whiteTitle = chrome.i18n.getMessage('context_menu_add_whitelist') || '✅ Adicionar a Whitelist';
        await createMenuSafe({
            id: CONTEXT_MENU_IDS.WHITE_PARENT,
            parentId: CONTEXT_MENU_IDS.PARENT,
            title: whiteTitle,
            contexts: ['page', 'link']
        });

        // Listar Whitelists existentes
        for (const list of whitelists) {
            await createMenuSafe({
                id: `${CONTEXT_MENU_IDS.WHITE_ITEM_PREFIX}${list.id}`,
                parentId: CONTEXT_MENU_IDS.WHITE_PARENT,
                title: list.name,
                contexts: ['page', 'link']
            });
        }

        // Item: + Nova Whitelist...
        const newWhiteTitle = chrome.i18n.getMessage('context_menu_new_whitelist') || '➕ Nova Whitelist...';
        await createMenuSafe({
            id: CONTEXT_MENU_IDS.NEW_WHITE,
            parentId: CONTEXT_MENU_IDS.WHITE_PARENT,
            title: newWhiteTitle,
            contexts: ['page', 'link']
        });

    } catch (error) {
        console.warn('[IzyFocus] setupContextMenus falhou:', error.message);
    } finally {
        isSettingUpMenus = false;
        if (pendingMenuSetup) {
            pendingMenuSetup = false;
            setupContextMenus();
        }
    }
}

function extractDomainFromUrl(rawUrl) {
    if (!rawUrl) return null;
    if (isUrlAlwaysAllowed(rawUrl)) return null;

    try {
        const urlObj = new URL(rawUrl);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return null;
        let hostname = urlObj.hostname.toLowerCase().trim();
        hostname = hostname.replace(/^www\./, '');
        return hostname || null;
    } catch (e) {
        return null;
    }
}

async function handleContextMenuClick(info, tab) {
    const menuItemId = info.menuItemId;
    if (!menuItemId || typeof menuItemId !== 'string' || !menuItemId.startsWith('izy_focus_')) return;

    const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
    const domain = extractDomainFromUrl(targetUrl);

    if (!domain) {
        createNotification('Izy Focus', chrome.i18n.getMessage('context_menu_invalid_url') || 'Não é possível adicionar esta página.');
        return;
    }

    if (menuItemId === CONTEXT_MENU_IDS.NEW_BLOCK) {
        await addDomainToNewList('block', domain);
    } else if (menuItemId === CONTEXT_MENU_IDS.NEW_WHITE) {
        await addDomainToNewList('white', domain);
    } else if (menuItemId.startsWith(CONTEXT_MENU_IDS.BLOCK_ITEM_PREFIX)) {
        const listId = parseInt(menuItemId.replace(CONTEXT_MENU_IDS.BLOCK_ITEM_PREFIX, ''), 10);
        await addDomainToExistingList('block', listId, domain);
    } else if (menuItemId.startsWith(CONTEXT_MENU_IDS.WHITE_ITEM_PREFIX)) {
        const listId = parseInt(menuItemId.replace(CONTEXT_MENU_IDS.WHITE_ITEM_PREFIX, ''), 10);
        await addDomainToExistingList('white', listId, domain);
    }
}

async function addDomainToExistingList(type, listId, domain) {
    const isBlock = type === 'block';
    const key = isBlock ? 'blockLists' : 'whitelists';
    const data = await chrome.storage.local.get(key);
    const lists = data[key] || [];
    const listIndex = lists.findIndex(l => l.id === listId);

    if (listIndex === -1) return;

    const list = lists[listIndex];
    if (list.sites.includes(domain)) {
        const msg = chrome.i18n.getMessage('context_menu_already_exists', [domain, list.name]) || `O site "${domain}" já está na lista "${list.name}".`;
        createNotification('Izy Focus', msg);
        return;
    }

    list.sites = [...list.sites, domain];
    lists[listIndex] = list;

    await chrome.storage.local.set({ [key]: lists });
    await synchronizeBlockingState();

    const successMsg = chrome.i18n.getMessage('context_menu_site_added', [domain, list.name]) || `Site "${domain}" adicionado à lista "${list.name}".`;
    createNotification('Izy Focus', successMsg);
}

async function addDomainToNewList(type, domain) {
    const isBlock = type === 'block';
    const key = isBlock ? 'blockLists' : 'whitelists';
    const nextIdKey = isBlock ? 'nextBlockListId' : 'nextWhiteListId';
    const defaultNameKey = isBlock ? 'context_menu_new_blocklist_default_name' : 'context_menu_new_whitelist_default_name';

    const data = await chrome.storage.local.get([key, nextIdKey]);
    const lists = data[key] || [];
    let nextId = data[nextIdKey];
    if (!nextId) {
        nextId = lists.length > 0 ? Math.max(...lists.map(l => l.id)) + 1 : 1;
    }

    const defaultName = chrome.i18n.getMessage(defaultNameKey) || (isBlock ? 'Nova Blocklist' : 'Nova Whitelist');
    const newListName = `${defaultName} ${nextId}`;

    const newList = {
        id: nextId,
        name: newListName,
        sites: [domain]
    };

    const updatedLists = [...lists, newList];
    await chrome.storage.local.set({
        [key]: updatedLists,
        [nextIdKey]: nextId + 1
    });

    await synchronizeBlockingState();

    const successMsg = chrome.i18n.getMessage('context_menu_site_added', [domain, newListName]) || `Site "${domain}" adicionado à lista "${newListName}".`;
    createNotification('Izy Focus', successMsg);
}

// Ouvintes de alteração de storage e cliques no menu de contexto
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.blockLists || changes.whitelists) {
            setupContextMenus();
        }
    }
});

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
}