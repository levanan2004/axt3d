// All customer-facing chatbot copy lives in docs/content/chatbot_strings.json (Nhất's file).
// This module only fills tokens: {TEN_SHOP}, contact numbers, and limits from config.chatbot.
import strings from '../../docs/content/chatbot_strings.json';
import { shopConfig } from './config';

const cfg = shopConfig.chatbot;
const zalo = cfg.contact.zalo || shopConfig.shop.supportPhone || '';
const phone = cfg.contact.phone || shopConfig.shop.supportPhone || '';
function fill(text: string) {
  return text
    .replace(/\{TEN_SHOP\}/g, shopConfig.shop.name)
    .replace(/\{SO_ZALO\}/g, zalo || '{SO_ZALO}')
    .replace(/\{SO_DIEN_THOAI\}/g, phone || '{SO_DIEN_THOAI}')
    .replace(/\b20 câu/g, `${cfg.perVisitorPerDay} câu`)
    .replace(/\b500 ký tự/g, `${cfg.maxInputChars} ký tự`);
}
export type ChatCopyKey = keyof typeof strings;
export const chatCopy = Object.fromEntries(Object.entries(strings).map(([k, v]) => [k, fill(v)])) as Record<ChatCopyKey, string>;
export const contactReady = Boolean(zalo && phone);

/** "(còn {giay} giây)"; from one minute up the number is shown as m:ss. */
export function retryCountdown(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return chatCopy.rate_limit_countdown.replace('{giay}', String(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = String(s % 60).padStart(2, '0');
  const t = h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
  return chatCopy.rate_limit_countdown.replace(/\{giay\}\s*giây/, t).replace('{giay}', t);
}
