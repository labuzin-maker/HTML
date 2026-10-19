// Автоперевод сообщений в чате группы (zh ↔ ru) через бесплатный API
// MyMemory (https://mymemory.translated.net) — без регистрации и ключа,
// анонимный лимит ~5000 символов/день. Если нужно больше — можно задать
// TRANSLATE_EMAIL в .env (повышает лимит до 50000 симв/день, тоже бесплатно,
// без создания отдельного аккаунта — просто параметр в запросе).
//
// Направление перевода определяем грубой эвристикой: есть иероглифы — считаем
// текст китайским и переводим на русский, иначе считаем русским/другим и
// переводим на китайский. Для пары "турист (обычно пишет по-китайски) +
// админ (пишет по-русски)" этого достаточно.

const config = require('./config');

const CJK_RE = /[一-鿿]/;

/**
 * Перевести text на "другой" язык пары zh/ru. При любой ошибке (сеть,
 * лимит API, пустой ответ) возвращает null — сообщение в чате всё равно
 * сохраняется, просто без перевода, это не критичная функция.
 */
async function autoTranslate(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const langpair = CJK_RE.test(trimmed) ? 'zh|ru' : 'ru|zh';
  const params = new URLSearchParams({ q: trimmed, langpair });
  if (config.TRANSLATE_EMAIL) params.set('de', config.TRANSLATE_EMAIL);

  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || typeof translated !== 'string') return null;
    // MyMemory при ошибке/лимите иногда возвращает текст ошибки вместо
    // перевода прямо в translatedText — простая защита от явного мусора
    if (/MYMEMORY WARNING|QUOTA/i.test(translated)) return null;
    return translated;
  } catch (err) {
    return null;
  }
}

module.exports = { autoTranslate };
