import { loadHtml, writeContentFile, copyAsset, slugify } from './lib.mjs';

const $index = loadHtml('newsletter.html');
const cards = $index('.card').toArray();

let count = 0;
const seen = new Set();
for (const card of cards) {
  const $card = $index(card);
  const coverSrc = $card.find('.card-img img').attr('src');
  const cover = copyAsset(coverSrc, 'newsletters');
  const blurb = $card.find('.card-text').text().trim().replace(/\s+/g, ' ');

  // A couple of cards have a title link pointing at a different file than the
  // "Read Now" link (a pre-existing bug in newsletter.html). Rather than guess
  // which is right, emit an entry for every distinct href this card references,
  // using each target page's own <h2> as the canonical title.
  const hrefs = new Set();
  $card.find('a[href]').each((_, a) => {
    const h = $index(a).attr('href');
    if (h && /^newsletter[\w]*\.html$/i.test(h)) hrefs.add(h);
  });

  for (const href of hrefs) {
    if (seen.has(href)) continue;
    seen.add(href);

    const $detail = loadHtml(href);
    const detailTitle = $detail('#hero-no-slider h2').first().text().trim();
    const title = detailTitle || $card.find('.card-title a').text().trim().replace(/\s+/g, ' ');
    const embedUrl = $detail('#main iframe, main iframe').first().attr('src');

    const slug = slugify(href.replace(/\.html$/i, ''));
    writeContentFile('newsletters', slug, { title, cover, embedUrl, blurb }, `<p>${blurb}</p>`);
    count++;
  }
}

console.log(`Migrated ${count} newsletters.`);
