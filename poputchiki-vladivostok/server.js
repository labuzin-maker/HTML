// Точка входа приложения: Express-сервер со всеми роутами.
//
// Структура простая и линейная (без роутеров/контроллеров в отдельных
// файлах) — для проекта такого размера это легче читать и расширять.
// Когда роутов станет много, их можно вынести в папку routes/.

const path = require('path');
const express = require('express');

const config = require('./config');
const db = require('./db');
const { findAndCreateMatch } = require('./matching');
const { sendTelegramMessage, buildMatchNotification } = require('./telegram');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Публичное API: форма подачи заявки
// ---------------------------------------------------------------------------

// Список маршрутов, разрешённых для выбора (кроме варианта "其他" / "другое",
// где пользователь вводит свой текст). Дублируется на фронтенде в index.html —
// если понадобится единый источник правды, можно отдавать этот список через
// отдельный GET /api/routes.
const KNOWN_ROUTES = [
  ['机场', '市中心'],
  ['市中心', '机场'],
  ['市中心', '俄罗斯岛'],
  ['俄罗斯岛', '市中心'],
  ['火车站', '市中心'],
];

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// POST /api/requests — сохранить новую заявку и попытаться найти совпадение
app.post('/api/requests', (req, res) => {
  const body = req.body || {};

  const name = String(body.name || '').trim();
  const contact = String(body.contact || '').trim();
  const travelDate = String(body.travel_date || '').trim();
  const routeFrom = String(body.route_from || '').trim();
  const routeTo = String(body.route_to || '').trim();
  const peopleCount = parseInt(body.people_count, 10);
  const comment = body.comment ? String(body.comment).trim() : null;
  const consent = Boolean(body.consent);

  // Серверная валидация — не доверяем только фронтенду
  const errors = [];
  if (!name) errors.push('姓名不能为空');
  if (!contact) errors.push('请填写联系方式');
  if (!isValidDate(travelDate)) errors.push('请选择正确的出行日期');
  if (!routeFrom || !routeTo) errors.push('请选择或填写路线');
  if (!Number.isInteger(peopleCount) || peopleCount < 1) errors.push('人数至少为1人');
  if (peopleCount > config.MAX_GROUP_SIZE) errors.push(`单次申请人数不能超过 ${config.MAX_GROUP_SIZE} 人`);
  if (!consent) errors.push('请勾选同意授权处理联系方式');

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  const insert = db.prepare(`
    INSERT INTO requests (name, contact, travel_date, route_from, route_to, people_count, comment, consent, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'new')
  `);
  const info = insert.run(name, contact, travelDate, routeFrom, routeTo, peopleCount, comment);
  const requestId = info.lastInsertRowid;

  // Пытаемся найти совпадение сразу после сохранения
  const match = findAndCreateMatch(requestId);

  if (match) {
    // Не блокируем ответ пользователю ожиданием Telegram — просто запускаем отправку
    sendTelegramMessage(buildMatchNotification(match.group, match.members));
  }

  res.json({ ok: true, matched: Boolean(match) });
});

// ---------------------------------------------------------------------------
// Защита админ-раздела: простой HTTP Basic Auth
// ---------------------------------------------------------------------------

function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user === config.ADMIN_USER && pass === config.ADMIN_PASSWORD) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Требуется авторизация администратора');
}

app.use('/admin', requireAdminAuth);
app.use('/api/admin', requireAdminAuth);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------------------------------------------------------------------------
// Админ API: заявки
// ---------------------------------------------------------------------------

// GET /api/admin/requests?status=new — список заявок, опционально с фильтром по статусу
app.get('/api/admin/requests', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare('SELECT * FROM requests WHERE status = ? ORDER BY created_at DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM requests ORDER BY created_at DESC').all();
  }
  res.json({ ok: true, requests: rows });
});

// ---------------------------------------------------------------------------
// Админ API: группы
// ---------------------------------------------------------------------------

// Достаём группу вместе со списком участников (заявок)
function getGroupWithMembers(groupId) {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return null;
  const members = db
    .prepare(
      `SELECT r.* FROM requests r
       JOIN group_requests gr ON gr.request_id = r.id
       WHERE gr.group_id = ?
       ORDER BY r.created_at ASC`
    )
    .all(groupId);
  return { ...group, members };
}

// GET /api/admin/groups — список всех групп с участниками
app.get('/api/admin/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at DESC').all();
  const withMembers = groups.map((g) => getGroupWithMembers(g.id));
  res.json({ ok: true, groups: withMembers });
});

