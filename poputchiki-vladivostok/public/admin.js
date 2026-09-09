// Клиентская логика админ-панели. Обычный fetch к /api/admin/* — авторизация
// (HTTP Basic Auth) браузер запрашивает один раз при заходе на /admin и потом
// сам подставляет её в остальные запросы того же источника.

const STATUS_LABELS = {
  new: 'новая',
  matched: 'есть совпадение',
  confirmed: 'подтверждена',
  rejected: 'отклонена',
};

const noticeEl = document.getElementById('notice');

function showNotice(text, type) {
  noticeEl.textContent = text;
  noticeEl.className = 'notice notice-' + (type || 'success');
  noticeEl.hidden = false;
  setTimeout(() => { noticeEl.hidden = true; }, 6000);
}

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка запроса: ' + res.status);
  return res.json();
}

async function apiSend(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Ошибка запроса: ' + res.status);
  }
  return data;
}

// --- Заявки -----------------------------------------------------------

async function loadRequests() {
  const status = document.getElementById('status-filter').value;
  const url = status ? `/api/admin/requests?status=${encodeURIComponent(status)}` : '/api/admin/requests';
  const data = await apiGet(url);
  renderRequests(data.requests);
}

function renderRequests(requests) {
  const tbody = document.querySelector('#requests-table tbody');
  tbody.innerHTML = '';

  for (const r of requests) {
    const tr = document.createElement('tr');
    const canSelect = r.status === 'new';

    tr.innerHTML = `
      <td>${canSelect ? `<input type="checkbox" class="req-checkbox" value="${r.id}">` : ''}</td>
      <td>${r.id}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.contact)}</td>
      <td>${escapeHtml(r.travel_date)}</td>
      <td>${escapeHtml(r.route_from)} → ${escapeHtml(r.route_to)}</td>
      <td>${r.people_count}</td>
      <td>${escapeHtml(r.comment || '—')}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="muted">${escapeHtml(r.created_at)}</td>
      <td><button type="button" class="btn btn-danger btn-small delete-req-btn" data-id="${r.id}">Удалить</button></td>
    `;
    tbody.appendChild(tr);
  }
}

// Делегируем клик на всю таблицу — строки перерисовываются целиком при
// каждом обновлении, поэтому проще один раз слушать контейнер, чем
// навешивать обработчик на каждую новую кнопку.
document.querySelector('#requests-table tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-req-btn');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!confirm(`Удалить заявку #${id}? Если она была в группе — группа пересчитается или удалится, если участников не останется.`)) {
    return;
  }

  try {
    await apiSend(`/api/admin/requests/${id}`, 'DELETE');
    showNotice('Заявка удалена', 'success');
    await refreshAll();
  } catch (err) {
    showNotice(err.message, 'error');
  }
});

document.getElementById('create-group-btn').addEventListener('click', async () => {
  const ids = Array.from(document.querySelectorAll('.req-checkbox:checked')).map((el) => Number(el.value));
  if (ids.length === 0) {
    showNotice('Отметьте хотя бы одну заявку', 'error');
    return;
  }
  try {
    await apiSend('/api/admin/groups', 'POST', { request_ids: ids });
    showNotice('Группа создана вручную', 'success');
    await refreshAll();
  } catch (err) {
    showNotice(err.message, 'error');
  }
});

document.getElementById('status-filter').addEventListener('change', loadRequests);

// --- Группы -------------------------------------------------------------

async function loadGroups() {
  const data = await apiGet('/api/admin/groups');
  renderGroups(data.groups);
}

function renderGroups(groups) {
  const container = document.getElementById('groups-list');
  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML = '<p class="muted">Пока нет ни одной группы.</p>';
    return;
  }

  for (const g of groups) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = '#fafbfc';

    const membersRows = g.members
      .map(
        (m) => `<tr>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.contact)}</td>
          <td>${m.people_count}</td>
          <td>${escapeHtml(m.comment || '—')}</td>
        </tr>`
      )
      .join('');

    const isDecided = g.status !== 'matched';

    card.innerHTML = `
      <div class="top-bar">
        <div>
          <strong>Группа #${g.id}</strong> ${statusBadge(g.status)}
          <div class="muted">${escapeHtml(g.travel_date)} · ${escapeHtml(g.route_from)} → ${escapeHtml(g.route_to)} · ${g.total_people} чел.</div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Имя</th><th>Контакт</th><th>Чел.</th><th>Комментарий</th></tr></thead>
          <tbody>${membersRows}</tbody>
        </table>
      </div>

      <div class="field" style="margin-top:14px;max-width:260px;">
        <label>Цена поездки (общая, ₽)</label>
        <div class="row">
          <input type="number" min="0" step="1" class="price-input" value="${g.price ?? ''}" ${isDecided ? 'disabled' : ''}>
          <button class="btn btn-outline btn-small price-save-btn" ${isDecided ? 'disabled' : ''}>Сохранить</button>
        </div>
      </div>

      ${
        !isDecided
          ? `<div class="row" style="margin-top:12px;">
              <button class="btn btn-success btn-small confirm-btn">Подтвердить группу</button>
              <button class="btn btn-danger btn-small reject-btn">Отклонить</button>
            </div>`
          : ''
      }

      <div class="messages-area"></div>
    `;

    card.querySelector('.price-save-btn')?.addEventListener('click', async () => {
      const price = Number(card.querySelector('.price-input').value);
      try {
        await apiSend(`/api/admin/groups/${g.id}/price`, 'PUT', { price });
        showNotice('Цена сохранена', 'success');
      } catch (err) {
        showNotice(err.message, 'error');
      }
    });

    card.querySelector('.confirm-btn')?.addEventListener('click', async () => {
      try {
        const data = await apiSend(`/api/admin/groups/${g.id}/confirm`, 'POST');
        showNotice('Группа подтверждена', 'success');
        renderWeChatMessages(card, data.messages);
        await refreshAll();
      } catch (err) {
        showNotice(err.message, 'error');
      }
    });

    card.querySelector('.reject-btn')?.addEventListener('click', async () => {
      if (!confirm('Отклонить эту группу? Все заявки в ней получат статус "отклонена".')) return;
      try {
        await apiSend(`/api/admin/groups/${g.id}/reject`, 'POST');
        showNotice('Группа отклонена', 'success');
        await refreshAll();
      } catch (err) {
        showNotice(err.message, 'error');
      }
    });

    container.appendChild(card);
  }
}

// Показывает готовые тексты для ручной отправки в WeChat (заглушка первого этапа).
function renderWeChatMessages(card, messages) {
  const area = card.querySelector('.messages-area');
  if (!messages || messages.length === 0) return;

  area.innerHTML =
    '<p class="hint" style="margin-top:14px;"><strong>Сообщения для ручной отправки в WeChat:</strong></p>' +
    messages
      .map(
        (m) => `<div class="message-box"><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.contact)}):\n${escapeHtml(m.message)}</div>`
      )
      .join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function refreshAll() {
  await Promise.all([loadRequests(), loadGroups()]);
}

document.getElementById('refresh-btn').addEventListener('click', refreshAll);

refreshAll();
