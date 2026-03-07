// --- CONFIGURAÇÃO E CONSTANTES ---
const GARDEN_CONFIG = {
    GRID_SIZE: 100, // 10x10
    GROWTH_PER_CYCLE: 1, // Quanto cada planta cresce por "ciclo" de crescimento global
    MAX_STAGE: 4, // 1=Sprout, 2=Small, 3=Big, 4=Flowering
    LEVEL_BASE_XP: 250, // Updated to 250 as requested
};

// --- CLASSES ---

class GardenState {
    constructor() {
        this.inventory = { seeds: 0, stones: 0, xp: 0, pendingGrowth: 0 };
        this.layout = {};
    }

    async load() {
        try {
            const data = await chrome.storage.local.get(['gardenInventory', 'gardenLayout']);

            const rawInventory = data.gardenInventory || {};
            this.inventory = {
                seeds: Number(rawInventory.seeds) || 0,
                stones: Number(rawInventory.stones) || 0,
                xp: Number(rawInventory.xp) || 0,
                pendingGrowth: Number(rawInventory.pendingGrowth) || 0
            };

            this.layout = this._migrateLayout(data.gardenLayout || {});

            if (this.inventory.pendingGrowth > 0) {
                this._processGrowth(this.inventory.pendingGrowth);
                this.inventory.pendingGrowth = 0;
                await this.save();
            }
        } catch (error) {
            // [FIX] Se o storage estiver corrompido, reseta para estado seguro
            console.warn('[IzyFocus] garden load falhou, usando estado padrão:', error.message);
            this.inventory = { seeds: 0, stones: 0, xp: 0, pendingGrowth: 0 };
            this.layout = {};
        }
    }

