document.addEventListener('DOMContentLoaded', () => {
    // Envia uma mensagem para o background script para aplicar a penalidade.
    chrome.runtime.sendMessage({ command: 'applyGardenPenalty' });
});
