// Registros RAAS — CRUD
function changeMonth() {
    const m = document.getElementById('monthPicker').value;
    window.location.href = '/registros?month=' + m;
}

function toggleGrupo(header) {
    const body = header.nextElementSibling;
    const chevron = header.querySelector('.grupo-chevron');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : '';
    if (chevron) chevron.textContent = isOpen ? '▸' : '▾';
}

function clearRegistroDateSearch() {
    const dateInput = document.getElementById('registroDateSearch');
    if (!dateInput) return;
    dateInput.value = '';
    filterRegistros();
}

function filterRegistros() {
    const nameQ = (document.getElementById('registroSearch')?.value || '').toLowerCase().trim();
    const dateQ = document.getElementById('registroDateSearch')?.value || '';
    const groups = document.querySelectorAll('.registro-group');
    const noMatch = document.getElementById('registroNoMatch');
    let firstMatch = null;
    let matchCount = 0;

    groups.forEach(group => {
        const name = group.dataset.patientName || '';
        const prontuario = group.dataset.patientProntuario || '';
        const nameMatches = !nameQ || name.includes(nameQ) || prontuario.includes(nameQ);

        let dateMatches = !dateQ;
        const rows = group.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowMatches = !dateQ || row.dataset.date === dateQ;
            row.style.display = rowMatches ? '' : 'none';
            if (dateQ && row.dataset.date === dateQ) dateMatches = true;
        });

        const isolado = !pacienteIsolado || group.dataset.patientId === pacienteIsolado;
        const matches = nameMatches && dateMatches && isolado;
        group.style.display = matches ? '' : 'none';
        if (matches) {
            matchCount++;
            if (!firstMatch) firstMatch = group;
            if (dateQ) {
                const header = group.querySelector('.registro-group-header');
                const body = header.nextElementSibling;
                const chevron = header.querySelector('.grupo-chevron');
                body.style.display = '';
                if (chevron) chevron.textContent = '▾';
            }
        }
    });

    if (noMatch) noMatch.style.display = ((nameQ || dateQ) && matchCount === 0) ? '' : 'none';

    if (firstMatch && nameQ && !dateQ) {
        const header = firstMatch.querySelector('.registro-group-header');
        const body = header.nextElementSibling;
        const chevron = header.querySelector('.grupo-chevron');
        if (body.style.display === 'none') {
            body.style.display = '';
            if (chevron) chevron.textContent = '▾';
        }
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function searchPatient(query) {
    const results = document.getElementById('patientResults');
    const hidden = document.getElementById('form-patient-id');
    const q = (query || '').toLowerCase().trim();

    // A new search invalidates the previously selected patient.
    hidden.value = '';
    if (!q) {
        results.style.display = 'none';
        return;
    }

    const prontuarioMatches = PACIENTES_DATA.filter(p =>
        p.prontuario && String(p.prontuario).toLowerCase() === q
    );
    const matches = prontuarioMatches.length > 0
        ? prontuarioMatches
        : PACIENTES_DATA.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.cns && String(p.cns).toLowerCase().includes(q)) ||
            (p.prontuario && String(p.prontuario).toLowerCase().includes(q))
        ).sort((a, b) => {
            const aProntuario = String(a.prontuario || '').toLowerCase();
            const bProntuario = String(b.prontuario || '').toLowerCase();
            const aStarts = aProntuario.startsWith(q);
            const bStarts = bProntuario.startsWith(q);
            return Number(bStarts) - Number(aStarts);
        }).slice(0, 20);
    results._matches = matches;

    if (matches.length === 0) {
        hidden.value = '';
        results.innerHTML = '<div class="autocomplete-empty">Nenhum paciente encontrado</div>';
        results.style.display = 'block';
        return;
    }

    results.innerHTML = matches.map(p =>
        `<div class="autocomplete-item" data-patient-id="${escapeHtml(p.id)}" data-patient-name="${escapeHtml(p.name)}">
            <div class="item-name">${escapeHtml(p.name)}${p.prontuario ? ` <span style="color:var(--muted);font-weight:600;">- Pront: ${escapeHtml(p.prontuario)}</span>` : ''}</div>
            <div class="item-sub">CNS: ${escapeHtml(p.cns) || 's/doc'} · Mãe: ${escapeHtml(p.motherName) || 's/info'} · Nasc: ${formatBirthDate(p.birthDate)}</div>
        </div>`
    ).join('');
    results.style.display = 'block';
}

