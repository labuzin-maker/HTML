// Уведомления администратора в Telegram через Bot API.
//
// Никаких npm-библиотек для этого не подключаем — используем встроенный
// в Node.js fetch и один HTTP-метод sendMessage. Если токен/chat_id не
// заданы в .env, просто пишем сообщение в консоль (удобно для разработки
// без настоящего бота).

const config = require('./config');

function isConfigured() {
  return Boolean(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_ADMIN_CHAT_ID);
}

/**
 * Отправить текстовое сообщение администратору. Ошибки сети/API не бросаем
 * наружу — это уведомление, а не критическая операция, сама заявка должна
 * сохраниться в любом случае.
 */
async function sendTelegramMessage(text) {
  if (!isConfigured()) {
    console.log('[telegram] Бот не настроен (нет TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID).');
    console.log('[telegram] Сообщение, которое было бы отправлено:\n' + text);
    return;
  }

  const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[telegram] Telegram API вернул ошибку:', response.status, body);
    }
  } catch (err) {
    console.error('[telegram] Не удалось отправить сообщение:', err.message);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Сформировать текст уведомления о найденной группе попутчиков.
 * group — строка из таблицы groups, members — массив строк из requests.
 */
function buildMatchNotification(group, members) {
  const lines = [];
  lines.push('🚐 <b>Найдено совпадение по попутчикам!</b>');
  lines.push(`Дата поездки: ${escapeHtml(group.travel_date)}`);
  lines.push(`Маршрут: ${escapeHtml(group.route_from)} → ${escapeHtml(group.route_to)}`);
  lines.push(`Всего человек: ${group.total_people}`);
  lines.push('');
  lines.push('Участники:');

  members.forEach((m, i) => {
    lines.push(`${i + 1}. ${escapeHtml(m.name)} (${escapeHtml(m.contact)}) — ${m.people_count} чел., заявка подана ${escapeHtml(m.created_at)}`);
    if (m.comment) {
      lines.push(`   Комментарий: ${escapeHtml(m.comment)}`);
    }
  });

  lines.push('');
  lines.push(`Группа #${group.id} · открыть в админ-панели для подтверждения и назначения цены.`);

  return lines.join('\n');
}

module.exports = { sendTelegramMessage, buildMatchNotification, isConfigured };
