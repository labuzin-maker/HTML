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

  // Путь к файлу базы данных SQLite
  DB_FILE: process.env.DB_FILE
    ? path.resolve(__dirname, process.env.DB_FILE)
    : path.join(__dirname, 'data', 'db.sqlite'),

  // --- Настройки мэтчинга (см. matching.js) ---
  MIN_GROUP_SIZE: toInt(process.env.MIN_GROUP_SIZE, 2),
  MAX_GROUP_SIZE: toInt(process.env.MAX_GROUP_SIZE, 4),
  DATE_TOLERANCE_DAYS: toInt(process.env.DATE_TOLERANCE_DAYS, 1),

  // --- Админ-панель (простая защита паролем, HTTP Basic Auth) ---
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change-me',
};
