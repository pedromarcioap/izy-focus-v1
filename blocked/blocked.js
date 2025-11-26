document.addEventListener('DOMContentLoaded', () => {
    // Esta verificação garante que a mensagem só seja enviada uma vez por visita à página
    // para evitar múltiplas penalidades se a página for recarregada.
    if (!sessionStorage.getItem('penalty_applied')) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ command: 'applyGardenPenalty' });
            sessionStorage.setItem('penalty_applied', 'true');
        }
    }
});
