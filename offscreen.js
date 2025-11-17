// Função para lidar com a reprodução de áudio ambiente
function playAmbientAudio(source) {
    const audioPlayer = document.getElementById('ambient-player');
    const audioUrl = chrome.runtime.getURL(source);
    if (audioPlayer.src === audioUrl && !audioPlayer.paused) return;
    audioPlayer.src = audioUrl;
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            audioPlayer.addEventListener('canplaythrough', () => {
                audioPlayer.play().catch(e => console.error("Erro ao tocar áudio ambiente:", e));
            }, { once: true });
        });
    }
}

// Função para parar o áudio ambiente
function stopAmbientAudio() {
    const audioPlayer = document.getElementById('ambient-player');
    audioPlayer.pause();
    audioPlayer.src = '';
}

// Função para tocar sons de notificação (curtos)
function playNotificationAudio(source) {
    const audioPlayer = document.getElementById('notification-player');
    audioPlayer.src = chrome.runtime.getURL(source);
    audioPlayer.play().catch(e => console.error("Erro ao tocar notificação:", e));
}

// Ouvinte de mensagens principal
chrome.runtime.onMessage.addListener((request) => {
    if (request.command === 'offscreenPlay') {
        playAmbientAudio(request.source);
    } else if (request.command === 'offscreenStop') {
        stopAmbientAudio();
    } else if (request.command === 'offscreenPlayNotification') {
        playNotificationAudio(request.source);
    }
});