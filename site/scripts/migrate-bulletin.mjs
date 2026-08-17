import { loadHtml, writeContentFile, rewriteImagesIn, copyAsset, slugify } from './lib.mjs';

const $ = loadHtml('bulletin.html');
const rows = $('section.features .row').toArray();

let order = 0;
let count = 0;
const usedSlugs = new Set();

for (const row of rows) {
  const $row = $(row);
  const h2 = $row.find('h2').filter((_, el) => $(el).find('b').length > 0).first();
  if (h2.length === 0) continue; // not an article-start row (shouldn't happen given the source structure)

  const title = h2.find('b').first().text().trim().replace(/\s+/g, ' ');
  if (!title) continue;

  const contentCol = h2.closest('[class*="col-"]');
  const bylineP = contentCol.find('p.fst-italic').first();
  const author = bylineP.text().trim().replace(/^-\s*by\s*/i, '').trim() || undefined;

  const imgCol = $row.find('[class*="col-"]').not(contentCol).first();
  const coverSrc = imgCol.find('img').first().attr('src');
  const cover = copyAsset(coverSrc, 'bulletin');

  const bodyClone = contentCol.clone();
  bodyClone.find('h2').first().remove();
  bodyClone.find('p.fst-italic').first().remove();
  const body = rewriteImagesIn($, bodyClone, 'bulletin');

  order++;
  let slug = slugify(title) || `article-${order}`;
  if (usedSlugs.has(slug)) slug = `${slug}-${order}`;
  usedSlugs.add(slug);

  writeContentFile('bulletin', slug, { title, author, cover, order }, body);
  count++;
}

console.log(`Migrated ${count} bulletin articles.`);
