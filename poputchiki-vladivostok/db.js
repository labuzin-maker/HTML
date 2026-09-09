// Слой работы с базой данных SQLite.
//
// Используем better-sqlite3 — синхронный драйвер без внешнего сервера БД
// (данные лежат в одном файле, см. config.DB_FILE). Синхронный API проще
// читать и расширять, чем цепочки промисов/колбэков, а для нагрузки такого
// сервиса (десятки-сотни заявок) производительность не имеет значения.
//
// Схема немного отличается от буквального ТЗ: вместо текстового поля
// "request_ids" в таблице groups используется отдельная связующая таблица
// group_requests (many-to-many между groups и requests). Это стандартная
// реляционная практика — проще и надёжнее делать JOIN'ы и не нужно вручную
// парсить список id из строки.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

// Убедимся, что папка для файла БД существует
fs.mkdirSync(path.dirname(config.DB_FILE), { recursive: true });

const db = new Database(config.DB_FILE);
db.pragma('journal_mode = WAL'); // чуть надёжнее и быстрее при параллельных запросах

db.exec(`
  -- Заявки от пользователей (туристов)
  CREATE TABLE IF NOT EXISTS requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,                 -- имя
    contact       TEXT NOT NULL,                 -- WeChat ID или телефон
    travel_date   TEXT NOT NULL,                 -- дата поездки, формат YYYY-MM-DD
    route_from    TEXT NOT NULL,                 -- откуда
    route_to      TEXT NOT NULL,                 -- куда
    people_count  INTEGER NOT NULL,               -- количество человек в заявке
    comment       TEXT,                           -- необязательный комментарий
    consent       INTEGER NOT NULL DEFAULT 0,     -- согласие на обработку контактов (0/1)
    -- статус: new (новая) | matched (найдено совпадение) | confirmed (подтверждена) | rejected (отклонена)
    status        TEXT NOT NULL DEFAULT 'new',
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
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

  CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
  CREATE INDEX IF NOT EXISTS idx_requests_route_date ON requests(route_from, route_to, travel_date);
`);

module.exports = db;