// POST /api/admin/groups — создать группу вручную из выбранных заявок
// body: { request_ids: number[] }
app.post('/api/admin/groups', (req, res) => {
  const requestIds = Array.isArray(req.body?.request_ids) ? req.body.request_ids.map(Number) : [];

  if (requestIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'Не выбраны заявки для группы' });
  }

  const placeholders = requestIds.map(() => '?').join(',');
  const requests = db.prepare(`SELECT * FROM requests WHERE id IN (${placeholders})`).all(...requestIds);

  if (requests.length !== requestIds.length) {
    return res.status(400).json({ ok: false, error: 'Часть заявок не найдена' });
  }

  const alreadyGrouped = requests.filter((r) => r.status !== 'new');
  if (alreadyGrouped.length > 0) {
    return res.status(400).json({
      ok: false,
      error: `Заявки уже не в статусе "новая": ${alreadyGrouped.map((r) => r.id).join(', ')}`,
    });
  }

  // Для ручного создания группы не требуем совпадения маршрута/даты у всех
  // заявок — админ мог осознанно объединить похожие, но не идентичные заявки.
  // За дату/маршрут группы берём значения первой заявки.
  const first = requests[0];
  const totalPeople = requests.reduce((sum, r) => sum + r.people_count, 0);

  const createGroup = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO groups (travel_date, route_from, route_to, total_people, status)
         VALUES (?, ?, ?, ?, 'matched')`
      )
      .run(first.travel_date, first.route_from, first.route_to, totalPeople);

    const groupId = info.lastInsertRowid;
    const linkRequest = db.prepare('INSERT INTO group_requests (group_id, request_id) VALUES (?, ?)');
    const markMatched = db.prepare("UPDATE requests SET status = 'matched' WHERE id = ?");

    for (const r of requests) {
      linkRequest.run(groupId, r.id);
      markMatched.run(r.id);
    }

    return groupId;
  });

  const groupId = createGroup();
  res.json({ ok: true, group: getGroupWithMembers(groupId) });
});

// PUT /api/admin/groups/:id/price — установить цену поездки для группы
app.put('/api/admin/groups/:id/price', (req, res) => {
  const groupId = Number(req.params.id);
  const price = Number(req.body?.price);

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({ ok: false, error: 'Некорректная цена' });
  }

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ ok: false, error: 'Группа не найдена' });

  db.prepare('UPDATE groups SET price = ? WHERE id = ?').run(price, groupId);
  res.json({ ok: true, group: getGroupWithMembers(groupId) });
});

// Шаблон сообщения для ручной отправки участнику в WeChat.
// Это заглушка первого этапа: реальную интеграцию с WeChat можно добавить позже,
// подставив сюда вызов соответствующего API вместо возврата текста в админку.
function buildWeChatMessage(member, group) {
  const perPerson = group.price ? Math.round((group.price / group.total_people) * 100) / 100 : null;
  const priceLine = group.price
    ? `费用:${group.price} 卢布(人均约 ${perPerson} 卢布)`
    : '费用:待确定';

  return [
    `您好,${member.name}!`,
    '已为您匹配到同行的拼车伙伴 🚗',
    `日期:${group.travel_date}`,
    `路线:${group.route_from} → ${group.route_to}`,
    `总人数:${group.total_people} 人`,
    priceLine,
    '请确认是否参加,谢谢!',
  ].join('\n');
}

// POST /api/admin/groups/:id/confirm — подтвердить группу
app.post('/api/admin/groups/:id/confirm', (req, res) => {
  const groupId = Number(req.params.id);
  const group = getGroupWithMembers(groupId);
  if (!group) return res.status(404).json({ ok: false, error: 'Группа не найдена' });

  const confirmGroup = db.transaction(() => {
    db.prepare(
      "UPDATE groups SET status = 'confirmed', confirmed_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = ?"
    ).run(groupId);
    const markConfirmed = db.prepare("UPDATE requests SET status = 'confirmed' WHERE id = ?");
    for (const m of group.members) {
      markConfirmed.run(m.id);
    }
  });
  confirmGroup();

  const updatedGroup = getGroupWithMembers(groupId);

  // Заглушка отправки в WeChat: возвращаем готовые тексты сообщений,
  // чтобы админ мог скопировать их и отправить руками каждому участнику.
  const messages = updatedGroup.members.map((m) => ({
    request_id: m.id,
    name: m.name,
    contact: m.contact,
    message: buildWeChatMessage(m, updatedGroup),
  }));

  res.json({ ok: true, group: updatedGroup, messages });
});

// POST /api/admin/groups/:id/reject — отклонить группу
app.post('/api/admin/groups/:id/reject', (req, res) => {
  const groupId = Number(req.params.id);
  const group = getGroupWithMembers(groupId);
  if (!group) return res.status(404).json({ ok: false, error: 'Группа не найдена' });

  const rejectGroup = db.transaction(() => {
    db.prepare("UPDATE groups SET status = 'rejected' WHERE id = ?").run(groupId);
    const markRejected = db.prepare("UPDATE requests SET status = 'rejected' WHERE id = ?");
    for (const m of group.members) {
      markRejected.run(m.id);
    }
  });
  rejectGroup();

  res.json({ ok: true, group: getGroupWithMembers(groupId) });
});

app.listen(config.PORT, () => {
  console.log(`Сервер "Попутчики во Владивосток" запущен: http://localhost:${config.PORT}`);
  console.log(`Админ-панель: http://localhost:${config.PORT}/admin (логин/пароль см. .env)`);
});
