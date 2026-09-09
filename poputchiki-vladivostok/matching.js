// Логика автоматического мэтчинга попутчиков.
//
// Идея: когда приходит новая заявка, ищем среди уже существующих заявок
// со статусом "new" те, что подходят по маршруту и дате. Если суммарное
// число человек (новая заявка + подходящие) укладывается в диапазон
// [MIN_GROUP_SIZE, MAX_GROUP_SIZE] — создаём группу и переводим все
// участвующие заявки в статус "matched".
//
// Важные решения (сознательно упрощаем ТЗ для первой версии):
// 1. В кандидаты берём только заявки со статусом "new". Заявки, уже
//    состоящие в какой-то группе ("matched"/"confirmed"), не трогаем —
//    иначе можно неожиданно для админа "растащить" уже собранную группу.
// 2. Группа считается "найденной" только если в неё вошла хотя бы одна
//    ДРУГАЯ заявка, а не только сама новая. Одна заявка на 2+ человек без
//    попутчиков — это не "совпадение", а просто большая заявка.
// 3. Набор кандидатов в группу собирается жадно (greedy) по порядку подачи
//    заявок (кто раньше подал — тот раньше попадает в группу), пока не
//    достигнут MAX_GROUP_SIZE. Это не идеальный алгоритм упаковки, но для
//    небольших чисел (обычно 1-4 человека в заявке) он даёт разумный
//    результат и легко понимается. Более сложные случаи админ всегда может
//    поправить руками через ручное создание группы в админ-панели.

const db = require('./db');
const config = require('./config');

/**
 * Найти подходящих активных кандидатов для заявки request (не включая её саму).
 *
 * Маршрут может состоять из нескольких точек ("сложный маршрут", как у
 * авиакомпаний) — сравниваем route_stops целиком, точным совпадением JSON-строки.
 * Это значит, что порядок точек имеет значение: "机场→俄罗斯岛→市中心" и
 * "俄罗斯岛→机场→市中心" — разные маршруты и не смэтчатся между собой.
 */
function findCandidates(request) {
  // ABS(julianday(a) - julianday(b)) — разница дат в днях, работает для дат в формате YYYY-MM-DD
  const stmt = db.prepare(`
    SELECT * FROM requests
    WHERE id != ?
      AND status = 'new'
      AND route_stops = ?
      AND ABS(julianday(travel_date) - julianday(?)) <= ?
    ORDER BY created_at ASC
  `);
  return stmt.all(
    request.id,
    request.route_stops,
    request.travel_date,
    config.DATE_TOLERANCE_DAYS
  );
}

/**
 * Попытаться найти и создать группу для только что сохранённой заявки.
 * Возвращает объект { group, members } если группа создана, иначе null.
 */
function findAndCreateMatch(requestId) {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request || request.status !== 'new') {
    return null; // заявки не существует или она уже куда-то определена
  }

  const candidates = findCandidates(request);

  // Жадно набираем группу: начинаем с самой заявки, дальше добавляем
  // кандидатов по очереди, пока не упрёмся в MAX_GROUP_SIZE.
  const chosen = [request];
  let total = request.people_count;

  for (const candidate of candidates) {
    if (total + candidate.people_count <= config.MAX_GROUP_SIZE) {
      chosen.push(candidate);
      total += candidate.people_count;
    }
  }

  const foundSomeoneElse = chosen.length > 1;
  const sizeIsOk = total >= config.MIN_GROUP_SIZE && total <= config.MAX_GROUP_SIZE;

  if (!foundSomeoneElse || !sizeIsOk) {
    return null; // совпадений нет — заявка остаётся в статусе "new"
  }

  // Создаём группу и переводим все заявки в статус "matched" одной транзакцией
  const createGroup = db.transaction(() => {
    const insertGroup = db.prepare(`
      INSERT INTO groups (travel_date, route_from, route_to, route_stops, total_people, status)
      VALUES (?, ?, ?, ?, ?, 'matched')
    `);
    const info = insertGroup.run(
      request.travel_date,
      request.route_from,
      request.route_to,
      request.route_stops,
      total
    );
    const groupId = info.lastInsertRowid;

    const linkRequest = db.prepare('INSERT INTO group_requests (group_id, request_id) VALUES (?, ?)');
    const markMatched = db.prepare("UPDATE requests SET status = 'matched' WHERE id = ?");

    for (const member of chosen) {
      linkRequest.run(groupId, member.id);
      markMatched.run(member.id);
    }

    return groupId;
  });

  const groupId = createGroup();
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);

  return { group, members: chosen };
}

function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / 86400000);
}

/**
 * Найти "частичные совпадения" — пары заявок со статусом "new", у которых
 * даты близки (в пределах DATE_TOLERANCE_DAYS) и маршруты пересекаются хотя
 * бы в одной точке, но НЕ совпадают полностью (иначе это уже обычный
 * авто-мэтч из findAndCreateMatch, и заявки туда бы не попали со статусом "new").
 *
 * Это не авто-группировка — это подсказка для админ-панели: "вот два
 * человека, которым, возможно, стоит договориться и скорректировать
 * маршрут, чтобы поехать вместе". Решение и дальшейшие действия (ручное
 * создание группы через уже существующий POST /api/admin/groups) — за
 * администратором.
 *
 * Считается по всем активным заявкам сразу (не по одной новой) — сравнение
 * маршрутов через JSON нельзя сделать в SQL, поэтому просто перебираем все
 * пары в JS; при небольшом количестве активных заявок (десятки, не тысячи)
 * это быстро и просто.
 */
function findPartialMatches() {
  const rows = db.prepare("SELECT * FROM requests WHERE status = 'new' ORDER BY created_at ASC").all();

  const parsed = rows.map((r) => {
    let stops = [];
    try {
      stops = JSON.parse(r.route_stops) || [];
    } catch (e) {
      stops = [];
    }
    return { request: r, stops };
  });

  const pairs = [];
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];

      if (daysBetween(a.request.travel_date, b.request.travel_date) > config.DATE_TOLERANCE_DAYS) continue;

      const sameRoute = JSON.stringify(a.stops) === JSON.stringify(b.stops);
      if (sameRoute) continue; // это обычный точный мэтч, а не частичный — сюда не попадаем

      const sharedStops = a.stops.filter((s) => b.stops.includes(s));
      if (sharedStops.length === 0) continue;

      pairs.push({ requestA: a.request, requestB: b.request, sharedStops });
    }
  }

  return pairs;
}

module.exports = { findAndCreateMatch, findCandidates, findPartialMatches };
