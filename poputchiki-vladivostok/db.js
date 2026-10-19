// Слой работы с базой данных — Turso (облачный SQLite-совместимый сервис,
// протокол libSQL) через официальный клиент @libsql/client.
//
// Почему не локальный файл SQLite, как было раньше (better-sqlite3): сервис
// переехал на Render, а бесплатный Render не даёт постоянный диск — файл
// обнулялся бы при каждом "засыпании"/перезапуске. Turso — это тот же SQLite
// "как будто" по сети: тот же SQL, почти та же логика в коде, просто каждый
// вызов теперь асинхронный (await) вместо синхронного.
//
// Локальная разработка и тесты: клиент умеет работать с обычным файлом
// (`file:./data/db.sqlite`) или in-memory базой (`:memory:`) без всякого
// Turso-аккаунта — тот же API, та же логика, просто данные лежат на диске,
// а не в облаке. Переключение на реальный Turso — это только смена
// TURSO_DATABASE_URL/TURSO_AUTH_TOKEN в .env, код не меняется.
//
// Схема немного отличается от буквального ТЗ: вместо текстового поля
// "request_ids" в таблице groups используется отдельная связующая таблица
// group_requests (many-to-many между groups и requests). Это стандартная
// реляционная практика — проще и надёжнее делать JOIN'ы и не нужно вручную
// парсить список id из строки.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const config = require('./config');

// Для локального file:-режима (разработка, без Turso) убедимся, что папка
// под файл БД существует — в облачном Turso-режиме (url начинается с
// libsql:/https:) это просто ничего не делает.
if (config.TURSO_DATABASE_URL.startsWith('file:')) {
  const filePath = config.TURSO_DATABASE_URL.slice('file:'.length);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const client = createClient({
  url: config.TURSO_DATABASE_URL,
  authToken: config.TURSO_AUTH_TOKEN || undefined,
});

/**
 * Выполнить несколько операций как одну атомарную транзакцию.
 * fn получает объект транзакции (у него тот же .execute(), что и у client) —
 * внутри fn нужно использовать именно его, а не client, иначе запросы пойдут
 * вне транзакции.
 */
async function withTransaction(fn) {
  const tx = await client.transaction('write');
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

// Есть ли колонка `column` в таблице `table`? (для миграции ниже)
async function hasColumn(table, column) {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  return rs.rows.some((c) => c.name === column);
}

async function ensureColumn(table, column, ddl) {
  if (!(await hasColumn(table, column))) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

/**
 * Создать схему (если её ещё нет) и прогнать миграции. Вызывается один раз
 * при старте сервера, до того как он начнёт принимать запросы (см. server.js).
 */
async function initDb() {
  await client.executeMultiple(`
    -- Заявки от пользователей (туристов)
    CREATE TABLE IF NOT EXISTS requests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,                 -- имя
      contact       TEXT NOT NULL,                 -- WeChat ID или телефон
      travel_date   TEXT NOT NULL,                 -- дата поездки, формат YYYY-MM-DD
      route_from    TEXT NOT NULL,                 -- первая точка маршрута (для отображения/сортировки)
      route_to      TEXT NOT NULL,                 -- последняя точка маршрута (для отображения/сортировки)
      people_count  INTEGER NOT NULL,               -- количество человек в заявке
      comment       TEXT,                           -- необязательный комментарий
      consent       INTEGER NOT NULL DEFAULT 0,     -- согласие на обработку контактов (0/1)
      -- статус: new (новая) | matched (найдено совпадение) | confirmed (подтверждена) |
      --         rejected (отклонена админом) | cancelled (отменена самим туристом)
      status        TEXT NOT NULL DEFAULT 'new',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
      cancel_token  TEXT                            -- секрет для самостоятельной отмены заявки туристом (см. server.js)
    );

    -- Группы попутчиков (результат мэтчинга или ручного создания админом)
    CREATE TABLE IF NOT EXISTS groups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      travel_date   TEXT NOT NULL,
      route_from    TEXT NOT NULL,
      route_to      TEXT NOT NULL,
      total_people  INTEGER NOT NULL,
      price         REAL,                            -- согласованная стоимость поездки (общая)
      -- статус: matched (найдено, ждёт решения админа) | confirmed (подтверждена) | rejected (отклонена)
      status        TEXT NOT NULL DEFAULT 'matched',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
      confirmed_at  TEXT
    );

    -- Связь "какие заявки входят в какую группу" (замена текстового request_ids из ТЗ)
    CREATE TABLE IF NOT EXISTS group_requests (
      group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      request_id    INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, request_id)
    );

    -- Общий чат группы (все участники + админ видят одну ленту сообщений) —
    -- для согласования деталей после того, как группа найдена/подтверждена.
    -- Это НЕ приватный чат "турист ↔ админ" (тот — отдельный сторонний
    -- виджет на сайте, с этой таблицей не связан).
    CREATE TABLE IF NOT EXISTS group_messages (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id      INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      author_name   TEXT NOT NULL,                 -- имя заявителя или "Админ"
      author_role   TEXT NOT NULL,                 -- 'member' | 'admin'
      body          TEXT NOT NULL,
      translated_body TEXT,                        -- автоперевод body на "другой" язык (см. translate.js), может быть NULL, если перевод не удался
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_route_date ON requests(route_from, route_to, travel_date);
  `);

  // --- Миграция: составной маршрут (несколько точек, а не только "откуда/куда") ---
  // route_stops — JSON-массив точек по порядку, например '["机场","俄罗斯岛","市中心"]'.
  // route_from/route_to остаются как первая/последняя точка — удобно для
  // сортировки и отображения там, где полный список не нужен.
  await ensureColumn('requests', 'route_stops', 'route_stops TEXT');
  await ensureColumn('groups', 'route_stops', 'route_stops TEXT');
  await ensureColumn('requests', 'cancel_token', 'cancel_token TEXT');
  await ensureColumn('group_messages', 'translated_body', 'translated_body TEXT');

  // Бэкфилл старых строк (если переезжаем с версии БД до этой миграции)
  const oldRequests = await client.execute(
    'SELECT id, route_from, route_to FROM requests WHERE route_stops IS NULL'
  );
  for (const r of oldRequests.rows) {
    await client.execute({
      sql: 'UPDATE requests SET route_stops = ? WHERE id = ? AND route_stops IS NULL',
      args: [JSON.stringify([r.route_from, r.route_to]), r.id],
    });
  }

  const oldGroups = await client.execute(
    'SELECT id, route_from, route_to FROM groups WHERE route_stops IS NULL'
  );
  for (const g of oldGroups.rows) {
    await client.execute({
      sql: 'UPDATE groups SET route_stops = ? WHERE id = ? AND route_stops IS NULL',
      args: [JSON.stringify([g.route_from, g.route_to]), g.id],
    });
  }

  await client.execute('CREATE INDEX IF NOT EXISTS idx_requests_stops_date ON requests(route_stops, travel_date)');
}

module.exports = { client, initDb, withTransaction };