function formatBirthDate(iso) {
    if (!iso || iso.length !== 10) return 's/info';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function clearPatient() {
    document.getElementById('patientSearch').value = '';
    document.getElementById('form-patient-id').value = '';
    document.getElementById('patientResults').style.display = 'none';
    isolarPaciente('');
    document.getElementById('patientSearch').focus();
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function selectPatient(id, name) {
    const input = document.getElementById('patientSearch');
    input.value = name;
    document.getElementById('form-patient-id').value = id;
    document.getElementById('patientResults').style.display = 'none';
    limparErroSelecao(input);
    isolarPaciente(id);
}

document.getElementById('patientResults').addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item || !item.dataset.patientId) return;
    selectPatient(item.dataset.patientId, item.dataset.patientName);
});

document.getElementById('patientSearch').addEventListener('keydown', (e) => {
    const enter = e.key === 'Enter';
    if (!enter && (e.key !== 'Tab' || e.shiftKey)) return;
    const results = document.getElementById('patientResults');
    const matches = results.style.display === 'none' ? [] : (results._matches || []);
    if (matches.length > 0) selectPatient(matches[0].id, matches[0].name);
    if (enter) {
        e.preventDefault();
        document.getElementById('profSearch').focus();
    }
});

function searchProf(query) {
    const results = document.getElementById('profResults');
    const hidden = document.getElementById('form-professional-id');
    const q = (query || '').toLowerCase().trim();

    if (!q) {
        hidden.value = '';
        results.style.display = 'none';
        return;
    }

    const matches = PROFISSIONAIS_DATA.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
    results._matches = matches;

    if (matches.length === 0) {
        hidden.value = '';
        results.innerHTML = '<div class="autocomplete-empty">Nenhum profissional encontrado</div>';
        results.style.display = 'block';
        return;
    }

    results.innerHTML = matches.map(p =>
        `<div class="autocomplete-item" data-prof-id="${escapeHtml(p.id)}" data-prof-name="${escapeHtml(p.name)}" data-prof-cbo="${escapeHtml(p.cbo)}">
            <div class="item-name">${escapeHtml(p.name)}</div>
            <div class="item-sub">${escapeHtml(p.cbo) || 's/CBO'}</div>
        </div>`
    ).join('');
    results.style.display = 'block';
}

function selectProf(id, name, cbo) {
    limparErroSelecao(document.getElementById('profSearch'));
    document.getElementById('profSearch').value = name;
    document.getElementById('form-professional-id').value = id;
    document.getElementById('cboInput').value = cbo || '';
    document.getElementById('profResults').style.display = 'none';
}

function clearProf() {
    document.getElementById('profSearch').value = '';
    document.getElementById('form-professional-id').value = '';
    document.getElementById('cboInput').value = '';
    document.getElementById('profResults').style.display = 'none';
    document.getElementById('profSearch').focus();
}

document.getElementById('profResults').addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item || !item.dataset.profId) return;
    selectProf(item.dataset.profId, item.dataset.profName, item.dataset.profCbo);
});

document.getElementById('profSearch').addEventListener('keydown', (e) => {
    const enter = e.key === 'Enter';
    if (!enter && (e.key !== 'Tab' || e.shiftKey)) return;
    const results = document.getElementById('profResults');
    const matches = results.style.display === 'none' ? [] : (results._matches || []);
    if (matches.length > 0) selectProf(matches[0].id, matches[0].name, matches[0].cbo);
    if (enter) {
        e.preventDefault();
        document.querySelector('#procRows .proc-search-input')?.focus();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#patientSearch') && !e.target.closest('#patientResults')) {
        document.getElementById('patientResults').style.display = 'none';
    }
    if (!e.target.closest('#profSearch') && !e.target.closest('#profResults')) {
        document.getElementById('profResults').style.display = 'none';
    }
    if (!e.target.closest('.proc-select-group')) {
        document.querySelectorAll('.proc-results').forEach(el => el.style.display = 'none');
    }
});

