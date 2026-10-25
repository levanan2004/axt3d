import { shopConfig } from './config';
import siteInfo from '../../config/site-info.json';
import { money } from './money';
import { dottedExtensionPhrase, extensionPhrase, quoteLimits } from './quote';
import { seo } from './seo';

const pageFiles = import.meta.glob('../../docs/content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type CopyDoc = { id: string; title: string; description: string; body: string };

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (!match) return { meta, body: raw.trim() };
  for (const line of match[1].split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index < 1 || line.trimStart().startsWith('#')) continue;
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: match[2].trim() };
}

function docs(): CopyDoc[] {
  return Object.entries(pageFiles).flatMap(([file, raw]) => {
    if (file.endsWith('/README.md')) return [];
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.id && !meta.title && !body) return [];
    const id = meta.id || file.split('/').pop()!.replace(/\.md$/, '');
    return [{ id, title: meta.title || '', description: meta.description || '', body }];
  });
}

export function pageCopy(id: string) {
  return docs().find(doc => doc.id === id) || null;
}

export function pageMeta(id: string, fallbackTitle: string, fallbackDescription: string, path: string, base: string, image?: string) {
  const fromRoute = routeSeo(path);
  const doc = pageCopy(id);
  const title = fromRoute?.title || (doc?.title ? renderTokens(doc.title) : fallbackTitle);
  const description = fromRoute?.description || (doc?.description ? renderTokens(doc.description) : applyFileTypes(fallbackDescription));
  return seo(title, description, path, base, image, Boolean(fromRoute));
}

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) return (value as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

function formatConfigValue(path: string, value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && /fee|price|amount|subtotal|minOrder|PerGram|PerHour/i.test(path)) return money(value);
  if (typeof value === 'number' && path.endsWith('rate') && value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
  if (value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && path.endsWith('allowedExt')) return extensionPhrase();
  return `{config.${path}}`;
}

/** Upload hints always name the extensions and limits from config, even when the copy file says STL/3MF. */
export function applyFileTypes(input: string) {
  const limits = quoteLimits();
  return input
    .replace(/\.stl hoặc \.3mf/gi, dottedExtensionPhrase())
    .replace(/STL\s*\/\s*3MF/gi, extensionPhrase())
    .replace(/STL hoặc 3MF/gi, extensionPhrase())
    .replace(/\{config dung lượng\}/g, String(limits.maxFileMB))
    .replace(/\{maxFiles\}/g, String(limits.maxFiles))
    .replace(/\{maxFileMB\}/g, String(limits.maxFileMB));
}

/** Replace {config.*} from shop-config. Leave {TEN_SHOP}-style tokens visible unless site-info names them. */
export function renderTokens(input: string): string {
  const withMoney = input.replace(/\{config\.([A-Za-z0-9_.]+)\}/g, (full, path: string) => {
    const value = readPath(shopConfig, path);
    return value === undefined ? full : formatConfigValue(path, value);
  });
  const placeholders = siteInfo.placeholders as Record<string, string>;
  const named = withMoney.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (full, key: string) => {
    if (key === 'TEN_SHOP') return shopConfig.shop.name;
    if (!Object.prototype.hasOwnProperty.call(placeholders, key)) return full;
    return placeholders[key] || full;
  });
  return applyFileTypes(named);
}

const legalDocIds: Record<string, string> = {
  'dieu-khoan': 'dieu_khoan',
  'chinh-sach-bao-mat': 'bao_mat',
  'doi-tra-hoan-tien': 'doi_tra_hoan_tien',
  'van-chuyen': 'van_chuyen',
};

export function legalCopy(routeId: string) {
  return pageCopy(legalDocIds[routeId] || routeId);
}

export function routeSeo(path: string) {
  const raw = pageFiles['../../docs/content/seo.md'];
  if (!raw) return null;
  const { body } = parseFrontmatter(raw);
  const blocks = body.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const route = block.match(/^`([^`]+)`/)?.[1];
    if (route !== path) continue;
    const title = block.match(/^- Title:\s*`([^`]+)`/m)?.[1];
    const description = block.match(/^- Meta:\s*`([^`]+)`/m)?.[1];
    if (!title || !description) return null;
    return { title: renderTokens(title), description: renderTokens(description) };
  }
  const row = body.split('\n').find(line => line.startsWith(`| \`${path}\``));
  if (!row) return null;
  const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
  const title = cells[1]?.replace(/^`|`$/g, '');
  const description = cells[2]?.replace(/^`|`$/g, '');
  if (!title || !description) return null;
  return { title: renderTokens(title), description: renderTokens(description) };
}

export function label(key: string, fallback: string) {
  const doc = pageCopy('labels');
  if (!doc) return fallback;
  const line = doc.body.split(/\r?\n/).find(item => item.startsWith(`${key}:`));
  return line ? renderTokens(line.slice(key.length + 1).trim()) : fallback;
}

export function productDescription(slug: string, fallback: string) {
  const doc = pageCopy('mo-ta-san-pham');
  if (!doc) return fallback;
  const sections = doc.body.split(/^##\s+/m).slice(1);
  const found = sections.find(section => section.startsWith(slug + '\n') || section.startsWith(slug + '\r\n'));
  if (!found) return fallback;
  return renderTokens(found.split(/\r?\n/).slice(1).join('\n').trim()) || fallback;
}

export function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

export function renderMarkdown(source: string) {
  const text = renderTokens(source).replace(/\r\n/g, '\n');
  const blocks = text.split(/\n{2,}/);
  return blocks.map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^-\s+/.test(line))) {
      return `<ul>${lines.map(line => `<li>${inline(line.replace(/^-\s+/, ''))}</li>`).join('')}</ul>`;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0] || '');
    if (heading && lines.length === 1) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    return `<p>${lines.map(inline).join('<br/>')}</p>`;
  }).join('');
}

function inline(value: string) {
  return htmlEscape(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
