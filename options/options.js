document.addEventListener('DOMContentLoaded', () => {
    // --- Estado da Aplicação ---
    let editingState = { type: null, id: null };

    // --- Seletores de Formulário de Lista de Foco ---
    const focusForm = document.getElementById('add-focus-list-form');
    const focusFormTitle = document.getElementById('focus-form-title');
    const focusListsContainer = document.getElementById('focus-lists-container');
    const cancelEditFocusBtn = document.getElementById('cancel-edit-focus-btn');

    // --- Seletores de Formulário de Blocklist ---
    const blockForm = document.getElementById('add-block-list-form');
    const blockFormTitle = document.getElementById('block-form-title');
    const blockListsContainer = document.getElementById('block-lists-container');
    const cancelEditBlockBtn = document.getElementById('cancel-edit-block-btn');

    // --- Seletores de Formulário de Whitelist ---
    const whiteForm = document.getElementById('add-white-list-form');
    const whiteFormTitle = document.getElementById('white-form-title');
    const whiteListsContainer = document.getElementById('white-lists-container');
    const cancelEditWhiteBtn = document.getElementById('cancel-edit-white-btn');

    // --- Renderização ---
    async function renderAll() {
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);
        const { focusLists = [], blockLists = [], whitelists = [] } = data;

        renderSimpleList(blockListsContainer, blockLists, 'block');
        renderSimpleList(whiteListsContainer, whitelists, 'white');
        renderFocusLists(focusListsContainer, focusLists, blockLists, whitelists);
        populateAssociationSelects(blockLists, whitelists);
    }

    function renderSimpleList(container, lists, type) {
        container.innerHTML = '';
        lists.forEach(list => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `<span class="list-item-info">${list.name} (${list.sites.length} sites)</span>`;
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
                if (associatedList) {
                    associationText = `${list.blockMode === 'blocklist' ? 'Bloqueia' : 'Permite'}: ${associatedList.name}`;
                }
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
            <button data-action="edit" data-type="${type}" data-id="${id}">Editar</button>
            <button data-action="delete" data-type="${type}" data-id="${id}">Excluir</button>
        `;
        return actions;
    }
    
    function populateAssociationSelects(blockLists, whitelists) {
        const blockSelect = document.getElementById('block-list-association');
        const whiteSelect = document.getElementById('white-list-association');
        blockSelect.innerHTML = '<option value="">Selecione uma blocklist</option>';
        whiteSelect.innerHTML = '<option value="">Selecione uma whitelist</option>';
        blockLists.forEach(l => blockSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`);
        whitelists.forEach(l => whiteSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`);
    }

    // --- Lógica de Edição ---
    async function startEditing(type, id) {
        editingState = { type, id };
        const data = await chrome.storage.local.get(['focusLists', 'blockLists', 'whitelists']);

        if (type === 'focus') {
            const list = data.focusLists.find(l => l.id === id);
            focusForm.elements['focus-list-name'].value = list.name;
            focusForm.elements['focus-time'].value = list.focusTime;
            focusForm.elements['break-time'].value = list.breakTime;
            focusForm.elements['block-mode'].value = list.blockMode;
            toggleAssociationSection();
            document.getElementById(list.blockMode === 'blocklist' ? 'block-list-association' : 'white-list-association').value = list.associatedListId;
            focusFormTitle.textContent = 'Editando Lista';
            focusForm.elements['submit-focus-form-btn'].textContent = 'Salvar Alterações';
            cancelEditFocusBtn.style.display = 'inline-flex';
        } else {
            const isBlock = type === 'block';
            const form = isBlock ? blockForm : whiteForm;
            const title = isBlock ? blockFormTitle : whiteFormTitle;
            const lists = isBlock ? data.blockLists : data.whitelists;
            const list = lists.find(l => l.id === id);
            form.elements[isBlock ? 'block-list-name' : 'white-list-name'].value = list.name;
            form.elements[isBlock ? 'block-list-sites' : 'white-list-sites'].value = list.sites.join('\\n');
            title.textContent = 'Editando Lista';
            form.querySelector('.btn-primary').textContent = 'Salvar Alterações';
            form.querySelector('.btn-secondary').style.display = 'inline-flex';
        }
    }

    function cancelEditing() {
        editingState = { type: null, id: null };
        [focusForm, blockForm, whiteForm].forEach(form => {
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
        const key = keyMap[type];
        if (confirm('Tem certeza que deseja excluir esta lista?')) {
            const data = await chrome.storage.local.get(key);
            const updatedLists = data[key].filter(item => item.id !== id);
            await chrome.storage.local.set({ [key]: updatedLists });
            renderAll();
        }
    }

    // Event Delegation para botões de ação
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const { action, type, id } = button.dataset;
        if (action === 'edit') startEditing(type, parseInt(id));
        if (action === 'delete') deleteList(type, parseInt(id));
    });

    // --- Event Listeners dos Formulários ---
    focusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { focusLists, nextListId = 1 } = await chrome.storage.local.get(['focusLists', 'nextListId']);
        const blockMode = focusForm.elements['block-mode'].value;
        const assocId = document.getElementById(blockMode === 'blocklist' ? 'block-list-association' : 'white-list-association').value;
        
        const newList = {
            id: editingState.id || nextListId,
            name: focusForm.elements['focus-list-name'].value,
            focusTime: parseInt(focusForm.elements['focus-time'].value),
            breakTime: parseInt(focusForm.elements['break-time'].value),
            blockMode: blockMode,
            associatedListId: parseInt(assocId) || null
        };

        const updatedLists = editingState.type === 'focus'
            ? focusLists.map(l => l.id === editingState.id ? newList : l)
            : [...focusLists, newList];

        await chrome.storage.local.set({ focusLists: updatedLists, nextListId: editingState.id ? nextListId : nextListId + 1 });
        cancelEditing();
        renderAll();
    });

    [blockForm, whiteForm].forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isBlock = form.id.includes('block');
            const type = isBlock ? 'block' : 'white';
            const key = isBlock ? 'blockLists' : 'whitelists';
            const nextIdKey = isBlock ? 'nextBlockListId' : 'nextWhiteListId';
            const { [key]: lists = [], [nextIdKey]: nextId = 1 } = await chrome.storage.local.get([key, nextIdKey]);

            const sites = form.elements[isBlock ? 'block-list-sites' : 'white-list-sites'].value.split('\\n').map(s => s.trim()).filter(Boolean);

            const newList = {
                id: editingState.id || nextId,
                name: form.elements[isBlock ? 'block-list-name' : 'white-list-name'].value,
                sites: sites
            };

            const updatedLists = editingState.type === type
                ? lists.map(l => l.id === editingState.id ? newList : l)
                : [...lists, newList];

            await chrome.storage.local.set({ [key]: updatedLists, [nextIdKey]: editingState.id ? nextId : nextId + 1 });
            cancelEditing();
            renderAll();
        });
    });

    [cancelEditFocusBtn, cancelEditBlockBtn, cancelEditWhiteBtn].forEach(btn => btn.addEventListener('click', cancelEditing));
    
    function toggleAssociationSection() {
        const mode = focusForm.elements['block-mode'].value;
        document.getElementById('blocklist-section').style.display = mode === 'blocklist' ? 'block' : 'none';
        document.getElementById('whitelist-section').style.display = mode === 'whitelist' ? 'block' : 'none';
    }
    focusForm.elements['block-mode'].forEach(radio => radio.addEventListener('change', toggleAssociationSection));

    // --- Inicialização ---
    renderAll();
});