const MAX_PROC_ROWS = 5;

function searchProc(inputEl) {
    const row = inputEl.closest('.proc-row');
    const results = row.querySelector('.proc-results');
    const hidden = row.querySelector('.proc-hidden-id');
    const q = (inputEl.value || '').toLowerCase().trim();

    if (!q) {
        hidden.value = '';
        results.style.display = 'none';
        return;
    }

    const matches = PROCEDIMENTOS_DATA.filter(p => p.label.toLowerCase().includes(q)).slice(0, 20);
    results._matches = matches;

    if (matches.length === 0) {
        hidden.value = '';
        results.innerHTML = '<div class="autocomplete-empty">Nenhum procedimento encontrado</div>';
        results.style.display = 'block';
        return;
    }

    results.innerHTML = matches.map(p =>
        `<div class="autocomplete-item" data-proc-id="${escapeHtml(p.id)}" data-proc-label="${escapeHtml(p.label)}">
            <div class="item-name">${escapeHtml(p.label)}</div>
        </div>`
    ).join('');
    results.style.display = 'block';
}

// O procedimento de acompanhamento infanto-juvenil exige informar o número
// da autorização no RAAS — o campo fica oculto/desabilitado até ser escolhido.
const AUTH_REQUIRED_PROC_CODE = '03.01.08.038-0';

function updateAuthorizationVisibility() {
    const row = document.getElementById('authorizationRow');
    const input = document.getElementById('authorizationInput');
    if (!row || !input) return;
    const selectedIds = Array.from(document.querySelectorAll('#procRows .proc-hidden-id'))
        .map((el) => el.value)
        .filter(Boolean);
    const needsAuth = selectedIds.some((id) => {
        const proc = PROCEDIMENTOS_DATA.find((p) => p.id === id);
        return proc && proc.code === AUTH_REQUIRED_PROC_CODE;
    });
    row.style.display = needsAuth ? '' : 'none';
    input.disabled = !needsAuth;
    if (!needsAuth) input.value = '';
}

function selectProc(row, id, label) {
    limparErroSelecao(row.querySelector('.proc-search-input'));
    row.querySelector('.proc-search-input').value = label;
    row.querySelector('.proc-hidden-id').value = id;
    row.querySelector('.proc-results').style.display = 'none';
    updateAuthorizationVisibility();
    focarPrimeiroCampoVazio();
}

function clearProc(btn) {
    const row = btn.closest('.proc-row');
    row.querySelector('.proc-search-input').value = '';
    row.querySelector('.proc-hidden-id').value = '';
    row.querySelector('.proc-results').style.display = 'none';
    row.querySelector('.proc-search-input').focus();
    updateAuthorizationVisibility();
}

document.getElementById('procRows').addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item || !item.dataset.procId) return;
    const row = item.closest('.proc-row');
    selectProc(row, item.dataset.procId, item.dataset.procLabel);
});

document.getElementById('procRows').addEventListener('keydown', (e) => {
    const enter = e.key === 'Enter';
    if (!enter && (e.key !== 'Tab' || e.shiftKey)) return;
    const input = e.target.closest('.proc-search-input');
    if (!input) return;
    if (enter) e.preventDefault();
    const row = input.closest('.proc-row');
    const results = row.querySelector('.proc-results');
    const matches = results.style.display === 'none' ? [] : (results._matches || []);
    if (matches.length > 0) selectProc(row, matches[0].id, matches[0].label);
});

