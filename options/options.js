document.addEventListener('DOMContentLoaded', () => {
    // --- Estado da Aplicação ---
    let editingState = { type: null, id: null };

    // --- Seletores Globais ---
    const mainContainer = document.querySelector('main');

    // --- Funções de Renderização ---
    async function renderAll() {
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);
        const { focusLists = [], blockLists = [], whitelists = [] } = data;

        renderList(document.getElementById('block-lists-container'), blockLists, 'block');
        renderList(document.getElementById('white-lists-container'), whitelists, 'white');
        renderFocusLists(document.getElementById('focus-lists-container'), focusLists, blockLists, whitelists);
        populateAssociationSelects(blockLists, whitelists);
    }

    function renderList(container, lists, type) {
        container.innerHTML = '';
        lists.forEach(list => {
            const info = type === 'focus' ? `<span>${list.focusTime}min / ${list.breakTime}min</span>` : `<span>${list.sites.length} sites</span>`;
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<div class="list-item-info">${list.name}${info}</div>`;
            item.appendChild(createActionButtons(type, list.id));
            container.appendChild(item);
        });
    }

    function renderFocusLists(container, lists, blocklists, whitelists) {
        container.innerHTML = '';
        lists.forEach(list => {
            let associationText = 'Nenhuma';
            if (list.associatedListId) {
                const source = list.blockMode === 'blocklist' ? blocklists : whitelists;
                const associatedList = source.find(l => l.id === list.associatedListId);
                if (associatedList) associationText = `${list.blockMode === 'blocklist' ? 'Bloqueia' : 'Permite'}: ${associatedList.name}`;
            }
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-info">
                    ${list.name}
                    <span>${list.focusTime}min / ${list.breakTime}min • ${associationText}</span>
                </div>
            `;
            item.appendChild(createActionButtons('focus', list.id));
            container.appendChild(item);
        });
    }

    function createActionButtons(type, id) {
        const actions = document.createElement('div');
        actions.className = 'list-item-actions';
        actions.innerHTML = `
            <button class="edit-btn" title="Editar" data-action="edit" data-type="${type}" data-id="${id}">✏️</button>
            <button class="delete-btn" title="Excluir" data-action="delete" data-type="${type}" data-id="${id}">🗑️</button>
        `;
        return actions;
    }

    function populateAssociationSelects(blockLists, whitelists) {
        const blockSelect = document.getElementById('block-list-association');
        const whiteSelect = document.getElementById('white-list-association');
        blockSelect.innerHTML = '<option value="">Selecione...</option>';
        whiteSelect.innerHTML = '<option value="">Selecione...</option>';
        blockLists.forEach(l => blockSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`);
        whitelists.forEach(l => whiteSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`);
    }

    // --- Lógica de Edição ---
    async function startEditing(type, id) {
        editingState = { type, id };
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);

        if (type === 'focus') {
            const form = document.getElementById('add-focus-list-form');
            const list = data.focusLists.find(l => l.id === id);
            form.elements['focus-list-name'].value = list.name;
            form.elements['focus-time'].value = list.focusTime;
            form.elements['break-time'].value = list.breakTime;
            form.elements['block-mode'].value = list.blockMode;
            toggleAssociationSection();
            document.getElementById(list.blockMode === 'blocklist' ? 'block-list-association' : 'white-list-association').value = list.associatedListId;
            form.querySelector('h3').textContent = 'Editando Lista';
            form.querySelector('.btn-primary').textContent = 'Salvar Alterações';
            form.querySelector('.btn-secondary').style.display = 'inline-flex';
        } else {
            const isBlock = type === 'block';
            const form = document.getElementById(isBlock ? 'add-block-list-form' : 'add-white-list-form');
            const lists = isBlock ? data.blockLists : data.whitelists;
            const list = lists.find(l => l.id === id);
            form.elements[isBlock ? 'block-list-name' : 'white-list-name'].value = list.name;
            form.elements[isBlock ? 'block-list-sites' : 'white-list-sites'].value = list.sites.join('\\n');
            form.querySelector('h3').textContent = 'Editando Lista';
            form.querySelector('.btn-primary').textContent = 'Salvar Alterações';
            form.querySelector('.btn-secondary').style.display = 'inline-flex';
        }
    }

    function cancelEditing() {
        editingState = { type: null, id: null };
        document.querySelectorAll('.add-form').forEach(form => {
            form.reset();
            form.querySelector('h3').textContent = form.querySelector('h3').textContent.replace('Editando', 'Adicionar');
            form.querySelector('.btn-primary').textContent = 'Salvar';
            form.querySelector('.btn-secondary').style.display = 'none';
        });
        toggleAssociationSection();
    }

    // --- Manipulação de Dados (CRUD) ---
    async function deleteList(type, id) {
        const keyMap = { focus: 'focusLists', block: 'blockLists', white: 'whitelists' };
        if (confirm('Tem certeza?')) {
            const data = await chrome.storage.local.get(keyMap[type]);
            const updatedLists = data[keyMap[type]].filter(item => item.id !== id);
            await chrome.storage.local.set({ [keyMap[type]]: updatedLists });
            renderAll();
        }
    }

    // --- Event Listeners ---
    mainContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (button) {
            const { action, type, id } = button.dataset;
            if (action === 'edit') startEditing(type, parseInt(id));
            if (action === 'delete') deleteList(type, parseInt(id));
        }
        if (e.target.classList.contains('btn-secondary')) {
            cancelEditing();
        }
    });

    document.getElementById('add-focus-list-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const { focusLists, nextListId = 1 } = await chrome.storage.local.get(['focusLists', 'nextListId']);
        const blockMode = form.elements['block-mode'].value;
        const assocId = document.getElementById(blockMode === 'blocklist' ? 'block-list-association' : 'white-list-association').value;
        const newList = {
            id: editingState.id || nextListId,
            name: form.elements['focus-list-name'].value,
            focusTime: parseInt(form.elements['focus-time'].value),
            breakTime: parseInt(form.elements['break-time'].value),
            blockMode,
            associatedListId: parseInt(assocId) || null
        };
        const updatedLists = editingState.type === 'focus' ? focusLists.map(l => l.id === editingState.id ? newList : l) : [...(focusLists || []), newList];
        await chrome.storage.local.set({ focusLists: updatedLists, nextListId: editingState.id ? nextListId : nextListId + 1 });
        cancelEditing();
        renderAll();
    });

    ['add-block-list-form', 'add-white-list-form'].forEach(id => {
        document.getElementById(id).addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const isBlock = id.includes('block');
            const type = isBlock ? 'block' : 'white';
            const key = isBlock ? 'blockLists' : 'whitelists';
            const nextIdKey = isBlock ? 'nextBlockListId' : 'nextWhiteListId';
            const { [key]: lists = [], [nextIdKey]: nextId = 1 } = await chrome.storage.local.get([key, nextIdKey]);
            const sites = form.elements[isBlock ? 'block-list-sites' : 'white-list-sites'].value.split('\\n').map(s => s.trim()).filter(Boolean);
            const newList = {
                id: editingState.id || nextId,
                name: form.elements[isBlock ? 'block-list-name' : 'white-list-name'].value,
                sites
            };
            const updatedLists = editingState.type === type ? lists.map(l => l.id === editingState.id ? newList : l) : [...lists, newList];
            await chrome.storage.local.set({ [key]: updatedLists, [nextIdKey]: editingState.id ? nextId : nextId + 1 });
            cancelEditing();
            renderAll();
        });
    });

    const focusFormRadios = document.querySelectorAll('#add-focus-list-form input[name="block-mode"]');
    function toggleAssociationSection() {
        const mode = Array.from(focusFormRadios).find(r => r.checked).value;
        document.getElementById('blocklist-section').style.display = mode === 'blocklist' ? 'block' : 'none';
        document.getElementById('whitelist-section').style.display = mode === 'whitelist' ? 'block' : 'none';
    }
    focusFormRadios.forEach(radio => radio.addEventListener('change', toggleAssociationSection));

    // --- Inicialização ---
    if (typeof chrome !== 'undefined' && chrome.storage) {
        renderAll();
    } else {
        console.log("API do Chrome não disponível. A página de opções pode não funcionar como esperado.");
    }
});
