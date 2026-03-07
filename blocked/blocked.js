document.addEventListener('DOMContentLoaded', async () => {
    // --- i18n ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });
    const titleMsg = chrome.i18n.getMessage('blocked_title');
    if (titleMsg) document.title = titleMsg;

    try {
        await chrome.runtime.sendMessage({ command: 'witherPlant' });
        console.log('Wither command sent.');
    } catch (error) {
        console.error('Failed to send wither command:', error);
    }
});
