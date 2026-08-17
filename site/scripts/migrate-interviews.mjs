import { loadHtml, writeContentFile, rewriteImagesIn, copyAsset, slugify } from './lib.mjs';

const files = [
  ...[1, 2, 3, 4, 5, 6, 13, 14, 15, 16, 17].map((n) => `int${n}.html`),
  'divyaprakash.html',
  'jeeya.html',
  'gagandeep.html',
  'paras_madan.html',
  'ritwikmehta.html',
  'shivam goyal.html',
];

let count = 0;
for (const file of files) {
  const $ = loadHtml(file);
  const title = $('#hero-no-slider h2').first().text().trim().replace(/\s+/g, ' ');
  if (!title) {
    console.warn(`[skip] ${file}: no title`);
    continue;
  }

  const row = $('section.about .row').first();
  const photoCol = row.find('.col-lg-6').first();
  const photoSrc = photoCol.find('img').first().attr('src');
  const photo = copyAsset(photoSrc, 'interviews');

  const rowClone = row.clone();
  rowClone.find('.col-lg-6').first().remove();
  const body = rewriteImagesIn($, rowClone, 'interviews')
    .replace(/<div class="">\s*<\/div>/g, '');

  const slug = slugify(title.split('|')[0]) || slugify(file.replace(/\.html$/, ''));
  writeContentFile('interviews', slug, { title, photo }, body);
  count++;
}

console.log(`Migrated ${count} interviews.`);