function addProcRow(selectedId = '', qty = 1) {
    const rows = document.getElementById('procRows');
    if (rows.children.length >= MAX_PROC_ROWS) return;
    const idx = rows.children.length;
    const selected = selectedId ? PROCEDIMENTOS_DATA.find(p => p.id === selectedId) : null;
    const div = document.createElement('div');
    div.className = 'proc-row';
    div.innerHTML = `
        <div class="form-group proc-select-group" style="position:relative;">
            <input type="text" class="proc-search-input autocomplete-input" placeholder="Buscar procedimento..." autocomplete="off"
                   value="${selected ? escapeHtml(selected.label) : ''}"
                   oninput="searchProc(this)" onfocus="searchProc(this)">
            <button type="button" class="input-clear-btn" tabindex="-1" onclick="clearProc(this)" title="Limpar seleção">✕</button>
            <input type="hidden" name="procedure_id_${idx}" class="proc-hidden-id" value="${escapeHtml(selectedId)}">
            <div class="proc-results autocomplete-results" style="display:none;"></div>
            <div class="reg-field-error"></div>
        </div>
        <div class="form-group proc-qty-group">
            <input type="number" name="quantity_${idx}" min="1" value="${qty}" placeholder="Qtd" tabindex="-1">
        </div>
        <button type="button" class="btn btn-ghost btn-sm proc-remove-btn" tabindex="-1" onclick="removeProcRow(this)" title="Remover procedimento">🗑</button>
    `;
    rows.appendChild(div);
    updateAddProcBtn();
    updateProcRemoveBtns();
}

/* Com um único procedimento não há o que remover; a partir do segundo, todas
   as linhas — inclusive a principal — ganham o 🗑. */
function updateProcRemoveBtns() {
    const rows = document.querySelectorAll('#procRows .proc-row');
    rows.forEach(row => {
        row.querySelector('.proc-remove-btn').style.visibility = rows.length > 1 ? 'visible' : 'hidden';
    });
}

function adicionarProcedimento() {
    addProcRow();
    focarPrimeiroCampoVazio();
}

function removeProcRow(btn) {
    btn.closest('.proc-row').remove();
    updateAddProcBtn();
    updateProcRemoveBtns();
    updateAuthorizationVisibility();
    focarPrimeiroCampoVazio();
}

function updateAddProcBtn() {
    const rows = document.getElementById('procRows');
    const btn = document.getElementById('addProcBtn');
    if (btn.dataset.forceHidden === '1') return;
    btn.style.display = rows.children.length >= MAX_PROC_ROWS ? 'none' : '';
}

function resetProcRows() {
    document.getElementById('procRows').innerHTML = '';
    addProcRow();
}

function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

let listRefreshPending = false;

function grupoPorPaciente(patientId) {
    if (!patientId) return null;
    return document.querySelector(`.registro-group[data-patient-id="${CSS.escape(patientId)}"]`);
}

function setGrupoAberto(group, aberto) {
    if (!group) return;
    const header = group.querySelector('.registro-group-header');
    const body = header.nextElementSibling;
    const chevron = header.querySelector('.grupo-chevron');
    body.style.display = aberto ? '' : 'none';
    if (chevron) chevron.textContent = aberto ? '▾' : '▸';
}

/* Pacientes cuja relação de atendimentos está expandida no momento. */
function gruposAbertos() {
    return Array.from(document.querySelectorAll('.registro-group'))
        .filter(g => {
            const body = g.querySelector('.registro-group-header')?.nextElementSibling;
            return body && body.style.display !== 'none';
        })
        .map(g => g.dataset.patientId)
        .filter(Boolean);
}

/* Recarrega a lista mantendo os grupos que já estavam abertos e os filtros de
   busca — recarregar a página inteira fecharia tudo. */
