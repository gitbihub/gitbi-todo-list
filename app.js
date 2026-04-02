// ── State ──────────────────────────────────────────────────────────────────
let todos = JSON.parse(localStorage.getItem('todos') || '[]');
let filter = 'all';
let editingId = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const input       = document.getElementById('new-todo-input');
const btnAdd      = document.getElementById('btn-add');
const listEl      = document.getElementById('todo-list');
const btnClear    = document.getElementById('btn-clear-done');
const statTotal   = document.getElementById('stat-total');
const statDone    = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');

// ── Helpers ────────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── CRUD ───────────────────────────────────────────────────────────────────
function addTodo() {
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  todos.unshift({ id: generateId(), text, done: false });
  input.value = '';
  save();
  render();
  input.focus();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) { todo.done = !todo.done; save(); render(); }
}

function startEdit(id) {
  editingId = id;
  render();
  const el = document.getElementById('edit-' + id);
  if (el) { el.focus(); el.select(); }
}

function saveEdit(id) {
  const el = document.getElementById('edit-' + id);
  const text = el ? el.value.trim() : '';
  if (!text) return;
  const todo = todos.find(t => t.id === id);
  if (todo) { todo.text = text; }
  editingId = null;
  save();
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  if (editingId === id) editingId = null;
  save();
  render();
}

function clearDone() {
  todos = todos.filter(t => !t.done);
  save();
  render();
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const doneCount    = todos.filter(t => t.done).length;
  const pendingCount = todos.length - doneCount;
  statTotal.textContent   = todos.length;
  statDone.textContent    = doneCount;
  statPending.textContent = pendingCount;

  const visible = todos.filter(t => {
    if (filter === 'done')    return t.done;
    if (filter === 'pending') return !t.done;
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
    const isEditing = editingId === todo.id;

    const checkHtml = `
      <div class="todo-check ${todo.done ? 'checked' : ''}"
           data-id="${todo.id}" data-action="toggle"></div>`;

    const textHtml = isEditing
      ? `<input class="todo-edit-input" id="edit-${todo.id}"
                value="${escapeHtml(todo.text)}"
                data-id="${todo.id}" data-action="edit-input"
                maxlength="200" />`
      : `<span class="todo-text ${todo.done ? 'done' : ''}">${escapeHtml(todo.text)}</span>`;

    const actionsHtml = isEditing
      ? `<div class="todo-actions">
           <button class="btn-icon btn-save"   data-id="${todo.id}" data-action="save"   title="저장">✓</button>
           <button class="btn-icon btn-cancel" data-id="${todo.id}" data-action="cancel" title="취소">✕</button>
         </div>`
      : `<div class="todo-actions">
           <button class="btn-icon btn-edit"   data-id="${todo.id}" data-action="edit"   title="수정">✏️</button>
           <button class="btn-icon btn-delete" data-id="${todo.id}" data-action="delete" title="삭제">🗑️</button>
         </div>`;

    return `
      <div class="todo-item" data-id="${todo.id}">
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
render();
