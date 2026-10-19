// Push-уведомления о новых заявках через ntfy (https://ntfy.sh).
//
// Почему ntfy, а не Telegram (который был убран из проекта): ntfy бесплатен,
// не требует регистрации бота, есть родное приложение на iOS/Android —
// сервер просто делает обычный POST-запрос на публичный сервер ntfy.sh,
// а приложение на телефоне, подписанное на тот же "топик" (по сути —
// имя канала), сразу показывает push-уведомление.
//
// ВАЖНО про безопасность: топик на публичном ntfy.sh — это фактически
// секретное имя, а не настоящий пароль. Любой, кто узнает точное имя
// топика, может присылать в него сообщения или читать чужие. Поэтому
// NTFY_TOPIC должен быть длинной случайной строкой, а не простым словом
// (см. .env.example — там сгенерирован пример).

const config = require('./config');

function isConfigured() {
  return Boolean(config.NTFY_TOPIC);
}

/**
 * Отправить push-уведомление. Ошибки сети не бросаем наружу — это
 * уведомление, а не критическая операция: заявка должна сохраниться
 * в любом случае, даже если пуш не дошёл.
 */
async function sendPushNotification(title, message) {
  if (!isConfigured()) {
    console.log('[notify] NTFY_TOPIC не задан — уведомление не отправлено.');
    console.log(`[notify] ${title}\n${message}`);
    return;
  }

  const url = `${config.NTFY_SERVER}/${config.NTFY_TOPIC}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Title: encodeRfc2047(title),
        Priority: 'default',
        Tags: 'car',
      },
      body: message,
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[notify] ntfy вернул ошибку:', response.status, body);
    }
  } catch (err) {
    console.error('[notify] Не удалось отправить push-уведомление:', err.message);
  }
}

// Заголовок (HTTP-заголовок Title) должен быть ASCII — не-ASCII символы
// (например, русский или китайский текст) нужно закодировать по RFC 2047,
// иначе fetch/ntfy может отбросить или испортить заголовок.
function encodeRfc2047(text) {
  if (/^[\x00-\x7F]*$/.test(text)) return text; // уже чистый ASCII, кодировать не нужно
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

/**
 * Собрать текст уведомления о новой заявке.
 */
function buildNewRequestMessage(request) {
  const route = Array.isArray(request.route_stops) ? request.route_stops.join(' → ') : '';
  const lines = [
    `Маршрут: ${route}`,
    `Дата: ${request.travel_date}`,
    `Человек: ${request.people_count}`,
    `Имя: ${request.name}`,
    `Контакт: ${request.contact}`,
  ];
  if (request.comment) lines.push(`Комментарий: ${request.comment}`);
  return lines.join('\n');
}

module.exports = { sendPushNotification, buildNewRequestMessage, isConfigured };