async function refreshRegistrosList(patientId, { scroll = true } = {}) {
    const response = await fetch(`/registros?month=${encodeURIComponent(selectedMonth())}`);
    if (!response.ok) throw new Error('Falha ao atualizar a lista de atendimentos');

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const currentCard = document.querySelector('.card');
    const updatedCard = parsed.querySelector('.card');
    if (!currentCard || !updatedCard) throw new Error('Lista de atendimentos não encontrada');

    const abertos = new Set(gruposAbertos());
    if (patientId) abertos.add(patientId);
    const buscaNome = document.getElementById('registroSearch')?.value || '';
    const buscaData = document.getElementById('registroDateSearch')?.value || '';

    currentCard.replaceWith(updatedCard);

    abertos.forEach(pid => setGrupoAberto(grupoPorPaciente(pid), true));
    aplicarIsolamento();

    const nomeInput = document.getElementById('registroSearch');
    const dataInput = document.getElementById('registroDateSearch');
    if (nomeInput) nomeInput.value = buscaNome;
    if (dataInput) dataInput.value = buscaData;
    if (buscaNome || buscaData) filterRegistros();

    const group = grupoPorPaciente(patientId);
    if (group && scroll) group.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function prepareNextRecord(serviceDate) {
    const form = document.getElementById('regForm');
    form.reset();
    document.getElementById('modalTitle').textContent = 'Novo Registro RAAS';
    document.getElementById('form-id').value = '';
    document.getElementById('form-month').value = selectedMonth();
    applyMonthLimits();
    document.querySelector('[name="service_date"]').value = serviceDate;
    document.getElementById('form-patient-id').value = '';
    document.getElementById('patientSearch').value = '';
    document.getElementById('patientResults').style.display = 'none';
    document.getElementById('form-professional-id').value = '';
    document.getElementById('profSearch').value = '';
    document.getElementById('profResults').style.display = 'none';
    resetProcRows();
    limparErrosSelecao();
    const addProcBtn = document.getElementById('addProcBtn');
    addProcBtn.dataset.forceHidden = '0';
    addProcBtn.style.display = '';
    updateAuthorizationVisibility();
}

const MSG_ESCOLHER = 'Escolher uma opção';

function limparErroSelecao(input) {
    if (!input) return;
    input.classList.remove('input-invalid');
    const erro = input.closest('.form-group')?.querySelector('.reg-field-error');
    if (erro) { erro.textContent = ''; erro.classList.remove('show'); }
}

function limparErrosSelecao() {
    document.querySelectorAll('#regForm .autocomplete-input').forEach(limparErroSelecao);
}

function marcarErroSelecao(input) {
    input.classList.add('input-invalid');
    const erro = input.closest('.form-group')?.querySelector('.reg-field-error');
    if (erro) { erro.textContent = MSG_ESCOLHER; erro.classList.add('show'); }
}

/* Paciente, profissional e procedimento precisam ser ESCOLHIDOS na lista:
   digitar o texto não basta, pois o id só é preenchido ao selecionar. */
function validarSelecoes() {
    limparErrosSelecao();
    const pendentes = [];
    if (!document.getElementById('form-patient-id').value) {
        pendentes.push(document.getElementById('patientSearch'));
    }
    if (!document.getElementById('form-professional-id').value) {
        pendentes.push(document.getElementById('profSearch'));
    }
    document.querySelectorAll('#procRows .proc-row').forEach((row, i) => {
        const input = row.querySelector('.proc-search-input');
        // a primeira linha é obrigatória; as extras só cobram escolha se
        // o usuário digitou algo nelas
        if (!row.querySelector('.proc-hidden-id').value && (i === 0 || input.value.trim())) {
            pendentes.push(input);
        }
    });

    pendentes.forEach(marcarErroSelecao);
    if (pendentes.length === 0) return true;
    pendentes[0].focus();
    return false;
}

/* Põe o cursor no primeiro campo ainda em branco (paciente → profissional →
   procedimentos), na ordem em que o formulário é preenchido. Sem nenhum campo
   pendente — caso do último procedimento escolhido — o cursor para no Salvar. */
function focarPrimeiroCampoVazio() {
    const campos = [
        document.getElementById('patientSearch'),
        document.getElementById('profSearch'),
        ...document.querySelectorAll('#procRows .proc-search-input'),
    ].filter(Boolean);
    const vazio = campos.find(el => !el.value.trim());
    if (vazio) vazio.focus();
    else document.querySelector('#regForm button[type="submit"]')?.focus();
}

/* Enquanto se lança um atendimento, a lista atrás do modal mostra só o
   paciente escolhido. closeModal() devolve a lista completa. */
let pacienteIsolado = '';

function isolarPaciente(patientId) {
    pacienteIsolado = patientId || '';
    aplicarIsolamento();
}

function aplicarIsolamento() {
    document.querySelectorAll('.registro-group').forEach(g => {
        const alvo = !pacienteIsolado || g.dataset.patientId === pacienteIsolado;
        g.style.display = alvo ? '' : 'none';
        if (alvo && pacienteIsolado) setGrupoAberto(g, true);
    });
    const buscaNome = document.getElementById('registroSearch')?.value || '';
    const buscaData = document.getElementById('registroDateSearch')?.value || '';
    if (buscaNome || buscaData) filterRegistros();
}

let regNoticeTimer = null;

/* Aviso grande e centralizado dentro da caixa "Novo Registro RAAS".
   Fora do modal (ex.: exclusão na lista) continua usando o toast do topo. */
function showRegNotice(msg, type = 'success') {
    const modal = document.getElementById('regModal');
    const wrap = document.getElementById('regNotice');
    const box = document.getElementById('regNoticeBox');
    if (!modal || !wrap || !box || modal.style.display === 'none') {
        showToast(msg, type);
        return;
    }
    const tamanho = msg.length <= 24 ? 'curta' : (msg.length <= 48 ? 'media' : 'longa');
    box.textContent = msg;
    box.className = `reg-notice-box reg-notice-${type} reg-notice-${tamanho}`;
    wrap.hidden = false;
    positionRegNotice();
    clearTimeout(regNoticeTimer);
    regNoticeTimer = setTimeout(hideRegNotice, 3000);
}

/* Cola o aviso sobre o retângulo visível do modal, para ficar no centro do
   interior da caixa mesmo depois de arrastada. */
function positionRegNotice() {
    const wrap = document.getElementById('regNotice');
    const modal = document.querySelector('#regModal .modal');
    if (!wrap || !modal || wrap.hidden) return;
    const rect = modal.getBoundingClientRect();
    // Interseção com a tela: se o modal foi arrastado para fora, o aviso
    // continua inteiro dentro da área visível.
    let left = Math.max(rect.left, 0);
    let top = Math.max(rect.top, 0);
    let width = Math.min(rect.right, window.innerWidth) - left;
    let height = Math.min(rect.bottom, window.innerHeight) - top;
    if (width < 260 || height < 120) {
        left = 0;
        top = 0;
        width = window.innerWidth;
        height = window.innerHeight;
    }
    wrap.style.left = `${left}px`;
    wrap.style.top = `${top}px`;
    wrap.style.width = `${width}px`;
    wrap.style.height = `${height}px`;
}

window.addEventListener('resize', positionRegNotice);

function hideRegNotice() {
    clearTimeout(regNoticeTimer);
    const wrap = document.getElementById('regNotice');
    if (wrap) wrap.hidden = true;
}

function selectedMonth() {
    return document.getElementById('monthPicker').value;
}

/* Primeiro e último dia da competência selecionada (YYYY-MM). */
function monthBounds(month) {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { first: `${month}-01`, last: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/* Trava o campo de data na competência aberta, para não lançar o
   atendimento de um mês dentro de outro. */
function applyMonthLimits() {
    const month = selectedMonth();
    const input = document.querySelector('[name="service_date"]');
    if (!input || !month) return;
    const { first, last } = monthBounds(month);
    input.min = first;
    input.max = last;
    if (input.value && input.value.slice(0, 7) !== month) input.value = '';
}

/* Data inicial: hoje, se estiver dentro da competência; senão, o 1º dia dela. */
function defaultServiceDate() {
    const month = selectedMonth();
    const hoje = todayIso();
    return hoje.slice(0, 7) === month ? hoje : monthBounds(month).first;
}

let sidebarAutoCollapsed = false;

function collapseSidebarForModal() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
        sidebarAutoCollapsed = sidebar.classList.contains('show');
        sidebar.classList.remove('show');
    } else {
        if (sidebar.classList.contains('collapsed')) { sidebarAutoCollapsed = false; return; }
        sidebarAutoCollapsed = true;
        sidebar.classList.add('collapsed');
        if (main) main.classList.add('expanded');
    }
}

function restoreSidebarAfterModal() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    if (!sidebar || !sidebarAutoCollapsed) { sidebarAutoCollapsed = false; return; }
    sidebarAutoCollapsed = false;
    if (window.innerWidth <= 768) {
        sidebar.classList.add('show');
    } else {
        sidebar.classList.remove('collapsed');
        if (main) main.classList.remove('expanded');
    }
}

