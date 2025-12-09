// --- CONFIGURAÇÃO E CONSTANTES ---
const GARDEN_CONFIG = {
    GRID_SIZE: 100, // 10x10
    GROWTH_PER_CYCLE: 1, // Quanto cada planta cresce por "ciclo" de crescimento global
    MAX_STAGE: 4, // 1=Sprout, 2=Small, 3=Big, 4=Flowering
    LEVEL_BASE_XP: 100,
};

// --- CLASSES ---

class GardenState {
    constructor() {
        this.inventory = { seeds: 0, stones: 0, xp: 0, pendingGrowth: 0 };
        this.layout = {};
    }

    async load() {
        const data = await chrome.storage.local.get(['gardenInventory', 'gardenLayout']);

        // Sanitize inventory to prevent NaN issues
        const rawInventory = data.gardenInventory || {};
        this.inventory = {
            seeds: Number(rawInventory.seeds) || 0,
            stones: Number(rawInventory.stones) || 0,
            xp: Number(rawInventory.xp) || 0,
            pendingGrowth: Number(rawInventory.pendingGrowth) || 0
        };

        this.layout = this._migrateLayout(data.gardenLayout || {});

        // Processar crescimento pendente
        if (this.inventory.pendingGrowth > 0) {
            this._processGrowth(this.inventory.pendingGrowth);
            this.inventory.pendingGrowth = 0;
            await this.save();
        }
    }

    async save() {
        await chrome.storage.local.set({
            gardenInventory: this.inventory,
            gardenLayout: this.layout
        });
    }

    _migrateLayout(oldLayout) {
        const newLayout = {};
        for (const [id, item] of Object.entries(oldLayout)) {
            // Validate key range
            const numId = Number(id);
            if (isNaN(numId) || numId < 0 || numId >= GARDEN_CONFIG.GRID_SIZE) continue;

            if (typeof item === 'string') {
                // Migração de formato antigo ('tree', 'stone')
                if (item === 'tree') {
                    newLayout[id] = { type: 'tree', stage: 3, status: 'healthy', plantedAt: Date.now() }; // Assume árvore adulta
                } else if (item === 'stone') {
                    newLayout[id] = { type: 'stone', status: 'healthy', plantedAt: Date.now() };
                }
            } else if (typeof item === 'object' && item !== null) {
                // Validate existing object
                if (item.type === 'tree' || item.type === 'stone') {
                    newLayout[id] = item;
                }
                // Invalid or ghost items are skipped (effectively deleted)
            }
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

        // Recuperar recursos (opcional, por enquanto vamos manter a lógica antiga: devolve semente/pedra)
        // Mas se estiver 'withered', talvez não devolva nada?
        // Vamos manter generoso por enquanto.
        if (item.type === 'tree') this.inventory.seeds++;
        else if (item.type === 'stone') this.inventory.stones++;

        delete this.layout[cellId];
        return true;
    }

    getLevelInfo() {
        // Nível 1: 0-99 XP
        // Nível 2: 100-399 XP
        // Nível = floor(sqrt(XP / 100)) + 1 ??? Não, muito lento.
        // Vamos usar linear simples para começo: Nível = 1 + floor(XP / 200)
        const level = 1 + Math.floor(this.inventory.xp / 200);
        const nextLevelXp = (level) * 200;
        const currentLevelBaseXp = (level - 1) * 200;
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
        this.elements.level.textContent = `Nível ${levelInfo.level}`;
        this.elements.xpBar.style.width = `${Math.min(100, Math.max(0, levelInfo.progress))}%`;
        this.elements.xpBar.title = `${levelInfo.xp} / ${levelInfo.nextLevelXp} XP`;
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
        if (confirm('Tem certeza que deseja limpar todo o seu jardim? Suas plantas voltarão para o inventário.')) {
            // Logica simples: limpar layout, devolver recursos
            for (const id in this.state.layout) {
                const item = this.state.layout[id];
                if (item.type === 'tree') this.state.inventory.seeds++;
                if (item.type === 'stone') this.state.inventory.stones++;
            }
            this.state.layout = {};
            await this.state.save();
            this.renderer.render(this.state);
        }
    }
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    const state = new GardenState();
    const renderer = new GardenRenderer('garden-grid');
    const controller = new GardenController(state, renderer);
    controller.init();
});
