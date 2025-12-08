document.addEventListener('DOMContentLoaded', async () => {
    try {
        await chrome.runtime.sendMessage({ command: 'witherPlant' });
        console.log('Wither command sent.');
    } catch (error) {
        console.error('Failed to send wither command:', error);
    }
});
