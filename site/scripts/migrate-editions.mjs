import { loadHtml, writeContentFile, copyAsset, slugify } from './lib.mjs';

// Index page (editions.html) gives us cover image, blurb, and canonical title per edition.
const $index = loadHtml('editions.html');
const cards = $index('.card').toArray();

let count = 0;
for (const card of cards) {
  const $card = $index(card);
  const href = $card.find('.card-title a').attr('href');
  if (!href || !/^editions?\d+\.html$/.test(href)) continue;

  const titleText = $card.find('.card-title a').text().trim(); // e.g. "Edition 8"
  const numberMatch = titleText.match(/(\d+)/);
  const number = numberMatch ? Number(numberMatch[1]) : count + 1;
  const coverSrc = $card.find('.card-img img').attr('src');
  const cover = copyAsset(coverSrc, 'editions');
  const blurb = $card.find('.card-text').text().trim().replace(/\s+/g, ' ');

  // Detail page gives us the subtitle and the fliphtml5 embed URL.
  const $detail = loadHtml(href);
  const subtitle = $detail('#hero-no-slider h3').first().text().trim() || undefined;
  const embedUrl = $detail('#main iframe, main iframe').first().attr('src');

  const slug = `edition-${number}`;
  writeContentFile(
    'editions',
    slug,
    { number, title: titleText, subtitle, cover, embedUrl, blurb },
    `<p>${blurb}</p>`
  );
  count++;
}

console.log(`Migrated ${count} editions.`);