    startAutoRefresh(renderer) {
        // Listen for storage changes to update XP in real-time
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.gardenInventory) {
                const newInv = changes.gardenInventory.newValue;
                this.inventory.xp = Number(newInv.xp) || 0;
                // Seeds and stones might change too
                this.inventory.seeds = Number(newInv.seeds) || 0;
                this.inventory.stones = Number(newInv.stones) || 0;
                renderer.render(this);
            }
        });
    }

    async save() {
        try {
            await chrome.storage.local.set({
                gardenInventory: this.inventory,
                gardenLayout: this.layout
            });
        } catch (error) {
            console.warn('[IzyFocus] garden save falhou:', error.message);
        }
    }

    _migrateLayout(oldLayout) {
        // [FIX] Garante que oldLayout é um objeto válido antes de iterar
        if (!oldLayout || typeof oldLayout !== 'object' || Array.isArray(oldLayout)) {
            return {};
        }
        const newLayout = {};
        for (const [id, item] of Object.entries(oldLayout)) {
            const numId = Number(id);
            if (isNaN(numId) || numId < 0 || numId >= GARDEN_CONFIG.GRID_SIZE) continue;

            if (typeof item === 'string') {
                if (item === 'tree') {
                    newLayout[id] = { type: 'tree', stage: 3, status: 'healthy', plantedAt: Date.now() };
                } else if (item === 'stone') {
                    newLayout[id] = { type: 'stone', status: 'healthy', plantedAt: Date.now() };
                }
            } else if (typeof item === 'object' && item !== null) {
                // [FIX] Valida campos obrigatórios e sanitiza stage para evitar NaN
                if (item.type === 'tree') {
                    newLayout[id] = {
                        type: 'tree',
                        stage: Math.max(1, Math.min(GARDEN_CONFIG.MAX_STAGE, Number(item.stage) || 1)),
                        status: (item.status === 'withered') ? 'withered' : 'healthy',
                        plantedAt: Number(item.plantedAt) || Date.now()
                    };
                } else if (item.type === 'stone') {
                    newLayout[id] = {
                        type: 'stone',
                        status: 'healthy',
                        plantedAt: Number(item.plantedAt) || Date.now()
                    };
                }
            }
            // Números, booleans, null, e tipos inválidos são ignorados (limpeza automática)
        }
        return newLayout;
    }

    _processGrowth(cycles) {
        let changed = false;
        for (const id in this.layout) {
            const item = this.layout[id];
            if (item.type === 'tree' && item.status !== 'withered' && item.stage < GARDEN_CONFIG.MAX_STAGE) {
                // Chance de crescimento ou crescimento determinístico? Vamos determinístico.
                item.stage = Math.min(GARDEN_CONFIG.MAX_STAGE, item.stage + cycles);
                changed = true;
            }
        }
        return changed;
    }

    plantSeed(cellId) {
        if (!Number.isInteger(this.inventory.seeds) || this.inventory.seeds <= 0) return false;
        if (this.layout[cellId]) return false;

        this.inventory.seeds--;
        this.layout[cellId] = {
            type: 'tree',
            stage: 1, // Começa como broto (Stage 1)
            status: 'healthy',
            plantedAt: Date.now()
        };
        return true;
    }

    placeStone(cellId) {
        if (!Number.isInteger(this.inventory.stones) || this.inventory.stones <= 0) return false;
        if (this.layout[cellId]) return false;

        this.inventory.stones--;
        this.layout[cellId] = { type: 'stone', status: 'healthy', plantedAt: Date.now() };
        return true;
    }

    removeItem(cellId) {
        if (!this.layout[cellId]) return false;
        const item = this.layout[cellId];

        // Recuperar recursos apenas se a planta estiver saudável
        if (item.type === 'tree') {
            if (item.status !== 'withered') {
                this.inventory.seeds++;
            }
        } else if (item.type === 'stone') {
            this.inventory.stones++;
        }

        delete this.layout[cellId];
        return true;
    }

    getLevelInfo() {
        // Nível 1: 0-249 XP
        // Nível 2: 250-499 XP
        const xpPerLevel = GARDEN_CONFIG.LEVEL_BASE_XP;
        const level = 1 + Math.floor(this.inventory.xp / xpPerLevel);
        const nextLevelXp = level * xpPerLevel;
        const currentLevelBaseXp = (level - 1) * xpPerLevel;
        const progress = ((this.inventory.xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100;

        return { level, xp: this.inventory.xp, nextLevelXp, progress };
    }
}

class GardenRenderer {
    constructor(gridId) {
        this.gridEl = document.getElementById(gridId);
        this.elements = {
            seedCount: document.getElementById('seed-count'),
            stoneCount: document.getElementById('stone-count'),
            level: document.getElementById('level-display'),
            xpBar: document.getElementById('xp-bar-fill'),
            xpValue: document.getElementById('xp-value'),
            toolSeed: document.getElementById('tool-seed'),
            toolStone: document.getElementById('tool-stone')
        };
    }

    render(state) {
        this._renderInventory(state.inventory);
        this._renderStats(state.getLevelInfo());
        this._renderGrid(state.layout);
    }

    _renderInventory(inventory) {
        this.elements.seedCount.textContent = inventory.seeds;
        this.elements.stoneCount.textContent = inventory.stones;

        this.elements.toolSeed.classList.toggle('disabled', inventory.seeds === 0);
        this.elements.toolStone.classList.toggle('disabled', inventory.stones === 0);
    }

    _renderStats(levelInfo) {
        this.elements.level.textContent = chrome.i18n.getMessage('garden_level', [String(levelInfo.level)]);
        this.elements.xpBar.style.width = `${Math.min(100, Math.max(0, levelInfo.progress))}%`;
        this.elements.xpBar.title = `${levelInfo.xp} / ${levelInfo.nextLevelXp} XP`;
        if (this.elements.xpValue) {
            this.elements.xpValue.textContent = `${levelInfo.xp} / ${levelInfo.nextLevelXp} XP`;
        }
    }

    _renderGrid(layout) {
        this.gridEl.innerHTML = ''; // Limpa tudo (pode ser otimizado com Diffing se necessário)

        for (let i = 0; i < GARDEN_CONFIG.GRID_SIZE; i++) {
            const cell = document.createElement('div');
            cell.className = 'garden-cell pixel-garden-bg';
            cell.dataset.id = i;

            const item = layout[i];
            if (item) {
                const content = document.createElement('div');
                content.className = 'pixel-art';

                if (item.status === 'withered') {
                    content.classList.add('pixel-withered');
                    cell.classList.add('withered');
                } else if (item.type === 'stone') {
                    content.classList.add('pixel-stone');
                } else if (item.type === 'tree') {
                    if (item.stage === 1) content.classList.add('pixel-sprout'); // Broto
                    else if (item.stage === 2) content.classList.add('pixel-tree-small'); // Árvore pequena
                    else if (item.stage === 3) content.classList.add('pixel-tree'); // Árvore grande
                    else if (item.stage >= 4) content.classList.add('pixel-flowering-tree'); // Árvore florida
                    else content.classList.add('pixel-tree'); // Fallback
                }

                cell.appendChild(content);
            }

            this.gridEl.appendChild(cell);
        }
    }
}

class GardenController {
    constructor(state, renderer) {
        this.state = state;
        this.renderer = renderer;
        this.activeTool = 'select';

        this._initEventListeners();
    }

    async init() {
        await this.state.load();
        this.renderer.render(this.state);
    }

    _initEventListeners() {
        // Ferramentas
        document.getElementById('tool-select').addEventListener('click', () => this.setTool('select'));
        document.getElementById('tool-seed').addEventListener('click', () => this.setTool('seed'));
        document.getElementById('tool-stone').addEventListener('click', () => this.setTool('stone'));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.setTool('select'); });

        // Grid Click
        document.getElementById('garden-grid').addEventListener('click', (e) => this._handleGridClick(e));

        // Reset
        document.getElementById('reset-garden-btn').addEventListener('click', () => this._handleReset());

        // Achievements Modal
        const modal = document.getElementById('achievements-modal');
        const btn = document.getElementById('achievements-btn');
        const closeSpan = document.querySelector('.close-modal');

        btn.onclick = () => {
            this._renderAchievements();
            modal.classList.remove('hidden');
        }
        closeSpan.onclick = () => modal.classList.add('hidden');
        window.onclick = (event) => {
            if (event.target == modal) modal.classList.add('hidden');
        }
    }

    async _renderAchievements() {
        const listEl = document.getElementById('achievements-list');
        listEl.innerHTML = chrome.i18n.getMessage('garden_loading');

        const data = await chrome.storage.local.get(['achievements']);
        const unlockedIds = new Set(data.achievements || []);

        // Define definitions here or share via config
        const ACHIEVEMENTS_DEF = [
            { id: 'first_bloom', title: chrome.i18n.getMessage('achievement_first_bloom_title'), desc: chrome.i18n.getMessage('achievement_first_bloom_desc'), icon: '🌱' },
            { id: 'consistency_3', title: chrome.i18n.getMessage('achievement_consistency_3_title'), desc: chrome.i18n.getMessage('achievement_consistency_3_desc'), icon: '📅' },
            { id: 'deep_focus', title: chrome.i18n.getMessage('achievement_deep_focus_title'), desc: chrome.i18n.getMessage('achievement_deep_focus_desc'), icon: '⏳' },
            { id: 'level_5', title: chrome.i18n.getMessage('achievement_level_5_title'), desc: chrome.i18n.getMessage('achievement_level_5_desc'), icon: '⭐' }
        ];

        listEl.innerHTML = '';
        ACHIEVEMENTS_DEF.forEach(ach => {
            const isUnlocked = unlockedIds.has(ach.id);
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
            item.innerHTML = `
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-details">
                    <h3>${ach.title} ${isUnlocked ? '✅' : '🔒'}</h3>
                    <p>${ach.desc}</p>
                </div>
            `;
            listEl.appendChild(item);
        });
    }

    setTool(tool) {
        if (tool === 'seed' && this.state.inventory.seeds === 0) return;
        if (tool === 'stone' && this.state.inventory.stones === 0) return;

        this.activeTool = tool;
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');
    }

    async _handleGridClick(e) {
        const cell = e.target.closest('.garden-cell');
        if (!cell) return;

        const cellId = cell.dataset.id;
        let success = false;

        if (this.activeTool === 'seed') {
            success = this.state.plantSeed(cellId);
        } else if (this.activeTool === 'stone') {
            success = this.state.placeStone(cellId);
        } else if (this.activeTool === 'select') {
            success = this.state.removeItem(cellId);
        }

        if (success) {
            await this.state.save();
            this.renderer.render(this.state);

            // Se acabou o recurso, volta para select
            if (this.activeTool === 'seed' && this.state.inventory.seeds === 0) this.setTool('select');
            if (this.activeTool === 'stone' && this.state.inventory.stones === 0) this.setTool('select');
        }
    }

    async _handleReset() {
        if (confirm(chrome.i18n.getMessage('garden_confirm_reset'))) {
            // Logica simples: limpar layout, devolver recursos
            for (const id in this.state.layout) {
                const item = this.state.layout[id];
                // Apenas devolve sementes de plantas saudáveis
                if (item.type === 'tree' && item.status !== 'withered') {
                    this.state.inventory.seeds++;
                }
                if (item.type === 'stone') {
                    this.state.inventory.stones++;
                }
            }
            this.state.layout = {};
            await this.state.save();
            this.renderer.render(this.state);
        }
    }
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    // --- i18n ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
        if (msg) el.title = msg;
    });
    const titleMsg = chrome.i18n.getMessage('garden_title');
    if (titleMsg) document.title = titleMsg;

    const state = new GardenState();
    const renderer = new GardenRenderer('garden-grid');
    const controller = new GardenController(state, renderer);
    controller.init();
    state.startAutoRefresh(renderer);
});
