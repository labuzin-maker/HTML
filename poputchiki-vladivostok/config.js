// Централизованная конфигурация приложения.
// Все настраиваемые значения читаются из переменных окружения (см. .env.example),
// чтобы менять поведение сервиса без правки кода.

const path = require('path');
require('dotenv').config();

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  // Порт HTTP-сервера
  PORT: toInt(process.env.PORT, 3000),

  // База данных — Turso (облачный SQLite-совместимый сервис, см. db.js).
  // Без TURSO_DATABASE_URL в .env по умолчанию используется обычный локальный
  // файл (../data/db.sqlite) — для разработки и тестов Turso-аккаунт не нужен,
  // тот же код работает и с файлом, и с настоящим Turso.
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'data', 'db.sqlite')}`,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || '',

  // --- Настройки мэтчинга (см. matching.js) ---
  MIN_GROUP_SIZE: toInt(process.env.MIN_GROUP_SIZE, 2),
  MAX_GROUP_SIZE: toInt(process.env.MAX_GROUP_SIZE, 4),
  DATE_TOLERANCE_DAYS: toInt(process.env.DATE_TOLERANCE_DAYS, 1),

  // --- Админ-панель (простая защита паролем, HTTP Basic Auth) ---
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change-me',

  // --- Push-уведомления о новых заявках через ntfy (см. notify.js) ---
  NTFY_SERVER: process.env.NTFY_SERVER || 'https://ntfy.sh',
  NTFY_TOPIC: process.env.NTFY_TOPIC || '',

  // --- Автоперевод чата группы zh↔ru через MyMemory (см. translate.js) ---
  // Необязательно: без него анонимный лимит ~5000 симв/день, с email — 50000.
  TRANSLATE_EMAIL: process.env.TRANSLATE_EMAIL || '',
};
