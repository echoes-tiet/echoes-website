import { loadHtml, writeContentFile, rewriteImagesIn, slugify } from './lib.mjs';

const files = Array.from({ length: 20 }, (_, i) => `blogpage${i + 1}.html`);

let count = 0;
for (const file of files) {
  const $ = loadHtml(file);
  const hero = $('#hero-no-slider').first();
  const h2 = hero.find('h2').first();

  // Title: text of h2 excluding any nested elements (some pages nest <h3> inside <h2>).
  const h2Clone = h2.clone();
  h2Clone.find('h3, span, br').remove();
  const title = h2Clone.text().trim();

  // Author: h3 either nested in h2 or a sibling of h2.
  let authorRaw = h2.find('h3').first().text().trim();
  if (!authorRaw) authorRaw = hero.find('h3').first().text().trim();
  const author = authorRaw.replace(/^(written\s+by|by)\s*/i, '').trim() || undefined;

  const spans = hero.find('span').toArray().map((el) => $(el).text().trim()).filter(Boolean);
  const publishedLabel = spans.find((s) => /released on/i.test(s));
  const authorRole = spans.find((s) => s !== publishedLabel);

  const contentSection = $('#blog-content').first();
  const body = rewriteImagesIn($, contentSection, 'blog');

  if (!title) {
    console.warn(`[skip] ${file}: no title found`);
    continue;
  }

  const slug = slugify(title) || slugify(file.replace('.html', ''));
  writeContentFile('blog', slug, { title, author, authorRole, publishedLabel }, body);
  count++;
}

console.log(`Migrated ${count} blog posts.`);
