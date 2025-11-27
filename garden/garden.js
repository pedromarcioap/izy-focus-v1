document.addEventListener('DOMContentLoaded', () => {
    // --- Referências do DOM ---
    const gardenPlot = document.getElementById('garden-plot');
    const seedCountEl = document.getElementById('seed-count');
    const stoneCountEl = document.getElementById('stone-count');
    const toolSeedBtn = document.getElementById('tool-seed');
    const toolStoneBtn = document.getElementById('tool-stone');
    const editGardenBtn = document.getElementById('edit-garden-btn');
    const resetGardenBtn = document.getElementById('reset-garden-btn');

    // --- Estado da Aplicação ---
    let inventory = { seeds: 0, stones: 0 };
    let gardenLayout = []; // Array de objetos { id, type, x, y }
    let activeTool = null;
    let isEditMode = false;
    let draggedElement = null;

    // --- Inicialização ---
    async function initializeGarden() {
        const data = await chrome.storage.local.get(['gardenInventory', 'gardenLayout']);
        inventory = data.gardenInventory || { seeds: 0, stones: 0 };
        gardenLayout = data.gardenLayout || [];
        render();
    }

    // --- Lógica de Renderização ---
    function render() {
        // Atualiza o inventário
        seedCountEl.textContent = inventory.seeds;
        stoneCountEl.textContent = inventory.stones;

        // Limpa o jardim antes de redesenhar
        gardenPlot.innerHTML = '<div class="garden-background"></div>';

        // Renderiza cada elemento do jardim
        gardenLayout.forEach(item => {
            const element = document.createElement('div');
            element.className = 'garden-element';
            element.dataset.id = item.id;
            element.style.left = `${item.x}px`;
            element.style.top = `${item.y}px`;

            const img = document.createElement('img');
            img.src = item.type === 'seed' ? '../assets/icons/plant.svg' : '../assets/images/Stone-sembg.png';
            img.style.width = item.type === 'seed' ? '40px' : '50px'; // Tamanhos diferentes

            element.appendChild(img);
            gardenPlot.appendChild(element);
        });

        updateEditModeState();
    }

    // --- Lógica de Interação ---
    function setActiveTool(tool) {
        if (isEditMode) return; // Não permite selecionar ferramentas no modo de edição

        // Desativa a ferramenta se for clicada novamente
        if (activeTool === tool) {
            activeTool = null;
        } else {
            if (tool === 'seed' && inventory.seeds > 0) activeTool = 'seed';
            else if (tool === 'stone' && inventory.stones > 0) activeTool = 'stone';
            else activeTool = null;
        }

        // Atualiza a UI dos botões
        toolSeedBtn.classList.toggle('active', activeTool === 'seed');
        toolStoneBtn.classList.toggle('active', activeTool === 'stone');
        gardenPlot.style.cursor = activeTool ? 'crosshair' : 'default';
    }

    gardenPlot.addEventListener('click', (e) => {
        if (isEditMode || !activeTool || e.target === gardenPlot === false) return;

        const rect = gardenPlot.getBoundingClientRect();
        const x = e.clientX - rect.left - 20; // Ajuste para centralizar o item
        const y = e.clientY - rect.top - 20;

        const newItem = {
            id: Date.now(),
            type: activeTool,
            x: x,
            y: y,
        };

        gardenLayout.push(newItem);
        inventory[activeTool === 'seed' ? 'seeds' : 'stones']--;

        saveState();
        render();
        setActiveTool(activeTool); // Desativa a ferramenta após o uso
    });

    // --- Modo Edição ---
    function toggleEditMode() {
        isEditMode = !isEditMode;
        activeTool = null; // Garante que nenhuma ferramenta esteja ativa
        toolSeedBtn.classList.remove('active');
        toolStoneBtn.classList.remove('active');
        gardenPlot.style.cursor = 'default';
        updateEditModeState();
    }

    function updateEditModeState() {
        gardenPlot.classList.toggle('edit-mode', isEditMode);
        editGardenBtn.textContent = isEditMode ? 'Salvar Jardim' : 'Modo Edição';

        document.querySelectorAll('.garden-element').forEach(el => {
            if (isEditMode) {
                el.addEventListener('mousedown', onDragStart);
                el.addEventListener('dblclick', onElementRemove);
            } else {
                el.removeEventListener('mousedown', onDragStart);
                el.removeEventListener('dblclick', onElementRemove);
            }
        });
    }

    function onElementRemove(e) {
        const element = e.currentTarget;
        const id = parseInt(element.dataset.id);
        const item = gardenLayout.find(i => i.id === id);
        
        if (item) {
            inventory[item.type === 'seed' ? 'seeds' : 'stones']++;
            gardenLayout = gardenLayout.filter(i => i.id !== id);
            saveState();
            render();
        }
    }

    // --- Lógica de Arrastar e Soltar (Drag and Drop) ---
    function onDragStart(e) {
        if (!isEditMode) return;
        e.preventDefault();
        draggedElement = e.currentTarget;

        const rect = draggedElement.getBoundingClientRect();
        const plotRect = gardenPlot.getBoundingClientRect();

        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;

        function onMouseMove(moveEvent) {
            let newX = moveEvent.clientX - plotRect.left - shiftX;
            let newY = moveEvent.clientY - plotRect.top - shiftY;

            // Limita o movimento dentro do gardenPlot
            newX = Math.max(0, Math.min(newX, plotRect.width - rect.width));
            newY = Math.max(0, Math.min(newY, plotRect.height - rect.height));

            draggedElement.style.left = `${newX}px`;
            draggedElement.style.top = `${newY}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const id = parseInt(draggedElement.dataset.id);
            const item = gardenLayout.find(i => i.id === id);
            if (item) {
                item.x = parseInt(draggedElement.style.left);
                item.y = parseInt(draggedElement.style.top);
                saveState();
            }
            draggedElement = null;
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // --- Ações Adicionais ---
    resetGardenBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja limpar seu jardim? Todos os itens voltarão para o inventário.')) {
            gardenLayout.forEach(item => {
                inventory[item.type === 'seed' ? 'seeds' : 'stones']++;
            });
            gardenLayout = [];
            await saveState();
            render();
        }
    });

    // --- Funções Utilitárias ---
    async function saveState() {
        await chrome.storage.local.set({ gardenLayout, gardenInventory: inventory });
    }

    // --- Event Listeners ---
    toolSeedBtn.addEventListener('click', () => setActiveTool('seed'));
    toolStoneBtn.addEventListener('click', () => setActiveTool('stone'));
    editGardenBtn.addEventListener('click', toggleEditMode);

    // --- Chamada Inicial ---
    initializeGarden();
});