function openModal(id = null) {
    collapseSidebarForModal();
    hideRegNotice();
    limparErrosSelecao();
    isolarPaciente('');
    document.getElementById('regModal').style.display = 'flex';
    resetModalPosition();
    document.getElementById('modalTitle').textContent = id ? 'Editar Registro' : 'Novo Registro RAAS';
    document.getElementById('regForm').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-patient-id').value = '';
    document.getElementById('patientSearch').value = '';
    document.getElementById('patientResults').style.display = 'none';
    document.getElementById('form-professional-id').value = '';
    document.getElementById('profSearch').value = '';
    document.getElementById('profResults').style.display = 'none';
    resetProcRows();
    updateAuthorizationVisibility();
    const addProcBtn = document.getElementById('addProcBtn');
    addProcBtn.dataset.forceHidden = id ? '1' : '0';
    addProcBtn.style.display = id ? 'none' : '';
    const month = document.getElementById('monthPicker').value;
    document.getElementById('form-month').value = month;
    applyMonthLimits();
    if (!id) {
        document.querySelector('[name="service_date"]').value = defaultServiceDate();
    }
    if (!id) focarPrimeiroCampoVazio();
    if (id) {
        fetch(`/api/registros/${id}`).then(r => r.json()).then(r => {
            for (const [k, v] of Object.entries(r)) {
                if (k === 'patient_id') {
                    document.getElementById('form-patient-id').value = v;
                    const p = PACIENTES_DATA.find(p => p.id === v);
                    if (p) document.getElementById('patientSearch').value = p.name;
                    continue;
                }
                if (k === 'professional_id') {
                    document.getElementById('form-professional-id').value = v;
                    const prof = PROFISSIONAIS_DATA.find(p => p.id === v);
                    if (prof) document.getElementById('profSearch').value = prof.name;
                    continue;
                }
                if (k === 'procedure_id') {
                    const row = document.querySelector('#procRows .proc-row');
                    const proc = PROCEDIMENTOS_DATA.find(p => p.id === v);
                    row.querySelector('.proc-hidden-id').value = v;
                    row.querySelector('.proc-search-input').value = proc ? proc.label : '';
                    continue;
                }
                if (k === 'quantity') {
                    document.querySelector('#procRows .proc-row input[type="number"]').value = v;
                    continue;
                }
                const el = document.querySelector(`[name="${k}"]`);
                if (el) el.value = v ?? '';
            }
            updateAuthorizationVisibility();
        });
    }
}

