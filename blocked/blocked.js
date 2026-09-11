document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });
    const titleMsg = chrome.i18n.getMessage('blocked_title');
    if (titleMsg) document.title = titleMsg;

    const intentionTextEl = document.getElementById('intention-text');
    
    try {
        const data = await chrome.storage.local.get(['currentSessionIntention', 'dayIntention', 'timerState']);
        const intention = data.currentSessionIntention || data.dayIntention || 'Izy Focus';
        
        if (intentionTextEl) {
            intentionTextEl.textContent = intention;
            console.log('[IzyFocus] Intention displayed:', intention);
        }
    } catch (error) {
        console.error('[IzyFocus] Failed to load intention:', error);
        if (intentionTextEl) {
            intentionTextEl.textContent = 'Izy Focus';
        }
    }

    try {
        chrome.runtime.sendMessage({ command: 'witherPlant' }).catch(() => {});
    } catch (error) {
        console.error('Failed to send wither command:', error);
    }
});