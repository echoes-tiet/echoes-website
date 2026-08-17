import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SITE_ROOT = join(__dirname, '..');
export const REPO_ROOT = join(SITE_ROOT, '..');

export function loadHtml(relPath) {
  const full = join(REPO_ROOT, relPath);
  const html = readFileSync(full, 'utf-8');
  return cheerio.load(html, { xml: false });
}

export function slugify(str) {
  return String(str)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Resolve a src attribute from old pages (fixes backslashes, url-encodes spaces, strips leading assets/ variants) to an absolute repo-root path. */
function resolveOldAssetPath(src) {
  if (!src) return null;
  let s = src.trim().replace(/\\/g, '/');
  s = decodeURIComponent(s);
  // A few old pages hardcode the production domain for what is actually a local asset.
  s = s.replace(/^https?:\/\/(www\.)?echoes-tiet\.com\//i, '');
  if (/^https?:\/\//i.test(s)) return null; // genuinely external, leave as-is elsewhere
  s = s.replace(/^\.?\//, '');
  return join(REPO_ROOT, s);
}

const copiedAssets = new Map(); // absSrcPath -> public path

/** Copy an old image (given its src attribute value from the original HTML) into site/public/images/<subdir>/, slugifying the filename. Returns the new public path ("/images/...") or null if not found/external. */
export function copyAsset(src, subdir) {
  if (!src) return null;
  let s = src.trim();
  if (/^https?:\/\//i.test(s) && !/echoes-tiet\.com/i.test(s)) return s; // keep genuinely external URLs as-is
  const abs = resolveOldAssetPath(s);
  if (!abs || !existsSync(abs)) {
    console.warn(`  [asset missing] ${src}`);
    return null;
  }
  if (copiedAssets.has(abs)) return copiedAssets.get(abs);

  const ext = extname(abs);
  const base = slugify(abs.slice(0, -ext.length || undefined).split('/').pop()) || 'image';
  let destName = `${base}${ext.toLowerCase()}`;
  const destDir = join(SITE_ROOT, 'public', 'images', subdir);
  mkdirSync(destDir, { recursive: true });
  let destPath = join(destDir, destName);
  let i = 2;
  while (existsSync(destPath) && copiedAssets.get(abs) !== `/images/${subdir}/${destName}`) {
    // avoid collisions between different source files that slugify to the same name
    const already = [...copiedAssets.values()].includes(`/images/${subdir}/${destName}`);
    if (!already) break;
    destName = `${base}-${i}${ext.toLowerCase()}`;
    destPath = join(destDir, destName);
    i++;
  }
  if (!existsSync(destPath)) copyFileSync(abs, destPath);
  const publicPath = `/images/${subdir}/${destName}`;
  copiedAssets.set(abs, publicPath);
  return publicPath;
}

function yamlScalar(value) {
  return JSON.stringify(value);
}

export function toFrontmatter(data) {
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) || typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlScalar(String(value))}`);
    }
  }
  return lines.join('\n');
}

export function writeContentFile(collection, slug, frontmatter, body) {
  const dir = join(SITE_ROOT, 'src', 'content', collection);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug}.md`);
  const content = `---\n${toFrontmatter(frontmatter)}\n---\n\n${body.trim()}\n`;
  writeFileSync(file, content, 'utf-8');
  return file;
}

/** Clean up inner HTML pulled from old pages: fix backslash asset paths, rewrite known asset src attrs via copyAsset, trim excess whitespace. */
export function rewriteImagesIn($, root, subdir) {
  $(root)
    .find('img')
    .each((_, el) => {
      const $el = $(el);
      const oldSrc = $el.attr('src');
      const newSrc = copyAsset(oldSrc, subdir);
      if (newSrc) $el.attr('src', newSrc);
      $el.removeAttr('style');
    });
  return $(root).html() ?? '';
}