function editReg(id) {
    openModal(id);
}

function closeModal() {
    hideRegNotice();
    limparErrosSelecao();
    isolarPaciente('');
    document.getElementById('regModal').style.display = 'none';
    restoreSidebarAfterModal();
    if (listRefreshPending) {
        listRefreshPending = false;
        location.reload();
    }
}

async function saveReg(e) {
    e.preventDefault();
    const saveButton = e.submitter || document.querySelector('#regForm button[type="submit"]');
    if (saveButton.disabled) return;
    // A mensagem vai em cada campo pendente; o aviso central cobriria justamente
    // os campos que o usuário precisa corrigir.
    if (!validarSelecoes()) return;
    saveButton.disabled = true;
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const id = data.id;
    delete data.id;
    for (const k in data) {
        if (k.startsWith('procedure_id_') || k.startsWith('quantity_')) delete data[k];
    }
    for (const k in data) { if (data[k] === '') delete data[k]; }

    const procRows = Array.from(document.querySelectorAll('#procRows .proc-row')).map(row => ({
        procedure_id: row.querySelector('.proc-hidden-id').value,
        quantity: parseInt(row.querySelector('input[type="number"]').value) || 1,
    })).filter(r => r.procedure_id);

    if (procRows.length === 0) {
        showRegNotice('Selecione ao menos um procedimento', 'error');
        saveButton.disabled = false;
        return;
    }

    const month = data.service_month;
    if (month && data.service_date && data.service_date.slice(0, 7) !== month) {
        showRegNotice(`Data do atendimento fora da competência ${month}`, 'error');
        saveButton.disabled = false;
        return;
    }

    let resp;
    if (procRows.length > 1 && !id) {
        const payloads = procRows.map(r => ({ ...data, procedure_id: r.procedure_id, quantity: r.quantity }));
        resp = await fetch('/api/registros/varios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloads)
        });
    } else {
        const payload = { ...data, procedure_id: procRows[0].procedure_id, quantity: procRows[0].quantity };
        const url = id ? `/api/registros/${id}` : '/api/registros/';
        const method = id ? 'PUT' : 'POST';
        resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    if (resp.ok) {
        showRegNotice(id ? 'Registro atualizado' : 'Registro(s) criado(s)');
        if (id) {
            // Recarregar a página fecharia todos os grupos; atualizar a lista
            // deixa o paciente aberto para conferir o que mudou.
            try {
                await refreshRegistrosList(data.patient_id);
                listRefreshPending = false;
            } catch (error) {
                listRefreshPending = true;
            }
            setTimeout(closeModal, 800);
            saveButton.disabled = false;
        } else {
            try {
                await refreshRegistrosList(data.patient_id);
                listRefreshPending = false;
            } catch (error) {
                listRefreshPending = true;
                showRegNotice('Registro salvo, mas a lista não foi atualizada', 'error');
            }
            prepareNextRecord(data.service_date);
            saveButton.disabled = false;
        }
    } else {
        let msg = 'Erro ao salvar';
        try {
            const err = await resp.json();
            if (err.detail) msg = typeof err.detail === 'string' ? err.detail : msg;
        } catch (e) { /* ignore */ }
        showRegNotice(msg, 'error');
        saveButton.disabled = false;
    }
}

