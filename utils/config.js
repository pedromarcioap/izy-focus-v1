// ============================================
// Izy Focus - Configuração de API
// ============================================
// Preencha os valores abaixo com suas credenciais do Google Cloud Console
// Para criar credenciais: https://console.cloud.google.com/

const APP_CONFIG = {
    // Google Drive API - OAuth 2.0
    GOOGLE: {
        CLIENT_ID: '318877621394-nsls7hatdqbrmv81b6n7t4af701g71gs.apps.googleusercontent.com',
        SCOPES: 'https://www.googleapis.com/auth/drive.file'
    },

    // Configurações da extensão
    EXTENSION: {
        NAME: 'Izy Focus',
        VERSION: '1.1'
    },

    // URLs de Áudio Remoto (Vercel Edge)
    AUDIO: {
        BASE_URL: 'https://izy-focus-assets.vercel.app',
        SOUNDS: {
            RAIN: 'rain.mp3',
            FOREST: 'forest.mp3',
            FOCUS_DEEP: 'focus-deep.mp3',
            FOCUS_FLOW: 'focus-flow.mp3',
            FOCUS_COMPLETE: 'focus_complete.mp3',
            BREAK_COMPLETE: 'break_complete.mp3'
        }
    }
};

// Verifica se a configuração está completa
if (APP_CONFIG.GOOGLE.CLIENT_ID === '318877621394-nsls7hatdqbrmv81b6n7t4af701g71gs.apps.googleusercontent.com') {
    console.warn('[IzyFocus] ATENÇÃO: Configure seu GOOGLE_CLIENT_ID no arquivo config.js');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}
