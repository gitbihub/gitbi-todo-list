const API = 'http://localhost:5000/api/todos';

// ── State ──────────────────────────────────────────────────────────────────
let todos     = [];
let filter    = 'all';
let editingId = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const input       = document.getElementById('new-todo-input');
const btnAdd      = document.getElementById('btn-add');
const listEl      = document.getElementById('todo-list');
const btnClear    = document.getElementById('btn-clear-done');
const statTotal   = document.getElementById('stat-total');
const statDone    = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');

// ── API helpers ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '서버 오류가 발생했습니다.');
  return data;
}

function showError(msg) {
  const el = document.getElementById('error-banner');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function setLoading(on) {
  btnAdd.disabled = on;
  btnAdd.textContent = on ? '...' : '+ 추가';
}

// ── Fetch all ──────────────────────────────────────────────────────────────
async function loadTodos() {
  try {
    todos = await apiFetch('');
    render();
  } catch (e) {
    showError('목록을 불러오지 못했습니다: ' + e.message);
  }
}

// ── CRUD ───────────────────────────────────────────────────────────────────
async function addTodo() {
  const title = input.value.trim();
  if (!title) { input.focus(); return; }
  setLoading(true);
  try {
    const created = await apiFetch('', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    todos.unshift(created);
    input.value = '';
    render();
    input.focus();
  } catch (e) {
    showError('추가 실패: ' + e.message);
  } finally {
    setLoading(false);
  }
}

async function toggleTodo(id) {
  const todo = todos.find(t => t._id === id);
  if (!todo) return;
  try {
    const updated = await apiFetch('/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !todo.completed }),
    });
    Object.assign(todo, updated);
    render();
  } catch (e) {
    showError('완료 상태 변경 실패: ' + e.message);
  }
}

function startEdit(id) {
  editingId = id;
  render();
  const el = document.getElementById('edit-' + id);
  if (el) { el.focus(); el.select(); }
}

async function saveEdit(id) {
  const el = document.getElementById('edit-' + id);
  const title = el ? el.value.trim() : '';
  if (!title) return;
  try {
    const updated = await apiFetch('/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    const todo = todos.find(t => t._id === id);
    if (todo) Object.assign(todo, updated);
    editingId = null;
    render();
  } catch (e) {
    showError('수정 실패: ' + e.message);
  }
}

function cancelEdit() {
  editingId = null;
  render();
}

async function deleteTodo(id) {
  try {
    await apiFetch('/' + id, { method: 'DELETE' });
    todos = todos.filter(t => t._id !== id);
    if (editingId === id) editingId = null;
    render();
  } catch (e) {
    showError('삭제 실패: ' + e.message);
  }
}

async function clearDone() {
  const doneIds = todos.filter(t => t.completed).map(t => t._id);
  if (doneIds.length === 0) return;
  try {
    await Promise.all(doneIds.map(id => apiFetch('/' + id, { method: 'DELETE' })));
    todos = todos.filter(t => !t.completed);
    render();
  } catch (e) {
    showError('완료 항목 삭제 실패: ' + e.message);
    await loadTodos();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const doneCount    = todos.filter(t => t.completed).length;
  const pendingCount = todos.length - doneCount;
  statTotal.textContent   = todos.length;
  statDone.textContent    = doneCount;
  statPending.textContent = pendingCount;

  const visible = todos.filter(t => {
    if (filter === 'done')    return t.completed;
    if (filter === 'pending') return !t.completed;
    return true;
  });

  if (visible.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🌟</span>
        ${filter === 'done'    ? '완료된 항목이 없습니다.'    :
          filter === 'pending' ? '진행 중인 항목이 없습니다.' :
                                 '할일을 추가해보세요!'}
      </div>`;
    return;
  }

  listEl.innerHTML = visible.map(todo => {
    const id        = todo._id;
    const isEditing = editingId === id;

    const checkHtml = `
      <div class="todo-check ${todo.completed ? 'checked' : ''}"
           data-id="${id}" data-action="toggle"></div>`;

    const textHtml = isEditing
      ? `<input class="todo-edit-input" id="edit-${id}"
                value="${escapeHtml(todo.title)}"
                data-id="${id}" data-action="edit-input"
                maxlength="200" />`
      : `<span class="todo-text ${todo.completed ? 'done' : ''}">${escapeHtml(todo.title)}</span>`;

    const actionsHtml = isEditing
      ? `<div class="todo-actions">
           <button class="btn-icon btn-save"   data-id="${id}" data-action="save"   title="저장">✓</button>
           <button class="btn-icon btn-cancel" data-id="${id}" data-action="cancel" title="취소">✕</button>
         </div>`
      : `<div class="todo-actions">
           <button class="btn-icon btn-edit"   data-id="${id}" data-action="edit"   title="수정">✏️</button>
           <button class="btn-icon btn-delete" data-id="${id}" data-action="delete" title="삭제">🗑️</button>
         </div>`;

    return `
      <div class="todo-item" data-id="${id}">
        ${checkHtml}
        ${textHtml}
        ${actionsHtml}
      </div>`;
  }).join('');
}

// ── Event delegation ───────────────────────────────────────────────────────
listEl.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  if (action === 'toggle')  toggleTodo(id);
  if (action === 'edit')    startEdit(id);
  if (action === 'save')    saveEdit(id);
  if (action === 'cancel')  cancelEdit();
  if (action === 'delete')  deleteTodo(id);
});

listEl.addEventListener('keydown', e => {
  if (e.target.dataset.action === 'edit-input') {
    if (e.key === 'Enter')  saveEdit(e.target.dataset.id);
    if (e.key === 'Escape') cancelEdit();
  }
});

btnAdd.addEventListener('click', addTodo);
input.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
btnClear.addEventListener('click', clearDone);

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filter = tab.dataset.filter;
    render();
  });
});

// ── Init ───────────────────────────────────────────────────────────────────
loadTodos();