async function deleteReg(id) {
    if (!confirm('Excluir este registro?')) return;
    const row = document.querySelector(`tr[data-registro-id="${CSS.escape(id)}"]`);
    const patientId = row?.closest('.registro-group')?.dataset.patientId || '';

    const resp = await fetch(`/api/registros/${id}`, { method: 'DELETE' });
    if (!resp.ok) {
        showToast('Erro ao excluir registro', 'error');
        return;
    }

    showToast('Registro excluído');
    try {
        await refreshRegistrosList(patientId, { scroll: false });
    } catch (error) {
        location.reload();
    }
}

// Caixa "Novo Registro" arrastável — permite manter a lista de pacientes
// visível atrás dela enquanto o profissional preenche o formulário.
function resetModalPosition() {
    const modal = document.querySelector('#regModal .modal');
    if (!modal) return;
    modal.style.position = '';
    modal.style.left = '';
    modal.style.top = '';
    modal.style.margin = '';
}

(function initDraggableRegModal() {
    const modal = document.querySelector('#regModal .modal');
    const header = document.querySelector('#regModal .modal-header');
    if (!modal || !header) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.modal-close')) return;
        const rect = modal.getBoundingClientRect();
        dragging = true;
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        modal.style.position = 'fixed';
        modal.style.margin = '0';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const maxLeft = window.innerWidth - modal.offsetWidth;
        const maxTop = window.innerHeight - modal.offsetHeight;
        const left = Math.max(0, Math.min(e.clientX - offsetX, maxLeft));
        const top = Math.max(0, Math.min(e.clientY - offsetY, maxTop));
        modal.style.left = left + 'px';
        modal.style.top = top + 'px';
    });

    document.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.userSelect = '';
    });
})();
